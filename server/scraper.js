const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const UserAgent = require('user-agents');
const db = require('./db');

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

// Scrape configuration
const CONFIG = {
  timeout: 45000,           // 45 second timeout
  navigationTimeout: 30000, // 30 second navigation timeout
  retryAttempts: 3,         // Retry failed scrapes
  retryDelay: 2000,         // 2 second delay between retries
  requestDelay: {           // Random delay between requests
    min: 1000,
    max: 3000
  }
};

/**
 * Parse price string to number
 * Handles various currency symbols, commas, and formats
 */
function parsePrice(priceString) {
  if (!priceString) return null;
  
  // Remove currency symbols, spaces, and common text
  const cleaned = priceString
    .replace(/[₱$€£¥]/g, '')
    .replace(/,/g, '')
    .replace(/\s/g, '')
    .replace(/USD|PHP|per\s*pill|each|from/gi, '')
    .trim();
  
  // Extract first number found (handles "from $X.XX" formats)
  const match = cleaned.match(/[\d]+\.?[\d]*/);
  if (!match) return null;
  
  const price = parseFloat(match[0]);
  return isNaN(price) ? null : price;
}

/**
 * Get timestamp string for logging
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Random delay to appear more human-like
 */
function randomDelay(min = CONFIG.requestDelay.min, max = CONFIG.requestDelay.max) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Get a random realistic user agent
 */
function getRandomUserAgent() {
  const userAgent = new UserAgent({ deviceCategory: 'desktop' });
  return userAgent.toString();
}

/**
 * Log scrape attempt to database
 */
