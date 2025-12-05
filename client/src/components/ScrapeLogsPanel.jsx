import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CheckCircle, 
  XCircle, 
  Edit3, 
  Clock, 
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

function ScrapeLogsPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await axios.get('/api/scrape-logs?limit=50');
      setLogs(response.data);
    } catch (err) {
      console.error('Error fetching scrape logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'manual':
        return <Edit3 className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      success: 'bg-emerald-100 text-emerald-700',
      failed: 'bg-red-100 text-red-700',
      manual: 'bg-blue-100 text-blue-700'
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now - date) / 1000;

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const displayLogs = expanded ? logs : logs.slice(0, 10);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h4 className="font-semibold text-gray-900">Scrape Logs</h4>
        <button
          onClick={fetchLogs}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No scrape logs yet
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Competitor</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Price</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Time</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(log.status)}`}>
                        {getStatusIcon(log.status)}
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">
                      {log.competitor_name}
                    </td>
                    <td className="px-4 py-2.5">
                      {log.price ? (
                        <span className="text-gray-900">${log.price.toFixed(2)}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {formatTime(log.scraped_at)}
                    </td>
                    <td className="px-4 py-2.5">
                      {log.error_message ? (
                        <span className="text-red-600 text-xs truncate block max-w-[200px]" title={log.error_message}>
                          {log.error_message}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logs.length > 10 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors flex items-center justify-center gap-1"
            >
              {expanded ? (
                <>
                  Show Less <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  Show All ({logs.length}) <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default ScrapeLogsPanel;

