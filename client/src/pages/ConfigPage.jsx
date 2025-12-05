import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Save, 
  X, 
  AlertCircle, 
  CheckCircle,
  Globe,
  Code,
  Tag,
  Percent,
  HelpCircle,
  ExternalLink,
  Power,
  PowerOff,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Clock
} from 'lucide-react';

const PRODUCT_OPTIONS = ['ED Medication', 'Hair Loss Treatment', 'Skin Care'];

// Common CSS selectors for pharmacy sites
const SELECTOR_SUGGESTIONS = [
  { label: 'Generic price class', value: '.price' },
  { label: 'Product price span', value: 'span.product-price' },
  { label: 'GoodRx style', value: '[data-qa="drug-price"]' },
  { label: 'Amazon style', value: '.a-price .a-offscreen' },
  { label: 'Walgreens style', value: '.product__price' },
  { label: 'CVS style', value: '.price-value' },
];

function ConfigPage() {
  const [competitors, setCompetitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    product_url: '',
    css_selector: '',
    internal_product: 'ED Medication',
    alert_threshold: 10
  });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const fetchCompetitors = async () => {
    try {
      const response = await axios.get(`/api/competitors?includeInactive=${showInactive}`);
      setCompetitors(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching competitors:', err);
      setError('Failed to load competitors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetitors();
  }, [showInactive]);

  const resetForm = () => {
    setFormData({
      name: '',
      product_url: '',
      css_selector: '',
      internal_product: 'ED Medication',
      alert_threshold: 10
    });
    setFormErrors({});
    setEditingId(null);
    setShowForm(false);
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Competitor name is required';
    }
    
    if (!formData.product_url.trim()) {
      errors.product_url = 'Product URL is required';
    } else {
      try {
        new URL(formData.product_url);
      } catch {
        errors.product_url = 'Please enter a valid URL';
      }
    }
    
    if (!formData.css_selector.trim()) {
      errors.css_selector = 'CSS selector is required';
    }
    
    if (formData.alert_threshold < 0 || formData.alert_threshold > 100) {
      errors.alert_threshold = 'Threshold must be between 0 and 100';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        await axios.put(`/api/competitors/${editingId}`, formData);
        setSuccessMessage('Competitor updated successfully');
      } else {
        await axios.post('/api/competitors', formData);
        setSuccessMessage('Competitor added successfully');
      }
      
      await fetchCompetitors();
      resetForm();
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving competitor:', err);
      setError(err.response?.data?.error || 'Failed to save competitor');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (competitor) => {
    setFormData({
      name: competitor.name,
      product_url: competitor.product_url,
      css_selector: competitor.css_selector,
      internal_product: competitor.internal_product,
      alert_threshold: competitor.alert_threshold
    });
    setEditingId(competitor.id);
    setShowForm(true);
    setFormErrors({});
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also delete all price history and logs.`)) {
      return;
    }

    try {
      await axios.delete(`/api/competitors/${id}`);
      setSuccessMessage('Competitor deleted successfully');
      await fetchCompetitors();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error deleting competitor:', err);
      setError('Failed to delete competitor');
    }
  };

  const handleToggleActive = async (id) => {
    try {
      await axios.patch(`/api/competitors/${id}/toggle`);
      await fetchCompetitors();
    } catch (err) {
      console.error('Error toggling competitor:', err);
      setError('Failed to toggle competitor status');
    }
  };

  const handleScrapeOne = async (id) => {
    try {
      setSuccessMessage('Scraping...');
      await axios.post(`/api/scrape/${id}`);
      setSuccessMessage('Scrape completed');
      await fetchCompetitors();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Scrape failed');
    }
  };

  const getStatusIndicator = (competitor) => {
    if (!competitor.last_scrape_status) {
      return <span className="text-gray-400 text-sm">Never scraped</span>;
    }
    
    if (competitor.last_scrape_status === 'success') {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-600 text-sm">
          <CheckCircle className="w-3.5 h-3.5" />
          Working
        </span>
      );
    }
    
    if (competitor.last_scrape_status === 'manual') {
      return (
        <span className="inline-flex items-center gap-1 text-blue-600 text-sm">
          <TrendingUp className="w-3.5 h-3.5" />
          Manual
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center gap-1 text-red-600 text-sm">
        <AlertTriangle className="w-3.5 h-3.5" />
        Failed
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Competitor Configuration</h2>
          <p className="text-gray-500 mt-1">Manage competitor tracking settings</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300"
            />
            Show inactive
          </label>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white transition-all shadow-lg shadow-primary-500/30"
            >
              <Plus className="w-4 h-4" />
              Add Competitor
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4 text-red-400 hover:text-red-600" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <p className="text-emerald-700">{successMessage}</p>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-900">Scraping Limitations</h4>
            <p className="text-sm text-amber-700 mt-1">
              Many pharmacy websites block automated scraping. If scraping fails consistently, you can:
            </p>
            <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
              <li>Add prices manually from the Dashboard</li>
              <li>Use the "Demo" mode for testing</li>
              <li>Try different CSS selectors</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-6 card-hover">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingId ? 'Edit Competitor' : 'Add New Competitor'}
            </h3>
            <button
              onClick={resetForm}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Competitor Name */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Tag className="w-4 h-4" />
                Competitor Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., HealthWarehouse, GoodRx, Amazon Pharmacy"
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  formErrors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:border-primary-500 focus:ring-primary-500/20'
                } focus:ring-4 outline-none transition-all`}
              />
              {formErrors.name && (
                <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>
              )}
            </div>

            {/* Product URL */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Globe className="w-4 h-4" />
                Product URL
              </label>
              <input
                type="url"
                value={formData.product_url}
                onChange={(e) => setFormData({ ...formData, product_url: e.target.value })}
                placeholder="https://www.pharmacy.com/product/sildenafil"
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  formErrors.product_url ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:border-primary-500 focus:ring-primary-500/20'
                } focus:ring-4 outline-none transition-all`}
              />
              {formErrors.product_url && (
                <p className="text-red-500 text-sm mt-1">{formErrors.product_url}</p>
              )}
            </div>

            {/* CSS Selector */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Code className="w-4 h-4" />
                CSS Selector for Price
              </label>
              <input
                type="text"
                value={formData.css_selector}
                onChange={(e) => setFormData({ ...formData, css_selector: e.target.value })}
                placeholder=".price-amount or span.product-price"
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  formErrors.css_selector ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:border-primary-500 focus:ring-primary-500/20'
                } focus:ring-4 outline-none transition-all`}
              />
              
              {/* Selector Suggestions */}
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1.5">Common selectors (click to use):</p>
                <div className="flex flex-wrap gap-1.5">
                  {SELECTOR_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, css_selector: suggestion.value })}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors"
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mt-2 bg-gray-50 rounded-lg p-3">
                <p className="text-gray-600 text-sm flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>How to find the selector:</strong> Right-click the price on the competitor's website → 
                    "Inspect Element" → Copy the class name or create a selector from the HTML structure.
                  </span>
                </p>
              </div>
              
              {formErrors.css_selector && (
                <p className="text-red-500 text-sm mt-1">{formErrors.css_selector}</p>
              )}
            </div>

            {/* Two columns for Product and Threshold */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Internal Product */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Tag className="w-4 h-4" />
                  Product Category
                </label>
                <select
                  value={formData.internal_product}
                  onChange={(e) => setFormData({ ...formData, internal_product: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 outline-none transition-all bg-white"
                >
                  {PRODUCT_OPTIONS.map((product) => (
                    <option key={product} value={product}>
                      {product}
                    </option>
                  ))}
                </select>
              </div>

              {/* Alert Threshold */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Percent className="w-4 h-4" />
                  Alert Threshold (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.alert_threshold}
                  onChange={(e) => setFormData({ ...formData, alert_threshold: parseFloat(e.target.value) || 0 })}
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    formErrors.alert_threshold ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:border-primary-500 focus:ring-primary-500/20'
                  } focus:ring-4 outline-none transition-all`}
                />
                {formErrors.alert_threshold && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.alert_threshold}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all ${
                  saving
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-lg shadow-primary-500/30'
                } text-white`}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : editingId ? 'Update Competitor' : 'Save Competitor'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Competitors List */}
      <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Configured Competitors</h3>
          <p className="text-gray-500 text-sm mt-1">
            {competitors.length} competitor{competitors.length !== 1 ? 's' : ''} configured
          </p>
        </div>

        {competitors.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">No competitors configured yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-primary-600 hover:bg-primary-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add your first competitor
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {competitors.map((competitor) => (
              <div
                key={competitor.id}
                className={`px-6 py-4 hover:bg-gray-50/50 transition-colors ${
                  !competitor.is_active ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{competitor.name}</h4>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                        {competitor.internal_product}
                      </span>
                      {!competitor.is_active && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Inactive
                        </span>
                      )}
                      {getStatusIndicator(competitor)}
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-500 truncate flex items-center gap-1">
                        <span className="font-medium">URL:</span> 
                        <a 
                          href={competitor.product_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:underline truncate max-w-[400px] inline-flex items-center gap-1"
                        >
                          {competitor.product_url}
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </p>
                      <p className="text-gray-500">
                        <span className="font-medium">Selector:</span>{' '}
                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                          {competitor.css_selector}
                        </code>
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <p className="text-gray-500">
                          <span className="font-medium">Threshold:</span> {competitor.alert_threshold}%
                        </p>
                        {competitor.scrapeSuccessRate && (
                          <p className="text-gray-500">
                            <span className="font-medium">Success Rate:</span> {competitor.scrapeSuccessRate}%
                          </p>
                        )}
                      </div>
                      {competitor.latest_price && (
                        <p className="text-gray-900 font-medium mt-2">
                          Latest Price: ${competitor.latest_price.toFixed(2)}
                          {competitor.last_scraped && (
                            <span className="text-gray-400 font-normal text-xs ml-2">
                              ({new Date(competitor.last_scraped).toLocaleDateString()})
                            </span>
                          )}
                        </p>
                      )}
                      {competitor.last_error && competitor.last_scrape_status === 'failed' && (
                        <p className="text-red-500 text-xs mt-1 truncate">
                          Last error: {competitor.last_error}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleScrapeOne(competitor.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                      title="Scrape Now"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(competitor.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        competitor.is_active 
                          ? 'hover:bg-amber-50 text-amber-500' 
                          : 'hover:bg-emerald-50 text-emerald-500'
                      }`}
                      title={competitor.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {competitor.is_active ? (
                        <PowerOff className="w-4 h-4" />
                      ) : (
                        <Power className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(competitor)}
                      className="p-2 hover:bg-primary-50 rounded-lg text-primary-600 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(competitor.id, competitor.name)}
                      className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ConfigPage;