function logScrapeAttempt(competitorId, status, price, errorMessage = null) {
  try {
    db.prepare(`
      INSERT INTO scrape_logs (competitor_id, status, price, error_message, scraped_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(competitorId, status, price, errorMessage, new Date().toISOString());
  } catch (err) {
    console.error(`[${getTimestamp()}] Failed to log scrape attempt:`, err.message);
  }
}

/**
 * Scrape a single competitor's page with retry logic
 */
async function scrapeCompetitor(browser, competitor, attempt = 1) {
  const result = {
    competitorId: competitor.id,
    competitorName: competitor.name,
    productName: competitor.internal_product,
    url: competitor.product_url,
    success: false,
    price: null,
    error: null,
    attempts: attempt,
    method: 'automated'
  };

  let page = null;
  
  try {
    console.log(`[${getTimestamp()}] Scraping ${competitor.name} (attempt ${attempt}/${CONFIG.retryAttempts})...`);
    
    page = await browser.newPage();
    
    // Set random user agent
    const userAgent = getRandomUserAgent();
    await page.setUserAgent(userAgent);
    
    // Set realistic viewport
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    });
    
    // Set extra headers to appear more legitimate
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    });
    
    // Set timeouts
    page.setDefaultTimeout(CONFIG.timeout);
    page.setDefaultNavigationTimeout(CONFIG.navigationTimeout);
    
    // Block unnecessary resources to speed up loading
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });
    
    // Navigate to the page
    console.log(`[${getTimestamp()}]   → Navigating to ${competitor.product_url}`);
    const response = await page.goto(competitor.product_url, { 
      waitUntil: 'domcontentloaded',
      timeout: CONFIG.navigationTimeout 
    });
    
    // Check response status
    if (!response || response.status() >= 400) {
      throw new Error(`HTTP ${response?.status() || 'unknown'} - Page load failed`);
    }
    
    // Wait a bit for dynamic content to load
    await randomDelay(1500, 3000);
    
    // Try to wait for the price selector
    console.log(`[${getTimestamp()}]   → Looking for selector: ${competitor.css_selector}`);
    
    try {
      await page.waitForSelector(competitor.css_selector, { timeout: 10000 });
    } catch (selectorErr) {
      // Try scrolling to trigger lazy loading
      await page.evaluate(() => window.scrollBy(0, 500));
      await randomDelay(1000, 2000);
      await page.waitForSelector(competitor.css_selector, { timeout: 5000 });
    }
    
    // Extract price text
    const priceText = await page.$eval(competitor.css_selector, el => el.textContent);
    console.log(`[${getTimestamp()}]   → Raw price text: "${priceText}"`);
    
    // Parse price
    const price = parsePrice(priceText);
    
    if (price === null) {
      throw new Error(`Could not parse price from: "${priceText}"`);
    }
    
    // Validate price is reasonable (not $0 or astronomical)
    if (price <= 0 || price > 100000) {
      throw new Error(`Invalid price value: ${price}`);
    }
    
    result.price = price;
    result.success = true;
    
    console.log(`[${getTimestamp()}] ✓ ${competitor.name}: $${price.toFixed(2)}`);
    logScrapeAttempt(competitor.id, 'success', price);
    
  } catch (error) {
    result.error = error.message;
    console.error(`[${getTimestamp()}] ✗ ${competitor.name}: ${error.message}`);
    
    // Retry logic
    if (attempt < CONFIG.retryAttempts) {
      console.log(`[${getTimestamp()}]   → Retrying in ${CONFIG.retryDelay/1000}s...`);
      await page?.close().catch(() => {});
      await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
      return scrapeCompetitor(browser, competitor, attempt + 1);
    }
    
    logScrapeAttempt(competitor.id, 'failed', null, error.message);
    
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
  
  return result;
}

/**
 * Store scrape result in database and check for alerts
 */
function storeScrapeResult(result) {
  if (!result.success || result.price === null) {
    return;
  }
  
  const insertPrice = db.prepare(`
    INSERT INTO price_history (competitor_id, product_name, price, scraped_at)
    VALUES (?, ?, ?, ?)
  `);
  
  insertPrice.run(
    result.competitorId,
    result.productName,
    result.price,
    new Date().toISOString()
  );
  
  // Check for price change alert
  checkForAlert(result);
}

/**
 * Check if price change exceeds threshold and create alert
 */
function checkForAlert(result) {
  // Get competitor's alert threshold
  const competitor = db.prepare('SELECT alert_threshold FROM competitors WHERE id = ?')
    .get(result.competitorId);
  
  if (!competitor) return;
  
  // Get previous price (before the one we just inserted)
  const previousPrice = db.prepare(`
    SELECT price FROM price_history 
    WHERE competitor_id = ? AND product_name = ?
    ORDER BY scraped_at DESC
    LIMIT 1 OFFSET 1
  `).get(result.competitorId, result.productName);
  
  if (!previousPrice) return;
  
  const percentChange = ((result.price - previousPrice.price) / previousPrice.price) * 100;
  
  // Check if change exceeds threshold (absolute value)
  if (Math.abs(percentChange) >= competitor.alert_threshold) {
    const insertAlert = db.prepare(`
      INSERT INTO alerts (competitor_id, product_name, old_price, new_price, percent_change, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    insertAlert.run(
      result.competitorId,
      result.productName,
      previousPrice.price,
      result.price,
      percentChange,
      new Date().toISOString()
    );
    
    console.log(`[${getTimestamp()}] 🔔 Alert: ${result.competitorName} ${result.productName} changed by ${percentChange.toFixed(1)}%`);
  }
}

/**
 * Scrape all configured competitors
 */
async function scrapeAllCompetitors() {
  const results = {
    success: 0,
    failed: 0,
    total: 0,
    details: [],
    startTime: new Date().toISOString(),
    endTime: null
  };
  
  let browser = null;
  
  try {
    console.log(`[${getTimestamp()}] ═══════════════════════════════════════════════`);
    console.log(`[${getTimestamp()}] Starting automated scrape with stealth mode...`);
    console.log(`[${getTimestamp()}] ═══════════════════════════════════════════════`);
    
    // Get all competitors
    const competitors = db.prepare('SELECT * FROM competitors').all();
    results.total = competitors.length;
    
    if (competitors.length === 0) {
      console.log(`[${getTimestamp()}] No competitors configured`);
      return results;
    }
    
    // Launch browser with stealth settings
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--window-size=1920,1080'
      ],
      ignoreDefaultArgs: ['--enable-automation'],
    });
    
    // Scrape each competitor with random delays between requests
    for (let i = 0; i < competitors.length; i++) {
      const competitor = competitors[i];
      
      // Add random delay between scrapes (except first one)
      if (i > 0) {
        await randomDelay(2000, 5000);
      }
      
      const result = await scrapeCompetitor(browser, competitor);
      results.details.push(result);
      
      if (result.success) {
        results.success++;
        storeScrapeResult(result);
      } else {
        results.failed++;
      }
    }
    
    results.endTime = new Date().toISOString();
    console.log(`[${getTimestamp()}] ═══════════════════════════════════════════════`);
    console.log(`[${getTimestamp()}] Scrape complete: ${results.success}/${results.total} successful`);
    console.log(`[${getTimestamp()}] ═══════════════════════════════════════════════`);
    
  } catch (error) {
    console.error(`[${getTimestamp()}] Scrape failed: ${error.message}`);
    throw error;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
  
  return results;
}

/**
 * Mock scrape for demo/testing purposes
 */
