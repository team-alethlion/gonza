
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Lock as LockIcon, ChartLine } from 'lucide-react';
import { Sale } from '@/types';
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, subDays, subWeeks, subMonths, startOfDay, endOfDay
} from 'date-fns';
import { useBusiness } from '@/contexts/BusinessContext';
import { useFinancialVisibility } from '@/hooks/useFinancialVisibility';
import { getExpensesForChartAction } from '@/app/actions/expenses';
import { getPerformanceChartAction } from '@/app/actions/sales';

interface SalesPerformanceChartProps {
  sales: Sale[]; // Keep for compatibility but prefer backend aggregation
  formatCurrency: (value: any) => string;
  dateFilter?: string;
  dateRange?: { from: Date | undefined; to: Date | undefined };
  isCustomRange?: boolean;
}

interface DataPoint {
  date: string;
  displayDate: string;
  amount: number;
  expenses: number;
}

const CustomTooltip = ({ active, payload, formatCurrency }: any) => {
  if (!active || !payload?.length) return null;
  const dp = payload[0].payload;
  return (
    <div className="bg-white p-3 border border-gray-200 shadow-sm rounded-md">
      <p className="font-medium text-sm">{dp.displayDate}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm">
          <span className="font-medium">{entry.name}: </span>{formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
};

const SalesPerformanceChart: React.FC<SalesPerformanceChartProps> = ({
  sales: initialSales,
  formatCurrency,
  dateFilter = 'this-month',
  dateRange = { from: undefined, to: undefined },
  isCustomRange = false,
}) => {
  const { currentBusiness } = useBusiness();
  const { canViewTotalSales, canViewTotalExpenses } = useFinancialVisibility();
  const [timeFrame, setTimeFrame] = useState('monthly');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [expensesData, setExpensesData] = useState<{ date: string; amount: number }[]>([]);
  const [serverSalesData, setServerSalesData] = useState<{ date: string; amount: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 🛡️ HYDRATION GUARD: Prevent redundant fetches during re-renders
  const lastFetchRef = React.useRef<{
    businessId: string, 
    timeFrame: string, 
    year: string, 
    dateFilter: string,
    time: number
  } | null>(null);

  const currentYear = new Date().getFullYear();
  const years = [
    ...new Set(initialSales.map(s => new Date(s.date).getFullYear()))
  ].sort((a, b) => b - a);
  if (years.length === 0) years.push(currentYear);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentBusiness?.id) { 
        setExpensesData([]); 
        setServerSalesData([]);
        return; 
      }

      // 🛡️ HYDRATION CHECK
      const now = Date.now();
      if (
        lastFetchRef.current?.businessId === currentBusiness.id &&
        lastFetchRef.current?.timeFrame === timeframeFromState(timeFrame) &&
        lastFetchRef.current?.year === yearFilter &&
        lastFetchRef.current?.dateFilter === dateFilter &&
        now - lastFetchRef.current.time < 30000
      ) {
        return;
      }

      setIsLoading(true);

      lastFetchRef.current = {
        businessId: currentBusiness.id,
        timeFrame: timeframeFromState(timeFrame),
        year: yearFilter,
        dateFilter,
        time: now
      };

      let from: string | undefined;
      let to: string | undefined;

      if (isCustomRange && dateRange.from && dateRange.to) {
        from = dateRange.from.toISOString();
        to = dateRange.to.toISOString();
      } else if (dateFilter && dateFilter !== 'all') {
        const today = new Date();
        switch (dateFilter) {
          case 'today': from = startOfDay(today).toISOString(); to = endOfDay(today).toISOString(); break;
          case 'yesterday': { const y = subDays(today, 1); from = startOfDay(y).toISOString(); to = endOfDay(y).toISOString(); break; }
          case 'this-week': from = startOfWeek(today, { weekStartsOn: 1 }).toISOString(); to = endOfWeek(today, { weekStartsOn: 1 }).toISOString(); break;
          case 'last-week': { const lws = subWeeks(startOfWeek(today, { weekStartsOn: 1 }), 1); from = lws.toISOString(); to = endOfWeek(lws, { weekStartsOn: 1 }).toISOString(); break; }
          case 'this-month': from = startOfMonth(today).toISOString(); to = endOfMonth(today).toISOString(); break;
          case 'last-month': { const lm = subMonths(today, 1); from = startOfMonth(lm).toISOString(); to = endOfMonth(lm).toISOString(); break; }
          case 'this-year': from = startOfYear(today).toISOString(); to = endOfYear(today).toISOString(); break;
          default: { const yr = parseInt(yearFilter); from = new Date(yr, 0, 1).toISOString(); to = new Date(yr, 11, 31).toISOString(); }
        }
      } else {
        const yr = parseInt(yearFilter);
        from = new Date(yr, 0, 1).toISOString();
        to = new Date(yr, 11, 31).toISOString();
      }

      try {
        const [expenses, sales] = await Promise.all([
          getExpensesForChartAction(currentBusiness.id, from, to),
          getPerformanceChartAction(
            currentBusiness.id, 
            timeframeFromState(timeFrame) as any, 
            yearFilter, 
            from, 
            to
          )
        ]);
        
        setExpensesData(expenses || []);
        setServerSalesData(sales || []);
      } catch (e) {
        console.error('Error fetching chart data:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [timeFrame, yearFilter, dateFilter, dateRange, isCustomRange, currentBusiness?.id]);

  function timeframeFromState(state: string) {
    if (state === 'weekly') return 'daily'; 
    if (state === 'monthly') return 'monthly';
    if (state === 'yearly') return 'monthly'; 
    return 'monthly';
  }

  const prepareChartData = (): DataPoint[] => {
    if (timeFrame === 'monthly') {
      const yr = parseInt(yearFilter);
      return Array.from({ length: 12 }, (_, monthIdx) => {
        const d = new Date(yr, monthIdx, 1);
        const dateKey = format(d, 'yyyy-MM');
        
        const monthSales = serverSalesData.filter(s => s.date.startsWith(dateKey))
          .reduce((sum, s) => sum + s.amount, 0);
          
        const monthExpenses = expensesData.filter(e => e.date.startsWith(dateKey))
          .reduce((sum, e) => sum + e.amount, 0);

        return {
          date: dateKey, displayDate: format(d, 'MMM'),
          amount: monthSales,
          expenses: monthExpenses
        };
      });
    }

    if (timeFrame === 'weekly') {
        const today = new Date();
        const ws = startOfWeek(today, { weekStartsOn: 1 });
        return Array.from({ length: 7 }, (_, i) => {
          const day = new Date(ws); day.setDate(ws.getDate() + i);
          const dateKey = format(day, 'yyyy-MM-dd');
          const daySales = serverSalesData.find(s => s.date === dateKey)?.amount || 0;
          const dayExpenses = expensesData.find(e => e.date === dateKey)?.amount || 0;
          
          return {
            date: dateKey, displayDate: format(day, 'EEE'),
            amount: daySales,
            expenses: dayExpenses
          };
        });
    }

    if (timeFrame === 'yearly') {
        return years.slice(0, 5).reverse().map(year => {
          const yearSales = serverSalesData.filter(s => s.date.startsWith(year.toString()))
            .reduce((sum, s) => sum + s.amount, 0);
          const yearExpenses = expensesData.filter(e => e.date.startsWith(year.toString()))
            .reduce((sum, e) => sum + e.amount, 0);
            
          return {
            date: year.toString(), displayDate: year.toString(),
            amount: yearSales,
            expenses: yearExpenses
          };
        });
    }

    return [];
  };

  const chartData = prepareChartData();

  return (
    <Card className="mb-6 relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ChartLine className="h-5 w-5" /> Performance Analysis
            </CardTitle>
            <CardDescription>Visualize your sales and expenses over time (fully aggregated)</CardDescription>
          </div>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[100px]"><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>
              {years.map(yr => <SelectItem key={yr} value={yr.toString()}>{yr}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="monthly" value={timeFrame} onValueChange={setTimeFrame} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
          </TabsList>
          <div className="h-[300px] w-full">
            {(!canViewTotalSales && !canViewTotalExpenses) ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2">
                <LockIcon className="h-8 w-8 opacity-20" />
                <p>Private data restricted</p>
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 20, left: 30, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="displayDate" tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#e0e0e0' }} />
                  <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#e0e0e0' }} width={80} />
                  <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
                  <Legend />
                  {canViewTotalSales && (
                    <Line type="monotone" dataKey="amount" name="Sales" stroke="#9b87f5" activeDot={{ r: 8 }} strokeWidth={2} />
                  )}
                  {canViewTotalExpenses && (
                    <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#E76F51" activeDot={{ r: 6 }} strokeWidth={2} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No data available for this selection
              </div>
            )}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SalesPerformanceChart;
