const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'pricewatch.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS competitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    product_url TEXT NOT NULL,
    css_selector TEXT NOT NULL,
    internal_product TEXT NOT NULL,
    alert_threshold REAL DEFAULT 10.0,
    is_active INTEGER DEFAULT 1,
    last_success_at TIMESTAMP,
    last_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competitor_id INTEGER,
    product_name TEXT,
    price REAL,
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (competitor_id) REFERENCES competitors(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competitor_id INTEGER,
    product_name TEXT,
    old_price REAL,
    new_price REAL,
    percent_change REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dismissed INTEGER DEFAULT 0,
    FOREIGN KEY (competitor_id) REFERENCES competitors(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS our_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name TEXT NOT NULL UNIQUE,
    price REAL NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS scrape_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competitor_id INTEGER,
    status TEXT NOT NULL,
    price REAL,
    error_message TEXT,
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (competitor_id) REFERENCES competitors(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_price_history_competitor ON price_history(competitor_id);
  CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history(scraped_at);
  CREATE INDEX IF NOT EXISTS idx_alerts_competitor ON alerts(competitor_id);
  CREATE INDEX IF NOT EXISTS idx_scrape_logs_competitor ON scrape_logs(competitor_id);
`);

// Seed data function
function seedDatabase() {
  const competitorCount = db.prepare('SELECT COUNT(*) as count FROM competitors').get();
  
  if (competitorCount.count === 0) {
    console.log('[DB] Seeding database with REAL pharmacy competitors...');
    
    const insertCompetitor = db.prepare(`
      INSERT INTO competitors (name, product_url, css_selector, internal_product, alert_threshold)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    // ============================================
    // REAL PHARMACY SITES - More likely to work
    // ============================================
    
    // 1. Cost Plus Drugs (Mark Cuban's pharmacy) - Simple HTML structure, likely to work
    const costPlus = insertCompetitor.run(
      'Cost Plus Drugs',
      'https://costplusdrugs.com/medications/sildenafil-20mg-tablet/',
      '.price',
      'ED Medication',
      10.0
    );
    
    // 2. Blink Health - Public pricing, decent HTML
    const blinkHealth = insertCompetitor.run(
      'Blink Health',
      'https://www.blinkhealth.com/sildenafil',
      '[data-testid="price"]',
      'ED Medication',
      10.0
    );
    
    // 3. HealthWarehouse - Traditional pharmacy site
    const healthWarehouse = insertCompetitor.run(
      'HealthWarehouse',
      'https://www.healthwarehouse.com/sildenafil-20mg-tablets.html',
      '.price-box .price',
      'ED Medication',
      10.0
    );
    
    // 4. Honeybee Health - Simple structure
    const honeybee = insertCompetitor.run(
      'Honeybee Health',
      'https://www.honeybeehealth.com/sildenafil',
      '.product-price',
      'ED Medication',
      10.0
    );
    
    // 5. RxSaver (by RetailMeNot) - Price aggregator
    const rxSaver = insertCompetitor.run(
      'RxSaver',
      'https://www.rxsaver.com/drugs/sildenafil',
      '.drug-price-value',
      'ED Medication',
      15.0
    );
    
    // Insert sample price history for demo purposes
    const insertPriceHistory = db.prepare(`
      INSERT INTO price_history (competitor_id, product_name, price, scraped_at)
      VALUES (?, ?, ?, ?)
    `);
    
    const now = new Date();
    
    // Cost Plus Drugs - Known for low prices, stable
    const costPlusPrices = [7.50, 7.50, 7.20, 7.20, 6.90]; // Trending down slightly
    for (let i = 30; i >= 0; i -= 7) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const priceIdx = Math.min(Math.floor((30 - i) / 7), costPlusPrices.length - 1);
      insertPriceHistory.run(costPlus.lastInsertRowid, 'ED Medication', costPlusPrices[priceIdx], date.toISOString());
    }
    
    // Blink Health - Competitive pricing
    for (let i = 30; i >= 0; i -= 7) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      insertPriceHistory.run(blinkHealth.lastInsertRowid, 'ED Medication', 9.99, date.toISOString());
    }
    
    // HealthWarehouse - Mid-range
    for (let i = 30; i >= 0; i -= 7) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      insertPriceHistory.run(healthWarehouse.lastInsertRowid, 'ED Medication', 12.50, date.toISOString());
    }
    
    // Honeybee Health
    for (let i = 30; i >= 0; i -= 7) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      insertPriceHistory.run(honeybee.lastInsertRowid, 'ED Medication', 8.99, date.toISOString());
    }
    
    // RxSaver - Aggregator, varies more
    const rxSaverPrices = [15.00, 14.50, 13.99, 12.99, 11.99];
    for (let i = 30; i >= 0; i -= 7) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const priceIdx = Math.min(Math.floor((30 - i) / 7), rxSaverPrices.length - 1);
      insertPriceHistory.run(rxSaver.lastInsertRowid, 'ED Medication', rxSaverPrices[priceIdx], date.toISOString());
    }
    
    // Insert our prices (your pharmacy's prices)
    const insertOurPrice = db.prepare(`
      INSERT OR REPLACE INTO our_prices (product_name, price) VALUES (?, ?)
    `);
    insertOurPrice.run('ED Medication', 9.99);  // Your price for Sildenafil
    insertOurPrice.run('Hair Loss Treatment', 12.00);  // Finasteride
    insertOurPrice.run('Skin Care', 15.00);  // Tretinoin
    
    // Create sample alert - Cost Plus dropped their price
    const insertAlert = db.prepare(`
      INSERT INTO alerts (competitor_id, product_name, old_price, new_price, percent_change, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const alertDate = new Date();
    alertDate.setHours(alertDate.getHours() - 4);
    insertAlert.run(
      costPlus.lastInsertRowid,
      'ED Medication',
      7.20,
      6.90,
      ((6.90 - 7.20) / 7.20) * 100,
      alertDate.toISOString()
    );
    
    // Insert some scrape logs to show history
    const insertLog = db.prepare(`
      INSERT INTO scrape_logs (competitor_id, status, price, error_message, scraped_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    // Simulate mixed success/failure history
    const competitors = [
      { id: costPlus.lastInsertRowid, price: 6.90, success: true },
      { id: blinkHealth.lastInsertRowid, price: 9.99, success: true },
      { id: healthWarehouse.lastInsertRowid, price: 12.50, success: false, error: 'Selector not found' },
      { id: honeybee.lastInsertRowid, price: 8.99, success: true },
      { id: rxSaver.lastInsertRowid, price: null, success: false, error: 'Navigation timeout' },
    ];
    
    for (let i = 0; i < 3; i++) {
      const logDate = new Date();
      logDate.setHours(logDate.getHours() - i * 8);
      
      for (const comp of competitors) {
        if (comp.success) {
          insertLog.run(comp.id, 'success', comp.price, null, logDate.toISOString());
        } else {
          insertLog.run(comp.id, 'failed', null, comp.error, logDate.toISOString());
        }
      }
    }
    
    console.log('[DB] ✅ Database seeded with 5 real pharmacy competitors!');
    console.log('[DB] Competitors added:');
    console.log('[DB]   - Cost Plus Drugs (costplusdrugs.com)');
    console.log('[DB]   - Blink Health (blinkhealth.com)');
    console.log('[DB]   - HealthWarehouse (healthwarehouse.com)');
    console.log('[DB]   - Honeybee Health (honeybeehealth.com)');
    console.log('[DB]   - RxSaver (rxsaver.com)');
  }
}

// Run seed
seedDatabase();

module.exports = db;
