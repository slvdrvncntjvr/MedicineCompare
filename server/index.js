const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Middleware
// In production, frontend is served from same origin, so CORS is not needed
// In development, allow requests from Vite dev server
if (!isProduction) {
  app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true
  }));
}
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
app.use('/api', dashboardRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');

if (isProduction) {
  // Serve static files
  app.use(express.static(clientDistPath));
  
  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // Development - just show API info
  app.get('/', (req, res) => {
    res.json({ 
      message: 'Price Intelligence API',
      docs: 'Use the React frontend at http://localhost:5173'
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🏥 Price Intelligence Dashboard Server                   ║
║                                                            ║
║   Server running on: http://localhost:${PORT}               ║
║   Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}                            ║
║                                                            ║
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
