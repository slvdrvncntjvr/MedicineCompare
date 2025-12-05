# 💊 Price Intelligence Dashboard

A real-time competitor price monitoring system for pharmaceutical products. Track competitor pricing, receive alerts on price changes, and get actionable recommendations.

![Price Intelligence Dashboard](https://img.shields.io/badge/Status-Production%20Ready-green)
![Node.js](https://img.shields.io/badge/Node.js-18+-blue)
![React](https://img.shields.io/badge/React-18-blue)

## ✨ Features

### 📊 Dashboard
- **Price Comparison Table** - Side-by-side comparison with status indicators
- **30-Day Price Chart** - Visual trend analysis using Recharts
- **Market Position Card** - See how your prices compare to market average
- **Real-time Alerts** - Get notified when prices change beyond threshold
- **Smart Suggestions** - AI-generated recommendations for pricing strategy

### ⚙️ Configuration
- Add/Edit/Delete competitor tracking
- Customizable CSS selectors for price scraping
- Configurable alert thresholds per competitor
- Product category mapping

### 🔄 Scraping Engine
- Puppeteer-based web scraping
- Mock scraping mode for demo
- Automatic alert generation
- Error handling and logging

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Installation

1. **Clone the repository**
```bash
cd MedicineCompare
```

2. **Install dependencies**
```bash
npm run install:all
```

This will install both server and client dependencies.

3. **Start the development servers**
```bash
npm run dev
```

This starts:
- Backend server at `http://localhost:3001`
- Frontend dev server at `http://localhost:5173`

4. **Open your browser**
Navigate to `http://localhost:5173`

## 📁 Project Structure

```
MedicineCompare/
├── server/
│   ├── index.js          # Express server setup
│   ├── db.js             # SQLite database setup & seeding
│   ├── scraper.js        # Puppeteer scraping logic
│   └── routes/
│       ├── competitors.js # Competitor CRUD endpoints
│       └── dashboard.js   # Dashboard & scraping endpoints
├── client/
│   ├── src/
│   │   ├── App.jsx       # Main app with routing
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx    # Main dashboard
│   │   │   └── ConfigPage.jsx   # Competitor config
│   │   └── components/
│   │       ├── ComparisonTable.jsx
│   │       ├── PriceChart.jsx
│   │       ├── AlertsList.jsx
│   │       └── ActionsSuggested.jsx
│   ├── index.html
│   └── package.json
├── data/                  # SQLite database (auto-created)
├── package.json
└── README.md
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/competitors` | Get all competitors |
| POST | `/api/competitors` | Add new competitor |
| PUT | `/api/competitors/:id` | Update competitor |
| DELETE | `/api/competitors/:id` | Delete competitor |
| GET | `/api/dashboard` | Get dashboard data |
| POST | `/api/scrape` | Trigger price scrape |
| GET | `/api/price-history` | Get price history for charts |
| PUT | `/api/alerts/:id/dismiss` | Dismiss an alert |

## 🗄️ Database Schema

### competitors
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| name | TEXT | Competitor name |
| product_url | TEXT | URL to scrape |
| css_selector | TEXT | CSS selector for price |
| internal_product | TEXT | Product category |
| alert_threshold | REAL | Alert threshold % |
| created_at | TIMESTAMP | Creation date |

### price_history
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| competitor_id | INTEGER | Foreign key |
| product_name | TEXT | Product name |
| price | REAL | Scraped price |
| scraped_at | TIMESTAMP | Scrape timestamp |

### alerts
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| competitor_id | INTEGER | Foreign key |
| product_name | TEXT | Product name |
| old_price | REAL | Previous price |
| new_price | REAL | New price |
| percent_change | REAL | % change |
| created_at | TIMESTAMP | Alert timestamp |
| dismissed | BOOLEAN | Dismissed status |

## 🎨 UI/UX Features

- **Responsive Design** - Works on desktop, tablet, and mobile
- **Loading States** - Spinners and skeleton states
- **Error Handling** - Clear error messages with recovery options
- **Animations** - Smooth transitions and hover effects
- **Modern Aesthetics** - Clean, professional blue/white theme

## 🔧 Configuration Options

### Environment Variables
```bash
PORT=3001          # Server port (default: 3001)
NODE_ENV=production # Enable production mode
```

### Product Categories
Edit the product options in `client/src/pages/ConfigPage.jsx`:
```javascript
const PRODUCT_OPTIONS = ['ED Medication', 'Hair Loss Treatment', 'Skin Care'];
```

### Our Prices
Update our prices in the database or through the API:
```javascript
// In server/db.js during seeding
insertOurPrice.run('ED Medication', 850);
insertOurPrice.run('Hair Loss Treatment', 1200);
insertOurPrice.run('Skin Care', 650);
```

## 📝 Seed Data

The application comes pre-seeded with:

**Competitors:**
1. **MediStore** - ED Medication tracking
   - URL: `https://example-medistore.com/ed-pack`
   - Price trend: ₱850 → ₱799

2. **PillExpress** - ED Medication tracking
   - URL: `https://example-pillexpress.com/product/123`
   - Price: ₱920 (stable)

**Our Prices:**
- ED Medication: ₱850
- Hair Loss Treatment: ₱1,200
- Skin Care: ₱650

## 🧪 Demo Mode

Since the example URLs don't exist, the scraper runs in "mock mode" by default:
- Simulates realistic price changes (-5% to +5%)
- Generates alerts when thresholds are exceeded
- Perfect for testing and demonstration

To enable real scraping, update competitor URLs to actual websites.

## 🛠️ Tech Stack

**Backend:**
- Node.js + Express
- better-sqlite3
- Puppeteer
- CORS

**Frontend:**
- React 18
- Vite
- TailwindCSS
- Recharts
- Lucide React Icons
- Axios
- React Router

## 📈 Future Enhancements

- [ ] Scheduled automatic scraping (cron)
- [ ] Email/SMS notifications
- [ ] Export data to CSV/Excel
- [ ] Multiple currency support
- [ ] User authentication
- [ ] Price prediction ML model

## 🐛 Troubleshooting

**Database not created:**
- Ensure the `data/` directory exists
- Check write permissions

**Scraping fails:**
- Verify CSS selectors using browser DevTools
- Check if target site blocks scraping
- Try increasing timeout values

**Frontend won't start:**
- Run `cd client && npm install`
- Ensure port 5173 is available

## 📄 License

MIT License - feel free to use for your own projects!

---

Built with ❤️ for competitive intelligence