async function mockScrapeAllCompetitors() {
  const results = {
    success: 0,
    failed: 0,
    total: 0,
    details: [],
    startTime: new Date().toISOString(),
    endTime: null
  };
  
  console.log(`[${getTimestamp()}] Running mock scrape (demo mode)...`);
  
  const competitors = db.prepare('SELECT * FROM competitors').all();
  results.total = competitors.length;
  
  for (const competitor of competitors) {
    // Simulate network delay
    await randomDelay(500, 1500);
    
    // Get latest price for this competitor
    const latestPrice = db.prepare(`
      SELECT price FROM price_history 
      WHERE competitor_id = ? 
      ORDER BY scraped_at DESC 
      LIMIT 1
    `).get(competitor.id);
    
    // Simulate occasional failures (20% chance)
    const shouldFail = Math.random() < 0.2;
    
    if (shouldFail) {
      const errors = [
        'Timeout waiting for selector',
        'Navigation timeout exceeded',
        'net::ERR_CONNECTION_REFUSED',
        'Page blocked by Cloudflare'
      ];
      const randomError = errors[Math.floor(Math.random() * errors.length)];
      
      results.details.push({
        competitorId: competitor.id,
        competitorName: competitor.name,
        productName: competitor.internal_product,
        url: competitor.product_url,
        success: false,
        price: null,
        error: randomError,
        method: 'mock'
      });
      results.failed++;
      logScrapeAttempt(competitor.id, 'failed', null, randomError);
      console.log(`[${getTimestamp()}] ✗ ${competitor.name}: ${randomError} (mock)`);
      continue;
    }
    
    // Simulate price change (-5% to +5%)
    let newPrice;
    if (latestPrice) {
      const change = (Math.random() - 0.5) * 0.1;
      newPrice = Math.round(latestPrice.price * (1 + change) * 100) / 100;
    } else {
      // Default prices
      const defaultPrices = {
        'ED Medication': 25.99,
        'Hair Loss Treatment': 45.00,
        'Skin Care': 32.50
      };
      newPrice = defaultPrices[competitor.internal_product] || 29.99;
    }
    
    const result = {
      competitorId: competitor.id,
      competitorName: competitor.name,
      productName: competitor.internal_product,
      url: competitor.product_url,
      success: true,
      price: newPrice,
      error: null,
      method: 'mock'
    };
    
    results.details.push(result);
    results.success++;
    storeScrapeResult(result);
    logScrapeAttempt(competitor.id, 'success', newPrice);
    
    console.log(`[${getTimestamp()}] ✓ ${competitor.name}: $${newPrice.toFixed(2)} (mock)`);
  }
  
  results.endTime = new Date().toISOString();
  console.log(`[${getTimestamp()}] Mock scrape complete: ${results.success}/${results.total}`);
  
  return results;
}

/**
 * Add manual price entry
 */
function addManualPrice(competitorId, price, productName = null) {
  const competitor = db.prepare('SELECT * FROM competitors WHERE id = ?').get(competitorId);
  if (!competitor) {
    throw new Error('Competitor not found');
  }
  
  const product = productName || competitor.internal_product;
  
  db.prepare(`
    INSERT INTO price_history (competitor_id, product_name, price, scraped_at)
    VALUES (?, ?, ?, ?)
  `).run(competitorId, product, price, new Date().toISOString());
  
  logScrapeAttempt(competitorId, 'manual', price);
  
  // Check for alert
  checkForAlert({
    competitorId,
    competitorName: competitor.name,
    productName: product,
    price,
    success: true
  });
  
  console.log(`[${getTimestamp()}] 📝 Manual price entry: ${competitor.name} - $${price}`);
  
  return { success: true, competitorId, price, productName: product };
}

/**
 * Get scrape logs for a competitor
 */
function getScrapeLogs(competitorId = null, limit = 50) {
  if (competitorId) {
    return db.prepare(`
      SELECT sl.*, c.name as competitor_name 
      FROM scrape_logs sl
      JOIN competitors c ON sl.competitor_id = c.id
      WHERE sl.competitor_id = ?
      ORDER BY sl.scraped_at DESC
      LIMIT ?
    `).all(competitorId, limit);
  }
  
  return db.prepare(`
    SELECT sl.*, c.name as competitor_name 
    FROM scrape_logs sl
    JOIN competitors c ON sl.competitor_id = c.id
    ORDER BY sl.scraped_at DESC
    LIMIT ?
  `).all(limit);
}

module.exports = {
  scrapeAllCompetitors,
  mockScrapeAllCompetitors,
  addManualPrice,
  getScrapeLogs,
  parsePrice,
  CONFIG
};
