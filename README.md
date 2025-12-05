# 💊 Price Intelligence Dashboard

A real-time competitor price monitoring system for pharmaceutical products. Track competitor pricing, receive alerts on price changes, and get actionable recommendations.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18-blue)
![SQLite](https://img.shields.io/badge/SQLite-3-orange)

## ✨ Features

- **🔍 Automated Scraping** - Stealth mode with anti-detection
- **📝 Manual Price Entry** - Fallback when scraping fails
- **📊 Price Comparison** - Side-by-side competitor analysis
- **📈 30-Day Charts** - Visual price trend tracking
- **🔔 Smart Alerts** - Notifications when prices change
- **💡 AI Suggestions** - Pricing recommendations

## 🚀 Quick Start (Local)

```bash
# Install dependencies
npm run install:all

# Start development servers
npm run dev

# Open http://localhost:5173
```

## 📦 Deployment Options

### Option 1: Railway (Recommended) ⭐

Railway is the easiest option - supports SQLite, Puppeteer, and persistent storage.

1. **Push to GitHub** first
2. Go to [railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway auto-detects and deploys!

**Free tier**: 500 hours/month, $5 credit

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template)

---

### Option 2: Render

Render also supports persistent disks for SQLite.

1. Push to GitHub
2. Go to [render.com](https://render.com)
3. Click "New" → "Web Service"
4. Connect your repo
5. Settings will auto-configure from `render.yaml`

**Free tier**: 750 hours/month (spins down after inactivity)

---

### Option 3: Docker (VPS/Self-hosted)

```bash
# Build the image
docker build -t price-intelligence .

# Run the container
docker run -d \
  --name price-app \
  -p 3001:3001 \
  -v price-data:/app/data \
  price-intelligence

# Access at http://your-server:3001
```

---

### Option 4: Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Launch app
fly launch

# Deploy
fly deploy
```

---

### ❌ NOT Recommended: Vercel/Netlify

These platforms **won't work** because:
- No persistent filesystem (SQLite needs this)
- Puppeteer is too heavy for serverless
- Function timeouts (10-60s) too short for scraping

---

## 🔧 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `NODE_ENV` | development | Set to `production` for deployment |

## 📁 Project Structure

```
├── server/
│   ├── index.js          # Express server
│   ├── db.js             # SQLite + seeding
│   ├── scraper.js        # Puppeteer with stealth
│   └── routes/
│       ├── competitors.js
│       └── dashboard.js
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   └── ConfigPage.jsx
│   │   └── components/
│   │       ├── ComparisonTable.jsx
│   │       ├── PriceChart.jsx
│   │       ├── AlertsList.jsx
│   │       ├── ManualPriceModal.jsx
│   │       └── ScrapeLogsPanel.jsx
│   └── ...
├── data/                 # SQLite database (auto-created)
├── Dockerfile            # Docker deployment
├── railway.json          # Railway config
├── render.yaml           # Render config
└── Procfile              # Heroku/generic
```

## 🏥 Pre-configured Competitors

The app comes with 5 real pharmacy sites:

| Pharmacy | Scrape Likelihood | Notes |
|----------|-------------------|-------|
| Cost Plus Drugs | 🟢 High | Simple HTML |
| Honeybee Health | 🟢 High | Simple site |
| Blink Health | 🟡 Medium | React-based |
| HealthWarehouse | 🟡 Medium | E-commerce |
| RxSaver | 🟠 Low | Heavy JS |

## 📝 Adding Your Own Competitors

1. Go to **Configuration** page
2. Click **Add Competitor**
3. Fill in:
   - **Name**: e.g., "CVS Pharmacy"
   - **URL**: Product page URL
   - **CSS Selector**: Right-click price → Inspect → Copy selector
   - **Product**: Map to your product category
   - **Threshold**: Alert when price changes by this %

### Finding CSS Selectors

1. Open the competitor's product page
2. Right-click the price → "Inspect"
3. Look for the element containing the price
4. Common patterns:
   ```
   .price
   .product-price
   [data-price]
   span.amount
   ```

## 🔄 When Scraping Fails

Many sites block automated scraping. When this happens:

1. **Check the error** in Scrape Logs
2. **Try different selectors** - the site may have changed
3. **Use Manual Entry** - add prices by hand
4. **Use Demo mode** - for testing/demos

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, better-sqlite3
- **Scraping**: Puppeteer with stealth plugin
- **Frontend**: React 18, Vite, TailwindCSS
- **Charts**: Recharts
- **Icons**: Lucide React

## 📄 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/competitors` | List all competitors |
| POST | `/api/competitors` | Add competitor |
| PUT | `/api/competitors/:id` | Update competitor |
| DELETE | `/api/competitors/:id` | Delete competitor |
| POST | `/api/scrape` | Trigger scrape (all) |
| POST | `/api/manual-price` | Add manual price |
| GET | `/api/dashboard` | Dashboard data |
| GET | `/api/scrape-logs` | View scrape history |

## 🐛 Troubleshooting

**Scraping always fails?**
- Try Demo mode first to verify the app works
- Check if the site blocks bots (Cloudflare, etc.)
- Use Manual Entry as fallback

**Database errors?**
- Delete `data/pricewatch.db` to reset
- Restart server to re-seed

**Port already in use?**
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :3001
kill -9 <PID>
```

## 📜 License

MIT License - Use freely for your projects!

---

Built with ❤️ for competitive intelligence
