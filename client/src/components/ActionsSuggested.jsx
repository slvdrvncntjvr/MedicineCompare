import { useState } from 'react';
import { 
  Target, 
  Shield, 
  Search, 
  X, 
  ChevronRight,
  Lightbulb
} from 'lucide-react';

function ActionsSuggested({ suggestions }) {
  const [dismissedIds, setDismissedIds] = useState(new Set());

  const handleDismiss = (id) => {
    setDismissedIds(prev => new Set([...prev, id]));
  };

  const filteredSuggestions = suggestions?.filter(s => !dismissedIds.has(s.id)) || [];

  const getIcon = (type) => {
    switch (type) {
      case 'price_match':
        return Target;
      case 'maintain':
        return Shield;
      case 'investigate':
        return Search;
      default:
        return Lightbulb;
    }
  };

  const getPriorityStyles = (priority) => {
    switch (priority) {
      case 'high':
        return {
          border: 'border-red-200',
          bg: 'bg-red-50/50',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          badge: 'bg-red-100 text-red-700'
        };
      case 'medium':
        return {
          border: 'border-amber-200',
          bg: 'bg-amber-50/50',
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
          badge: 'bg-amber-100 text-amber-700'
        };
      case 'low':
        return {
          border: 'border-emerald-200',
          bg: 'bg-emerald-50/50',
          iconBg: 'bg-emerald-100',
          iconColor: 'text-emerald-600',
          badge: 'bg-emerald-100 text-emerald-700'
        };
      default:
        return {
          border: 'border-gray-200',
          bg: 'bg-gray-50/50',
          iconBg: 'bg-gray-100',
          iconColor: 'text-gray-600',
          badge: 'bg-gray-100 text-gray-700'
        };
    }
  };

  if (filteredSuggestions.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Lightbulb className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-gray-500 text-sm">No suggestions at this time</p>
        <p className="text-gray-400 text-xs mt-1">Check back after price changes</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredSuggestions.map((suggestion) => {
        const Icon = getIcon(suggestion.type);
        const styles = getPriorityStyles(suggestion.priority);

        return (
          <div
            key={suggestion.id}
            className={`relative p-4 rounded-xl border ${styles.border} ${styles.bg} animate-fade-in`}
          >
            {/* Dismiss button */}
            <button
              onClick={() => handleDismiss(suggestion.id)}
              className="absolute top-2 right-2 p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3 pr-6">
              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${styles.iconBg}`}>
                <Icon className={`w-5 h-5 ${styles.iconColor}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">
                    {suggestion.title}
                  </h4>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles.badge}`}>
                    {suggestion.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {suggestion.description}
                </p>
                {suggestion.action && (
                  <button className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors">
                    {suggestion.action}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ActionsSuggested;

