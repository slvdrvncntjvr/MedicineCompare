import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  RefreshCw, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Zap,
  TestTube,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import ComparisonTable from '../components/ComparisonTable';
import PriceChart from '../components/PriceChart';
import AlertsList from '../components/AlertsList';
import ActionsSuggested from '../components/ActionsSuggested';
import ManualPriceModal from '../components/ManualPriceModal';
import ScrapeLogsPanel from '../components/ScrapeLogsPanel';

function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [priceHistory, setPriceHistory] = useState(null);
  const [competitors, setCompetitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [scrapeMode, setScrapeMode] = useState('real'); // 'real' or 'mock'
  const [showManualPriceModal, setShowManualPriceModal] = useState(false);
  const [showScrapeLogs, setShowScrapeLogs] = useState(false);
  const [lastScrapeResults, setLastScrapeResults] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const [dashboardRes, historyRes, competitorsRes] = await Promise.all([
        axios.get('/api/dashboard'),
        axios.get('/api/price-history'),
        axios.get('/api/competitors')
      ]);
      setDashboardData(dashboardRes.data);
      setPriceHistory(historyRes.data);
      setCompetitors(competitorsRes.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleScrape = async () => {
    setScraping(true);
    setError(null);
    setSuccessMessage(null);
    setLastScrapeResults(null);

    try {
      const response = await axios.post('/api/scrape', { mode: scrapeMode });
      const { success, failed, total, details, fallbackUsed } = response.data;
      
      setLastScrapeResults(response.data);
      
      let message = `Scrape complete: ${success}/${total} successful`;
      if (fallbackUsed) {
        message += ' (using mock data - real scrape failed)';
      }
      if (failed > 0) {
        message += `. ${failed} failed - consider adding manual prices.`;
      }
      
      setSuccessMessage(message);
      
      // Refresh dashboard data
      await fetchDashboardData();
      
      // Clear success message after 10 seconds
      setTimeout(() => setSuccessMessage(null), 10000);
    } catch (err) {
      console.error('Error during scrape:', err);
      setError('Scraping failed. You can add prices manually instead.');
    } finally {
      setScraping(false);
    }
  };

  const handleDismissAlert = async (alertId) => {
    try {
      await axios.put(`/api/alerts/${alertId}/dismiss`);
      await fetchDashboardData();
    } catch (err) {
      console.error('Error dismissing alert:', err);
    }
  };

  const handleManualPriceSubmit = async (competitorId, price) => {
    try {
      await axios.post('/api/manual-price', { competitorId, price });
      setSuccessMessage('Manual price added successfully');
      await fetchDashboardData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error adding manual price:', err);
      setError(err.response?.data?.error || 'Failed to add manual price');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const { comparison, marketPosition, alerts, suggestions, scrapeStats } = dashboardData || {};

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Scrape Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Price Intelligence</h2>
          <p className="text-gray-500 mt-1">Monitor competitor pricing in real-time</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Scrape Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setScrapeMode('real')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                scrapeMode === 'real' 
                  ? 'bg-white shadow text-primary-700' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Real
            </button>
            <button
              onClick={() => setScrapeMode('mock')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                scrapeMode === 'mock' 
                  ? 'bg-white shadow text-amber-700' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <TestTube className="w-3.5 h-3.5" />
              Demo
            </button>
          </div>

          {/* Manual Price Button */}
          <button
            onClick={() => setShowManualPriceModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-all"
          >
            <TrendingUp className="w-4 h-4" />
            Manual Entry
          </button>

          {/* Scrape Button */}
          <button
            onClick={handleScrape}
            disabled={scraping}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg ${
              scraping
                ? 'bg-gray-400 cursor-not-allowed'
                : scrapeMode === 'mock'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/30'
                  : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-primary-500/30'
            } text-white`}
          >
            <RefreshCw className={`w-4 h-4 ${scraping ? 'animate-spin' : ''}`} />
            {scraping ? 'Scraping...' : 'Scrape All Now'}
          </button>
        </div>
      </div>

      {/* Scrape Stats Bar */}
      {scrapeStats && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">{scrapeStats.successful || 0}</span> successful
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">{scrapeStats.failed || 0}</span> failed
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">{scrapeStats.manual || 0}</span> manual
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                24h success rate: <span className="font-semibold text-gray-900">{scrapeStats.successRate}%</span>
              </span>
              <button
                onClick={() => setShowScrapeLogs(!showScrapeLogs)}
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                {showScrapeLogs ? 'Hide' : 'View'} Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scrape Logs Panel */}
      {showScrapeLogs && <ScrapeLogsPanel />}

      {/* Last Scrape Results */}
      {lastScrapeResults && lastScrapeResults.details && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Last Scrape Results</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lastScrapeResults.details.map((result, idx) => (
              <div 
                key={idx}
                className={`p-3 rounded-lg border ${
                  result.success 
                    ? 'bg-emerald-50 border-emerald-200' 
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{result.competitorName}</p>
                    {result.success ? (
                      <p className="text-sm text-emerald-700">${result.price?.toFixed(2)}</p>
                    ) : (
                      <p className="text-sm text-red-600 truncate">{result.error}</p>
                    )}
                  </div>
                  {result.success ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-700">{error}</p>
            <button 
              onClick={() => setShowManualPriceModal(true)}
              className="text-red-600 underline text-sm mt-1"
            >
              Add price manually instead
            </button>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <p className="text-emerald-700">{successMessage}</p>
        </div>
      )}

      {/* Market Position Card */}
      {marketPosition && (
        <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-6 card-hover">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              marketPosition.position === 'below' 
                ? 'bg-emerald-100' 
                : marketPosition.position === 'above' 
                  ? 'bg-amber-100' 
                  : 'bg-blue-100'
            }`}>
              {marketPosition.position === 'below' ? (
                <TrendingDown className="w-8 h-8 text-emerald-600" />
              ) : marketPosition.position === 'above' ? (
                <TrendingUp className="w-8 h-8 text-amber-600" />
              ) : (
                <Minus className="w-8 h-8 text-blue-600" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Market Position</p>
              <p className={`text-2xl font-bold ${
                marketPosition.position === 'below' 
                  ? 'text-emerald-600' 
                  : marketPosition.position === 'above' 
                    ? 'text-amber-600' 
                    : 'text-blue-600'
              }`}>
                {marketPosition.description}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {marketPosition.position === 'below' 
                  ? '✓ Great! You have a competitive advantage.' 
                  : marketPosition.position === 'above' 
                    ? '⚠ Consider reviewing your pricing strategy.' 
                    : 'Your prices are aligned with the market.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Price Chart & Comparison Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Price Chart */}
          <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-6 card-hover">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Price History (Last 30 Days)</h3>
            {priceHistory && (
              <PriceChart 
                history={priceHistory.history} 
                ourPrices={priceHistory.ourPrices} 
              />
            )}
          </div>

          {/* Comparison Table */}
          <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-6 card-hover">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Comparison</h3>
            {comparison && <ComparisonTable data={comparison} />}
          </div>
        </div>

        {/* Right Column - Alerts & Suggestions */}
        <div className="space-y-6">
          {/* Alerts */}
          <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-6 card-hover">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Alerts</h3>
            {alerts && (
              <AlertsList 
                alerts={alerts} 
                onDismiss={handleDismissAlert} 
              />
            )}
          </div>

          {/* Suggestions */}
          <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-6 card-hover">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Suggested Actions</h3>
            {suggestions && <ActionsSuggested suggestions={suggestions} />}
          </div>
        </div>
      </div>

      {/* Manual Price Modal */}
      {showManualPriceModal && (
        <ManualPriceModal
          competitors={competitors}
          onClose={() => setShowManualPriceModal(false)}
          onSubmit={handleManualPriceSubmit}
        />
      )}
    </div>
  );
}

export default Dashboard;
