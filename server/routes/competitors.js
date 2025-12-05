const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/competitors - Get all competitors
router.get('/', (req, res) => {
  try {
    const { includeInactive = 'false' } = req.query;
    
    let query = `
      SELECT 
        c.*,
        (SELECT price FROM price_history WHERE competitor_id = c.id ORDER BY scraped_at DESC LIMIT 1) as latest_price,
        (SELECT scraped_at FROM price_history WHERE competitor_id = c.id ORDER BY scraped_at DESC LIMIT 1) as last_scraped,
        (SELECT status FROM scrape_logs WHERE competitor_id = c.id ORDER BY scraped_at DESC LIMIT 1) as last_scrape_status,
        (SELECT error_message FROM scrape_logs WHERE competitor_id = c.id ORDER BY scraped_at DESC LIMIT 1) as last_error,
        (SELECT COUNT(*) FROM scrape_logs WHERE competitor_id = c.id AND status = 'success') as success_count,
        (SELECT COUNT(*) FROM scrape_logs WHERE competitor_id = c.id AND status = 'failed') as fail_count
      FROM competitors c
    `;
    
    if (includeInactive !== 'true') {
      query += ' WHERE c.is_active = 1';
    }
    
    query += ' ORDER BY c.created_at DESC';
    
    const competitors = db.prepare(query).all();
    
    res.json(competitors.map(c => ({
      ...c,
      scrapeSuccessRate: (c.success_count + c.fail_count) > 0 
        ? ((c.success_count / (c.success_count + c.fail_count)) * 100).toFixed(1)
        : null
    })));
  } catch (error) {
    console.error('Error fetching competitors:', error);
    res.status(500).json({ error: 'Failed to fetch competitors' });
  }
});

