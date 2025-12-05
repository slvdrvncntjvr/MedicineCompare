import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// Color palette for chart lines
const COLORS = {
  'Our Price': '#3b82f6',
  'MediStore': '#10b981',
  'PillExpress': '#f59e0b',
  'Default1': '#8b5cf6',
  'Default2': '#ec4899',
  'Default3': '#06b6d4',
};

function PriceChart({ history, ourPrices }) {
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];

    // Group by date
    const dateMap = new Map();

    history.forEach((item) => {
      const date = new Date(item.scraped_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });

      if (!dateMap.has(date)) {
        dateMap.set(date, {
          date,
          timestamp: new Date(item.scraped_at).getTime()
        });
      }

      const entry = dateMap.get(date);
      // Use competitor name as key
      const key = item.competitor_name || `Competitor ${item.competitor_id}`;
      entry[key] = item.price;
    });

    // Add our prices to all data points
    const dataArray = Array.from(dateMap.values());
    
    if (ourPrices && ourPrices.length > 0) {
      // Just use the first our price (ED Medication) for the chart
      const ourPrice = ourPrices.find(p => p.product_name === 'ED Medication');
      if (ourPrice) {
        dataArray.forEach(entry => {
          entry['Our Price'] = ourPrice.price;
        });
      }
    }

    // Sort by timestamp
    dataArray.sort((a, b) => a.timestamp - b.timestamp);

    return dataArray;
  }, [history, ourPrices]);

  const lineKeys = useMemo(() => {
    if (chartData.length === 0) return [];
    
    const keys = new Set();
    chartData.forEach(entry => {
      Object.keys(entry).forEach(key => {
        if (key !== 'date' && key !== 'timestamp') {
          keys.add(key);
        }
      });
    });
    
    // Ensure "Our Price" comes first
    const keysArray = Array.from(keys);
    const ourPriceIndex = keysArray.indexOf('Our Price');
    if (ourPriceIndex > 0) {
      keysArray.splice(ourPriceIndex, 1);
      keysArray.unshift('Our Price');
    }
    
    return keysArray;
  }, [chartData]);

  const getColor = (key, index) => {
    if (COLORS[key]) return COLORS[key];
    const defaultColors = ['#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'];
    return defaultColors[index % defaultColors.length];
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-3">
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4 text-sm">
              <span className="flex items-center gap-2">
                <span 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-600">{entry.name}</span>
              </span>
              <span className="font-medium text-gray-900">
                ₱{entry.value?.toLocaleString() || '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500">
        No price history data available
      </div>
    );
  }

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart 
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={{ stroke: '#e5e7eb' }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis 
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={{ stroke: '#e5e7eb' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(value) => `₱${value}`}
            domain={['dataMin - 50', 'dataMax + 50']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
            iconSize={8}
          />
          {lineKeys.map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={getColor(key, index)}
              strokeWidth={key === 'Our Price' ? 3 : 2}
              dot={{ fill: getColor(key, index), strokeWidth: 0, r: 3 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default PriceChart;

