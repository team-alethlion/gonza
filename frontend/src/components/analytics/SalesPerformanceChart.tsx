
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

interface SalesPerformanceChartProps {
  sales: Sale[];
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
  rawDate: Date;
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
  sales,
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
    ...new Set(sales.map(s => new Date(s.date).getFullYear()))
  ].sort((a, b) => b - a);
  if (years.length === 0) years.push(currentYear);

  const getFilteredSales = () => {
    const nonQuote = sales.filter(s => s.paymentStatus !== 'Quote');
    if (isCustomRange && dateRange.from && dateRange.to) {
      return nonQuote.filter(s => {
        const d = new Date(s.date);
        return d >= startOfDay(dateRange.from!) && d <= endOfDay(dateRange.to!);
      });
    }
    if (dateFilter && dateFilter !== 'all' && dateFilter !== 'this-month') {
      const today = new Date();
      return nonQuote.filter(s => {
        const d = new Date(s.date);
        switch (dateFilter) {
          case 'today': return d >= startOfDay(today) && d <= endOfDay(today);
          case 'yesterday': { const y = subDays(today, 1); return d >= startOfDay(y) && d <= endOfDay(y); }
          case 'this-week': return d >= startOfWeek(today, { weekStartsOn: 1 }) && d <= endOfWeek(today, { weekStartsOn: 1 });
          case 'last-week': { const lws = subWeeks(startOfWeek(today, { weekStartsOn: 1 }), 1); return d >= lws && d <= endOfWeek(lws, { weekStartsOn: 1 }); }
          case 'last-month': { const lm = subMonths(today, 1); return d >= startOfMonth(lm) && d <= endOfMonth(lm); }
          case 'this-year': return d >= startOfYear(today) && d <= endOfYear(today);
          default: return true;
        }
      });
    }
    return nonQuote.filter(s => new Date(s.date).getFullYear() === parseInt(yearFilter));
  };

  useEffect(() => {
    const fetchExpenses = async () => {
      if (!currentBusiness?.id) { setExpensesData([]); return; }

      // 🛡️ HYDRATION CHECK
      const now = Date.now();
      if (
        lastFetchRef.current?.businessId === currentBusiness.id &&
        lastFetchRef.current?.timeFrame === timeFrame &&
        lastFetchRef.current?.year === yearFilter &&
        lastFetchRef.current?.dateFilter === dateFilter &&
        now - lastFetchRef.current.time < 60000
      ) {
        console.log('[PerformanceChart] Skipping expense fetch: Request is redundant');
        return;
      }

      // Lock guard
      lastFetchRef.current = {
        businessId: currentBusiness.id,
        timeFrame,
        year: yearFilter,
        dateFilter,
        time: now
      };

      let from: string | undefined;
      let to: string | undefined;

      if (isCustomRange && dateRange.from && dateRange.to) {
        from = dateRange.from.toISOString();
        to = dateRange.to.toISOString();
      } else if (dateFilter && dateFilter !== 'all' && dateFilter !== 'this-month') {
        const today = new Date();
        switch (dateFilter) {
          case 'today': from = startOfDay(today).toISOString(); to = endOfDay(today).toISOString(); break;
          case 'yesterday': { const y = subDays(today, 1); from = startOfDay(y).toISOString(); to = endOfDay(y).toISOString(); break; }
          case 'this-week': from = startOfWeek(today, { weekStartsOn: 1 }).toISOString(); to = endOfWeek(today, { weekStartsOn: 1 }).toISOString(); break;
          case 'last-week': { const lws = subWeeks(startOfWeek(today, { weekStartsOn: 1 }), 1); from = lws.toISOString(); to = endOfWeek(lws, { weekStartsOn: 1 }).toISOString(); break; }
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
        const result = await getExpensesForChartAction(currentBusiness.id, from, to);
        setExpensesData(result || []);
      } catch (e) {
        console.error('Error fetching expenses data:', e);
      }
    };
    fetchExpenses();
  }, [timeFrame, yearFilter, dateFilter, dateRange, isCustomRange, currentBusiness?.id]);

  const salesTotal = (arr: Sale[]) =>
    arr.reduce((sum, s) => sum + (Array.isArray(s.items) ? (s.items as any[]).reduce((a: number, i: any) => a + i.price * i.quantity, 0) : 0), 0);
  const expTotal = (arr: { date: string; amount: number }[]) =>
    arr.reduce((sum, e) => sum + Number(e.amount), 0);

  const prepareChartData = (): DataPoint[] => {
    const filtered = getFilteredSales();

    if (timeFrame === 'weekly') {
      const ws = startOfWeek(new Date(), { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => {
        const day = new Date(ws); day.setDate(ws.getDate() + i);
        const ds = day.toDateString();
        return {
          date: format(day, 'yyyy-MM-dd'), displayDate: format(day, 'EEE'),
          amount: salesTotal(filtered.filter(s => new Date(s.date).toDateString() === ds)),
          expenses: expTotal(expensesData.filter(e => new Date(e.date).toDateString() === ds)),
          rawDate: day,
        };
      });
    }

    if (timeFrame === 'monthly') {
      const yr = parseInt(yearFilter);
      return Array.from({ length: 12 }, (_, month) => {
        const d = new Date(yr, month, 1);
        const ms = startOfMonth(d), me = endOfMonth(d);
        return {
          date: format(d, 'yyyy-MM'), displayDate: format(d, 'MMM'),
          amount: salesTotal(filtered.filter(s => { const sd = new Date(s.date); return sd >= ms && sd <= me; })),
          expenses: expTotal(expensesData.filter(e => { const ed = new Date(e.date); return ed >= ms && ed <= me; })),
          rawDate: d,
        };
      });
    }

    if (timeFrame === 'yearly') {
      return years.map(year => {
        const ys = startOfYear(new Date(year, 0, 1)), ye = endOfYear(new Date(year, 0, 1));
        return {
          date: year.toString(), displayDate: year.toString(),
          amount: salesTotal(filtered.filter(s => { const sd = new Date(s.date); return sd >= ys && sd <= ye; })),
          expenses: expTotal(expensesData.filter(e => { const ed = new Date(e.date); return ed >= ys && ed <= ye; })),
          rawDate: new Date(year, 0, 1),
        };
      });
    }

    return [];
  };

  const chartData = prepareChartData();

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ChartLine className="h-5 w-5" /> Performance Analysis
            </CardTitle>
            <CardDescription>Visualize your sales and expenses over time</CardDescription>
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
                No data available for this time period
              </div>
            )}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SalesPerformanceChart;
