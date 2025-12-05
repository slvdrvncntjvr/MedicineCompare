const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Import routes
const competitorsRouter = require('./routes/competitors');
const dashboardRouter = require('./routes/dashboard');

// API Routes
app.use('/api/competitors', competitorsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api', dashboardRouter); // Mount dashboard routes on /api as well for price-history

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🏥 Price Intelligence Dashboard Server                   ║
║                                                            ║
║   Server running on: http://localhost:${PORT}               ║
║   API Endpoints:                                           ║
║     - GET  /api/competitors                                ║
║     - POST /api/competitors                                ║
║     - PUT  /api/competitors/:id                            ║
║     - DELETE /api/competitors/:id                          ║
║     - GET  /api/dashboard                                  ║
║     - POST /api/scrape                                     ║
║     - GET  /api/price-history                              ║
║     - PUT  /api/alerts/:id/dismiss                         ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;

