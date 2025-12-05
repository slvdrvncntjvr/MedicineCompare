import { TrendingDown, TrendingUp, X, Bell } from 'lucide-react';

function AlertsList({ alerts, onDismiss }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Bell className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-gray-500 text-sm">No recent alerts</p>
        <p className="text-gray-400 text-xs mt-1">Price changes will appear here</p>
      </div>
    );
  }

  const formatPriceChange = (alert) => {
    const direction = alert.percent_change < 0 ? 'dropped' : 'increased';
    const absPercent = Math.abs(alert.percent_change).toFixed(1);
    return `${direction} ${alert.product_name} by ${absPercent}%`;
  };

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`relative p-4 rounded-xl border ${
            alert.percent_change < 0 
              ? 'bg-red-50/50 border-red-100' 
              : 'bg-amber-50/50 border-amber-100'
          } animate-fade-in`}
        >
          {/* Dismiss button */}
          <button
            onClick={() => onDismiss(alert.id)}
            className={`absolute top-2 right-2 p-1 rounded-lg transition-colors ${
              alert.percent_change < 0 
                ? 'hover:bg-red-100 text-red-400' 
                : 'hover:bg-amber-100 text-amber-400'
            }`}
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3 pr-6">
            {/* Icon */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              alert.percent_change < 0 ? 'bg-red-100' : 'bg-amber-100'
            }`}>
              {alert.percent_change < 0 ? (
                <TrendingDown className={`w-5 h-5 ${
                  alert.percent_change < 0 ? 'text-red-600' : 'text-amber-600'
                }`} />
              ) : (
                <TrendingUp className={`w-5 h-5 ${
                  alert.percent_change < 0 ? 'text-red-600' : 'text-amber-600'
                }`} />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                <span className={alert.percent_change < 0 ? 'text-red-600' : 'text-amber-600'}>
                  {alert.percent_change < 0 ? '🔴' : '🟡'}
                </span>{' '}
                <span className="font-semibold">{alert.competitor_name}</span>{' '}
                {formatPriceChange(alert)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                ₱{alert.old_price?.toLocaleString()} → ₱{alert.new_price?.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {alert.timeAgo}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default AlertsList;

