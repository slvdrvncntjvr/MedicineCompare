const express = require('express');
const router = express.Router();
const db = require('../db');
const { scrapeAllCompetitors, mockScrapeAllCompetitors, addManualPrice, getScrapeLogs } = require('../scraper');

// GET /api/dashboard - Get all dashboard data
router.get('/', (req, res) => {
  try {
    // Get our prices
    const ourPrices = db.prepare('SELECT * FROM our_prices').all();
    const ourPricesMap = {};
    ourPrices.forEach(p => { ourPricesMap[p.product_name] = p.price; });

    // Get competitors with latest prices and status
    const competitors = db.prepare(`
      SELECT 
        c.*,
        (SELECT price FROM price_history WHERE competitor_id = c.id ORDER BY scraped_at DESC LIMIT 1) as latest_price,
        (SELECT scraped_at FROM price_history WHERE competitor_id = c.id ORDER BY scraped_at DESC LIMIT 1) as last_scraped,
        (SELECT status FROM scrape_logs WHERE competitor_id = c.id ORDER BY scraped_at DESC LIMIT 1) as last_status,
        (SELECT COUNT(*) FROM scrape_logs WHERE competitor_id = c.id AND status = 'failed' AND scraped_at > datetime('now', '-24 hours')) as recent_failures
      FROM competitors c
      WHERE c.is_active = 1
    `).all();

    // Build comparison data by product
    const products = ['ED Medication', 'Hair Loss Treatment', 'Skin Care'];
    const comparison = products.map(product => {
      const ourPrice = ourPricesMap[product] || 0;
      const productCompetitors = competitors
        .filter(c => c.internal_product === product)
        .map(c => ({
          id: c.id,
          name: c.name,
          price: c.latest_price,
          lastScraped: c.last_scraped,
          status: c.last_status,
          recentFailures: c.recent_failures
        }));

      // Calculate average competitor price
      const competitorPrices = productCompetitors.filter(c => c.price).map(c => c.price);
      const avgCompetitorPrice = competitorPrices.length > 0 
        ? competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length 
        : 0;

      // Find lowest competitor price
      const lowestCompetitorPrice = competitorPrices.length > 0 
        ? Math.min(...competitorPrices) 
        : 0;

      // Calculate difference from lowest
      const difference = ourPrice > 0 && lowestCompetitorPrice > 0
        ? ((ourPrice - lowestCompetitorPrice) / lowestCompetitorPrice) * 100
        : 0;

      // Determine status
      let status;
      if (difference <= -5) {
        status = 'competitive';
      } else if (difference <= 10) {
        status = 'neutral';
      } else if (difference <= 20) {
        status = 'higher';
      } else {
        status = 'much_higher';
      }

      return {
        product,
        ourPrice,
        competitors: productCompetitors,
        avgCompetitorPrice,
        lowestCompetitorPrice,
        difference,
        status
      };
    });

    // Calculate market position
    const allOurPrices = comparison.filter(c => c.ourPrice > 0);
    const allAvgPrices = comparison.filter(c => c.avgCompetitorPrice > 0);
    
    let marketPosition = {
      percentage: 0,
      position: 'equal',
      description: 'No data available'
    };

    if (allOurPrices.length > 0 && allAvgPrices.length > 0) {
      const totalOur = allOurPrices.reduce((sum, c) => sum + c.ourPrice, 0);
      const totalAvg = allAvgPrices.reduce((sum, c) => sum + c.avgCompetitorPrice, 0);
      const avgDiff = ((totalOur - totalAvg) / totalAvg) * 100;
      
      marketPosition = {
        percentage: Math.abs(avgDiff).toFixed(1),
        position: avgDiff > 0 ? 'above' : avgDiff < 0 ? 'below' : 'equal',
        description: avgDiff > 0 
          ? `${Math.abs(avgDiff).toFixed(1)}% above market average`
          : avgDiff < 0 
            ? `${Math.abs(avgDiff).toFixed(1)}% below market average`
            : 'At market average'
      };
    }

    // Get recent alerts
    const alerts = db.prepare(`
      SELECT 
        a.*,
        c.name as competitor_name
      FROM alerts a
      JOIN competitors c ON a.competitor_id = c.id
      WHERE a.dismissed = 0
      ORDER BY a.created_at DESC
      LIMIT 10
    `).all();

    // Generate suggestions
    const suggestions = generateSuggestions(comparison, alerts, ourPricesMap);

    // Get scrape statistics
    const scrapeStats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'manual' THEN 1 ELSE 0 END) as manual
      FROM scrape_logs
      WHERE scraped_at > datetime('now', '-24 hours')
    `).get();

    res.json({
      comparison,
      marketPosition,
      alerts: alerts.map(a => ({
        ...a,
        timeAgo: getTimeAgo(a.created_at)
      })),
      suggestions,
      scrapeStats: {
        ...scrapeStats,
        successRate: scrapeStats.total > 0 
          ? ((scrapeStats.successful / scrapeStats.total) * 100).toFixed(1) 
          : 0
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// GET /api/price-history/:competitorId - Get price history for chart
router.get('/price-history/:competitorId', (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const history = db.prepare(`
      SELECT * FROM price_history 
      WHERE competitor_id = ? AND scraped_at >= ?
      ORDER BY scraped_at ASC
    `).all(req.params.competitorId, thirtyDaysAgo.toISOString());

    res.json(history);
  } catch (error) {
    console.error('Error fetching price history:', error);
    res.status(500).json({ error: 'Failed to fetch price history' });
  }
});

// GET /api/price-history - Get all price history for chart
router.get('/price-history', (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const history = db.prepare(`
      SELECT 
        ph.*,
        c.name as competitor_name
      FROM price_history ph
      JOIN competitors c ON ph.competitor_id = c.id
      WHERE ph.scraped_at >= ?
      ORDER BY ph.scraped_at ASC
    `).all(thirtyDaysAgo.toISOString());

    // Get our prices
    const ourPrices = db.prepare('SELECT * FROM our_prices').all();

    res.json({ history, ourPrices });
  } catch (error) {
    console.error('Error fetching price history:', error);
    res.status(500).json({ error: 'Failed to fetch price history' });
  }
});

// POST /api/scrape - Trigger manual scrape
router.post('/scrape', async (req, res) => {
  const { mode = 'real' } = req.body;
  
  try {
    let results;
    
    if (mode === 'mock') {
      results = await mockScrapeAllCompetitors();
    } else {
      // Try real scraping first
      try {
        results = await scrapeAllCompetitors();
      } catch (realScrapeError) {
        console.error('Real scrape failed, falling back to mock:', realScrapeError.message);
        results = await mockScrapeAllCompetitors();
        results.fallbackUsed = true;
      }
    }
    
    res.json(results);
  } catch (error) {
    console.error('Error during scrape:', error);
    res.status(500).json({ error: 'Scrape failed: ' + error.message });
  }
});

// POST /api/scrape/:competitorId - Scrape single competitor
router.post('/scrape/:competitorId', async (req, res) => {
  try {
    const competitor = db.prepare('SELECT * FROM competitors WHERE id = ?').get(req.params.competitorId);
    
    if (!competitor) {
      return res.status(404).json({ error: 'Competitor not found' });
    }
    
    // For now, use mock scrape for single competitor
    const results = await mockScrapeAllCompetitors();
    const result = results.details.find(d => d.competitorId === parseInt(req.params.competitorId));
    
    res.json(result || { error: 'Scrape failed' });
  } catch (error) {
    console.error('Error during single scrape:', error);
    res.status(500).json({ error: 'Scrape failed: ' + error.message });
  }
});

// POST /api/manual-price - Add manual price entry
router.post('/manual-price', (req, res) => {
  try {
    const { competitorId, price, productName } = req.body;
    
    if (!competitorId || price === undefined || price === null) {
      return res.status(400).json({ error: 'competitorId and price are required' });
    }
    
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({ error: 'Invalid price value' });
    }
    
    const result = addManualPrice(competitorId, parsedPrice, productName);
    res.json(result);
  } catch (error) {
    console.error('Error adding manual price:', error);
    res.status(500).json({ error: error.message || 'Failed to add manual price' });
  }
});

// GET /api/scrape-logs - Get scrape logs
router.get('/scrape-logs', (req, res) => {
  try {
    const { competitorId, limit = 50 } = req.query;
    const logs = getScrapeLogs(competitorId ? parseInt(competitorId) : null, parseInt(limit));
    res.json(logs);
  } catch (error) {
    console.error('Error fetching scrape logs:', error);
    res.status(500).json({ error: 'Failed to fetch scrape logs' });
  }
});

// PUT /api/alerts/:id/dismiss - Dismiss an alert
router.put('/alerts/:id/dismiss', (req, res) => {
  try {
    const result = db.prepare('UPDATE alerts SET dismissed = 1 WHERE id = ?').run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    res.json({ message: 'Alert dismissed' });
  } catch (error) {
    console.error('Error dismissing alert:', error);
    res.status(500).json({ error: 'Failed to dismiss alert' });
  }
});

// GET /api/our-prices - Get our prices
router.get('/our-prices', (req, res) => {
  try {
    const prices = db.prepare('SELECT * FROM our_prices').all();
    res.json(prices);
  } catch (error) {
    console.error('Error fetching our prices:', error);
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

// PUT /api/our-prices/:product - Update our price
router.put('/our-prices/:product', (req, res) => {
  try {
    const { price } = req.body;
    const product = decodeURIComponent(req.params.product);
    
    db.prepare(`
      INSERT OR REPLACE INTO our_prices (product_name, price, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `).run(product, price);
    
    res.json({ message: 'Price updated' });
  } catch (error) {
    console.error('Error updating price:', error);
    res.status(500).json({ error: 'Failed to update price' });
  }
});

// Helper function to generate suggestions
function generateSuggestions(comparison, alerts, ourPricesMap) {
  const suggestions = [];

  // Check each product comparison
  comparison.forEach(item => {
    if (!item.ourPrice || !item.lowestCompetitorPrice) return;

    const lowestCompetitor = item.competitors.find(c => c.price === item.lowestCompetitorPrice);
    
    // If competitor is cheaper by more than 10%
    if (item.difference > 10 && lowestCompetitor) {
      suggestions.push({
        id: `match-${item.product}`,
        type: 'price_match',
        priority: 'high',
        title: `Consider matching ${lowestCompetitor.name}'s price`,
        description: `${lowestCompetitor.name} is offering ${item.product} at $${item.lowestCompetitorPrice.toFixed(2)}, which is ${Math.abs(item.difference).toFixed(1)}% lower than your price of $${item.ourPrice.toFixed(2)}.`,
        action: `Match price of $${item.lowestCompetitorPrice.toFixed(2)}`
      });
    }

    // If we're the cheapest
    if (item.difference < -5) {
      suggestions.push({
        id: `maintain-${item.product}`,
        type: 'maintain',
        priority: 'low',
        title: 'Maintain pricing advantage',
        description: `Your ${item.product} price of $${item.ourPrice.toFixed(2)} is ${Math.abs(item.difference).toFixed(1)}% below the lowest competitor.`,
        action: 'Keep current pricing'
      });
    }

    // Check for scraping issues
    const failingCompetitors = item.competitors.filter(c => c.recentFailures > 2);
    if (failingCompetitors.length > 0) {
      suggestions.push({
        id: `scrape-issue-${item.product}`,
        type: 'investigate',
        priority: 'medium',
        title: 'Scraping issues detected',
        description: `${failingCompetitors.map(c => c.name).join(', ')} have had multiple failed scrapes recently. Consider updating selectors or adding manual prices.`,
        action: 'Review competitor configuration'
      });
    }
  });

  // Check recent alerts for big drops
  alerts.filter(a => a.percent_change < -10).forEach(alert => {
    suggestions.push({
      id: `investigate-${alert.id}`,
      type: 'investigate',
      priority: 'medium',
      title: `Investigate ${alert.competitor_name}'s price cut`,
      description: `${alert.competitor_name} dropped ${alert.product_name} by ${Math.abs(alert.percent_change).toFixed(1)}% from $${alert.old_price.toFixed(2)} to $${alert.new_price.toFixed(2)}.`,
      action: 'Review competitor strategy'
    });
  });

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return suggestions;
}

// Helper function to get relative time
function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString();
}

module.exports = router;
