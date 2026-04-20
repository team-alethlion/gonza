
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts';
import { Product } from '@/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface StockLevelChartProps {
  products: Product[];
  totalInStockQtyOverride?: number;
  totalLowStockQtyOverride?: number;
  totalMinLevelQtyOverride?: number;
}

const StockLevelChart: React.FC<StockLevelChartProps> = ({ 
  products,
  totalInStockQtyOverride,
  totalLowStockQtyOverride,
  totalMinLevelQtyOverride
}) => {
  // 🛡️ Math Hardening
  const toSafeNum = (val: any) => {
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

  // 🛡️ DATA INTEGRITY: Strictly use server-provided totals. 
  const inStock = toSafeNum(totalInStockQtyOverride);
  const lowStock = toSafeNum(totalLowStockQtyOverride);
  const safetyThreshold = toSafeNum(totalMinLevelQtyOverride);
  
  // 🚀 Logic Improvement: Current Stock distribution vs Safety Level
  const chartData = [
    { name: 'Healthy Stock', value: inStock, color: '#4ade80' },
    { name: 'Low Stock', value: lowStock, color: '#f87171' }
  ];

  const totalCurrentStock = inStock + lowStock;

  return (
    <div className="w-full">
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 12 }} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 12 }}
            />
            <RechartsTooltip
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            
            {/* Display Safety Threshold as a comparison line */}
            <ReferenceLine 
              y={safetyThreshold} 
              label={{ 
                position: 'right', 
                value: 'Safety Level', 
                fill: '#94a3b8', 
                fontSize: 10 
              }} 
              stroke="#94a3b8" 
              strokeDasharray="3 3" 
            />

            <Bar dataKey="value" barSize={50} radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <TooltipProvider>
        <div className="flex justify-center mt-6 space-x-8">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center cursor-help group">
                <div className="flex items-center mb-1">
                  <div className="w-3 h-3 bg-[#4ade80] rounded-full mr-2"></div>
                  <span className="text-xs font-medium text-slate-600 group-hover:text-sales-primary transition-colors">Healthy</span>
                  <Info className="h-3 w-3 ml-1 text-slate-300 group-hover:text-slate-400" />
                </div>
                <span className="text-sm font-bold">{inStock.toLocaleString()}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-[200px] text-xs">
              Total units of products where current quantity is above the minimum stock threshold. These items do not currently need restocking.
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center cursor-help group">
                <div className="flex items-center mb-1">
                  <div className="w-3 h-3 bg-[#f87171] rounded-full mr-2"></div>
                  <span className="text-xs font-medium text-slate-600 group-hover:text-red-600 transition-colors">Low Stock</span>
                  <Info className="h-3 w-3 ml-1 text-slate-300 group-hover:text-slate-400" />
                </div>
                <span className="text-sm font-bold text-red-500">{lowStock.toLocaleString()}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-[200px] text-xs">
              Total units of products where current quantity is at or below the minimum stock level. These items should be prioritized for reorder.
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center border-l pl-8 cursor-help group">
                <div className="flex items-center mb-1">
                  <div className="w-3 h-3 bg-[#94a3b8] rounded-full mr-2"></div>
                  <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 transition-colors">Safety Level</span>
                  <Info className="h-3 w-3 ml-1 text-slate-300 group-hover:text-slate-400" />
                </div>
                <span className="text-sm font-bold text-slate-400">{safetyThreshold.toLocaleString()}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-[200px] text-xs">
              The combined minimum stock threshold for all products. This acts as a reference baseline; if your Healthy/Low bars stay significantly above this line, your total inventory is safe.
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
};

export default StockLevelChart;