// GET /api/competitors/:id - Get single competitor with history
router.get('/:id', (req, res) => {
  try {
    const competitor = db.prepare(`
      SELECT 
        c.*,
        (SELECT price FROM price_history WHERE competitor_id = c.id ORDER BY scraped_at DESC LIMIT 1) as latest_price,
        (SELECT scraped_at FROM price_history WHERE competitor_id = c.id ORDER BY scraped_at DESC LIMIT 1) as last_scraped
      FROM competitors c
      WHERE c.id = ?
    `).get(req.params.id);
    
    if (!competitor) {
      return res.status(404).json({ error: 'Competitor not found' });
    }
    
    // Get recent scrape logs
    const scrapeLogs = db.prepare(`
      SELECT * FROM scrape_logs 
      WHERE competitor_id = ?
      ORDER BY scraped_at DESC
      LIMIT 20
    `).all(req.params.id);
    
    // Get price history (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const priceHistory = db.prepare(`
      SELECT * FROM price_history 
      WHERE competitor_id = ? AND scraped_at >= ?
      ORDER BY scraped_at DESC
    `).all(req.params.id, thirtyDaysAgo.toISOString());
    
    res.json({
      ...competitor,
      scrapeLogs,
      priceHistory
    });
  } catch (error) {
    console.error('Error fetching competitor:', error);
    res.status(500).json({ error: 'Failed to fetch competitor' });
  }
});

// POST /api/competitors - Add new competitor
router.post('/', (req, res) => {
  try {
    const { name, product_url, css_selector, internal_product, alert_threshold } = req.body;
    
    // Validation
    if (!name || !product_url || !css_selector || !internal_product) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // URL validation
    try {
      new URL(product_url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    // Check for duplicate URL
    const existing = db.prepare('SELECT id FROM competitors WHERE product_url = ?').get(product_url);
    if (existing) {
      return res.status(400).json({ error: 'A competitor with this URL already exists' });
    }
    
    const threshold = parseFloat(alert_threshold) || 10.0;
    
    const result = db.prepare(`
      INSERT INTO competitors (name, product_url, css_selector, internal_product, alert_threshold, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(name, product_url, css_selector, internal_product, threshold);
    
    const newCompetitor = db.prepare('SELECT * FROM competitors WHERE id = ?').get(result.lastInsertRowid);
    
    console.log(`[Competitors] Added: ${name} (${product_url})`);
    
    res.status(201).json(newCompetitor);
  } catch (error) {
    console.error('Error creating competitor:', error);
    res.status(500).json({ error: 'Failed to create competitor' });
  }
});

// PUT /api/competitors/:id - Update competitor
router.put('/:id', (req, res) => {
  try {
    const { name, product_url, css_selector, internal_product, alert_threshold, is_active } = req.body;
    
    // Check if exists
    const existing = db.prepare('SELECT * FROM competitors WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Competitor not found' });
    }
    
    // Validation
    if (!name || !product_url || !css_selector || !internal_product) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // URL validation
    try {
      new URL(product_url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    // Check for duplicate URL (excluding current)
    const duplicate = db.prepare('SELECT id FROM competitors WHERE product_url = ? AND id != ?').get(product_url, req.params.id);
    if (duplicate) {
      return res.status(400).json({ error: 'A competitor with this URL already exists' });
    }
    
    const threshold = parseFloat(alert_threshold) || 10.0;
    const active = is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active;
    
    db.prepare(`
      UPDATE competitors 
      SET name = ?, product_url = ?, css_selector = ?, internal_product = ?, alert_threshold = ?, is_active = ?
      WHERE id = ?
    `).run(name, product_url, css_selector, internal_product, threshold, active, req.params.id);
    
    const updated = db.prepare('SELECT * FROM competitors WHERE id = ?').get(req.params.id);
    
    console.log(`[Competitors] Updated: ${name}`);
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating competitor:', error);
    res.status(500).json({ error: 'Failed to update competitor' });
  }
});

// PATCH /api/competitors/:id/toggle - Toggle competitor active status
router.patch('/:id/toggle', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM competitors WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Competitor not found' });
    }
    
    const newStatus = existing.is_active ? 0 : 1;
    
    db.prepare('UPDATE competitors SET is_active = ? WHERE id = ?').run(newStatus, req.params.id);
    
    const updated = db.prepare('SELECT * FROM competitors WHERE id = ?').get(req.params.id);
    
    console.log(`[Competitors] ${existing.name} ${newStatus ? 'activated' : 'deactivated'}`);
    
    res.json(updated);
  } catch (error) {
    console.error('Error toggling competitor:', error);
    res.status(500).json({ error: 'Failed to toggle competitor' });
  }
});

// DELETE /api/competitors/:id - Delete competitor
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM competitors WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Competitor not found' });
    }
    
    db.prepare('DELETE FROM competitors WHERE id = ?').run(req.params.id);
    
    console.log(`[Competitors] Deleted: ${existing.name}`);
    
    res.json({ message: 'Competitor deleted successfully' });
  } catch (error) {
    console.error('Error deleting competitor:', error);
    res.status(500).json({ error: 'Failed to delete competitor' });
  }
});

// POST /api/competitors/:id/test-selector - Test CSS selector
router.post('/:id/test-selector', async (req, res) => {
  try {
    const competitor = db.prepare('SELECT * FROM competitors WHERE id = ?').get(req.params.id);
    if (!competitor) {
      return res.status(404).json({ error: 'Competitor not found' });
    }
    
    // Return instructions for manual testing
    res.json({
      message: 'To test the selector, open the URL in your browser and use DevTools',
      url: competitor.product_url,
      selector: competitor.css_selector,
      instructions: [
        '1. Open the URL in Chrome/Firefox',
        '2. Press F12 to open DevTools',
        '3. Go to Console tab',
        `4. Run: document.querySelector('${competitor.css_selector}')`,
        '5. If it returns an element, the selector is valid',
        '6. Check the textContent for the price'
      ]
    });
  } catch (error) {
    console.error('Error testing selector:', error);
    res.status(500).json({ error: 'Failed to test selector' });
  }
});

module.exports = router;
