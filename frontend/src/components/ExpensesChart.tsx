"use client";

import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, isSameDay, isSameMonth } from 'date-fns';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';

type ExpenseChartProps = {
  expenses: {
    id: string;
    description: string;
    amount: number;
    date: string;
    category: string | null;
  }[];
  startDate?: Date;
  endDate?: Date;
  groupBy?: 'day' | 'month';
};

const ExpensesChart: React.FC<ExpenseChartProps> = ({
  expenses,
  startDate,
  endDate,
  groupBy = 'day'
}) => {
  const { settings } = useBusinessSettings();

  // Format currency based on business settings
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: settings.currency || 'USD'
    }).format(amount);
  };

  const chartData = useMemo(() => {
    if (!expenses.length) return [];

    // If no dates provided, use the min and max dates from expenses
    const effectiveStartDate = startDate || 
      expenses.reduce((min, exp) => {
        const date = new Date(exp.date);
        return date < min ? date : min;
      }, new Date(expenses[0].date));

    const effectiveEndDate = endDate || 
      expenses.reduce((max, exp) => {
        const date = new Date(exp.date);
        return date > max ? date : max;
      }, new Date(expenses[0].date));

    let datePoints: Date[] = [];
    
    // Generate date points based on groupBy
    if (groupBy === 'month') {
      // Group by months
      datePoints = eachMonthOfInterval({
        start: startOfMonth(effectiveStartDate),
        end: endOfMonth(effectiveEndDate)
      });
    } else {
      // Group by days
      datePoints = eachDayOfInterval({
        start: effectiveStartDate,
        end: effectiveEndDate
      });
    }

    // Map the date points to data points with expense totals
    return datePoints.map(date => {
      // Filter expenses for this date point
      const expensesForDate = expenses.filter(expense => {
        const expenseDate = parseISO(expense.date);
        if (groupBy === 'month') {
          return isSameMonth(expenseDate, date);
        } else {
          return isSameDay(expenseDate, date);
        }
      });
      
      // Calculate total amount for this date
      const totalAmount = expensesForDate.reduce((sum, exp) => sum + exp.amount, 0);
      
      // Format for display
      const formattedDate = groupBy === 'month' 
        ? format(date, 'MMM yyyy')
        : format(date, 'MMM d');
        
      return {
        date: formattedDate,
        rawDate: date,
        amount: totalAmount,
        count: expensesForDate.length
      };
    });
  }, [expenses, startDate, endDate, groupBy]);

  const config = {
    expenses: {
      label: "Expenses",
      theme: {
        light: "#8B5CF6", // Vivid Purple
        dark: "#A78BFA"   // Lighter Purple
      }
    }
  };

  // If no data, show empty state
  if (!chartData.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expenses Over Time</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">No expense data available for the selected period.</p>
        </CardContent>
      </Card>
    );
  }

  // Find max value to set appropriate Y-axis domain
  const maxAmount = Math.max(...chartData.map(item => item.amount));
  const yAxisDomain = [0, Math.ceil(maxAmount * 1.1)]; // Add 10% padding on top

  // Determine how many ticks to show on X-axis based on data length
  const xAxisTickCount = Math.min(chartData.length, groupBy === 'month' ? 12 : 7);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expenses Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={chartData} 
              margin={{ top: 20, right: 30, left: 30, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis 
                dataKey="date" 
                tickLine={false}
                axisLine={false}
                padding={{ left: 10, right: 10 }}
                minTickGap={5}
                tick={{ fontSize: 12 }}
                tickFormatter={(value, index) => {
                  // Show fewer ticks if there are many data points
                  if (chartData.length > xAxisTickCount) {
                    if (index % Math.ceil(chartData.length / xAxisTickCount) === 0) {
                      return value;
                    }
                    return '';
                  }
                  return value;
                }}
              />
              <YAxis 
                tickFormatter={(value) => {
                  if (value === 0) return '0';
                  // Use the currency symbol + abbreviated number for better display
                  const currency = settings.currency || 'USD';
                  return currency + ' ' + (value < 1000 ? value : Math.round(value / 1000) + 'k');
                }}
                tickLine={false}
                axisLine={false}
                width={60}
                domain={yAxisDomain}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => `Date: ${label}`}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  borderRadius: '8px',
                  padding: '8px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                  border: '1px solid #eee'
                }}
              />
              <Line
                type="monotone"
                dataKey="amount"
                name="Amount"
                stroke="#8B5CF6" // Vivid Purple
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: "#8B5CF6" }}
                activeDot={{ r: 6, strokeWidth: 2, fill: "#8B5CF6" }}
                isAnimationActive={true}
                animationDuration={1000}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpensesChart;
