import { useState } from 'react';
import { X, DollarSign, AlertCircle } from 'lucide-react';

function ManualPriceModal({ competitors, onClose, onSubmit }) {
  const [selectedCompetitor, setSelectedCompetitor] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!selectedCompetitor) {
      setError('Please select a competitor');
      return;
    }

    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      setError('Please enter a valid price');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(parseInt(selectedCompetitor), priceValue);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add price');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Add Manual Price</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <p className="text-sm text-gray-600">
            When automated scraping fails, you can manually enter competitor prices here.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Competitor Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Competitor
            </label>
            <select
              value={selectedCompetitor}
              onChange={(e) => setSelectedCompetitor(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 outline-none transition-all bg-white"
            >
              <option value="">Choose a competitor...</option>
              {competitors.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.name} ({comp.internal_product})
                  {comp.latest_price && ` - Current: $${comp.latest_price.toFixed(2)}`}
                </option>
              ))}
            </select>
          </div>

          {/* Price Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price (USD)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 outline-none transition-all"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              Enter the current price you observed on the competitor's website
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className={`flex-1 py-2.5 rounded-xl font-medium transition-all ${
                submitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-lg shadow-primary-500/30'
              } text-white`}
            >
              {submitting ? 'Adding...' : 'Add Price'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Tips */}
        <div className="px-6 pb-6">
          <div className="bg-blue-50 rounded-xl p-4">
            <h4 className="font-medium text-blue-900 text-sm mb-2">💡 Tips</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Visit the competitor's website to get the current price</li>
              <li>• Enter the price per unit (not total or bundle price)</li>
              <li>• Manual prices will be tracked in history like scraped ones</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManualPriceModal;

