
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Product } from '@/types';

interface StockLevelChartProps {
  products: Product[];
}

const StockLevelChart: React.FC<StockLevelChartProps> = ({ products }) => {
  // Calculate aggregated stock data
  const totalInStock = products.filter(p => p.quantity > p.minimumStock).reduce((sum, p) => sum + p.quantity, 0);
  const totalLowStock = products.filter(p => p.quantity > 0 && p.quantity <= p.minimumStock).reduce((sum, p) => sum + p.quantity, 0);
  const totalMinimumLevel = products.reduce((sum, p) => sum + p.minimumStock, 0);
  
  // Create data array with each stock category as a separate object
  const chartData = [
    { name: 'In Stock', value: totalInStock, fill: '#4ade80' },
    { name: 'Low Stock', value: totalLowStock, fill: '#f87171' },
    { name: 'Minimum Level', value: totalMinimumLevel, fill: '#94a3b8' }
  ];

  return (
    <div className="w-full">
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
              formatter={(value, name, props) => {
                return [value, props.payload.name];
              }}
            />
            <Bar dataKey="value" fill="#8884d8" barSize={40}>
              {chartData.map((entry, index) => (
                <Bar key={`bar-${index}`} dataKey="value" fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center mt-4 space-x-6">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-[#4ade80] rounded-full mr-2"></div>
          <span className="text-sm">In Stock</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-[#f87171] rounded-full mr-2"></div>
          <span className="text-sm">Low Stock</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-[#94a3b8] rounded-full mr-2"></div>
          <span className="text-sm">Minimum Level</span>
        </div>
      </div>
    </div>
  );
};

export default StockLevelChart;
