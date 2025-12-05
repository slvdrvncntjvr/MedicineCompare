import { useState } from 'react';
import { ArrowUpDown, CheckCircle2, AlertTriangle, XCircle, Minus } from 'lucide-react';

function ComparisonTable({ data }) {
  const [sortBy, setSortBy] = useState('difference');
  const [sortDirection, setSortDirection] = useState('desc');

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    if (sortBy === 'difference') {
      return (a.difference - b.difference) * multiplier;
    }
    if (sortBy === 'ourPrice') {
      return (a.ourPrice - b.ourPrice) * multiplier;
    }
    return 0;
  });

  const getStatusBadge = (status, difference) => {
    if (difference <= -5 || status === 'competitive') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium status-competitive">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Competitive
        </span>
      );
    }
    if (difference <= 10 || status === 'neutral') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium status-neutral">
          <Minus className="w-3.5 h-3.5" />
          Neutral
        </span>
      );
    }
    if (difference <= 20 || status === 'higher') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium status-higher">
          <AlertTriangle className="w-3.5 h-3.5" />
          Higher
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium status-much-higher">
        <XCircle className="w-3.5 h-3.5" />
        Much Higher
      </span>
    );
  };

  const formatPrice = (price) => {
    if (!price || price === 0) return '—';
    return `₱${price.toLocaleString()}`;
  };

  const formatDifference = (diff) => {
    if (diff === 0) return '—';
    const sign = diff > 0 ? '+' : '';
    return `${sign}${diff.toFixed(1)}%`;
  };

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No comparison data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
              Product
            </th>
            <th 
              className="text-left py-3 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors rounded"
              onClick={() => handleSort('ourPrice')}
            >
              <span className="inline-flex items-center gap-1">
                Our Price
                <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
              </span>
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
              Competitors
            </th>
            <th 
              className="text-left py-3 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors rounded"
              onClick={() => handleSort('difference')}
            >
              <span className="inline-flex items-center gap-1">
                Difference
                <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
              </span>
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item, index) => (
            <tr 
              key={item.product}
              className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${
                index === sortedData.length - 1 ? 'border-b-0' : ''
              }`}
            >
              <td className="py-4 px-4">
                <span className="font-medium text-gray-900">{item.product}</span>
              </td>
              <td className="py-4 px-4">
                <span className="font-semibold text-primary-600">
                  {formatPrice(item.ourPrice)}
                </span>
              </td>
              <td className="py-4 px-4">
                <div className="space-y-1">
                  {item.competitors.length > 0 ? (
                    item.competitors.map((comp) => (
                      <div key={comp.id} className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600">{comp.name}:</span>
                        <span className={`font-medium ${
                          comp.price && comp.price < item.ourPrice 
                            ? 'text-red-600' 
                            : comp.price && comp.price > item.ourPrice
                              ? 'text-emerald-600'
                              : 'text-gray-900'
                        }`}>
                          {formatPrice(comp.price)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-gray-400 text-sm">No competitors</span>
                  )}
                </div>
              </td>
              <td className="py-4 px-4">
                <span className={`font-semibold ${
                  item.difference > 0 
                    ? 'text-red-600' 
                    : item.difference < 0 
                      ? 'text-emerald-600' 
                      : 'text-gray-500'
                }`}>
                  {formatDifference(item.difference)}
                </span>
              </td>
              <td className="py-4 px-4">
                {getStatusBadge(item.status, item.difference)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ComparisonTable;

