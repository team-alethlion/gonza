
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  ReferenceLine
} from 'recharts';
import { Lock as LockIcon } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface FinancialOverviewProps {
  data: Array<{ name: string, amount: number }>;
  formatCurrency: (value: number) => string;
}

const CustomTooltip = ({ active, payload, label, formatCurrency }: { active?: boolean, payload?: any[], label?: string, formatCurrency: (value: number) => string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg">
        <p className="font-medium text-sm text-gray-900">{`${label}`}</p>
        <p className="text-sm text-blue-600">
          <span className="font-medium">{`Amount: `}</span>
          <span className="font-bold">{formatCurrency(payload[0].value)}</span>
        </p>
      </div>
    );
  }
  return null;
};

const FinancialOverview: React.FC<FinancialOverviewProps> = ({ data, formatCurrency }) => {
  const isMobile = useIsMobile();

  // Enhanced color mapping with gradients
  const getBarColor = (name: string) => {
    const category = name.toLowerCase();
    if (category.includes('sales')) return '#3B82F6'; // Blue
    if (category.includes('cost')) return '#EF4444'; // Red
    if (category.includes('expenses')) return '#8B5CF6'; // Purple
    if (category.includes('profit')) return '#10B981'; // Green
    return '#6B7280'; // Gray default
  };

  // Add colors to data for easier rendering
  const enhancedData = data.map((item) => ({
    ...item,
    fill: getBarColor(item.name)
  }));

  return (
    <Card className="w-full shadow-sm">
      <CardHeader className={isMobile ? 'pb-3' : 'pb-4'}>
        <CardTitle className={isMobile ? 'text-lg' : 'text-xl'}>
          Financial Overview
        </CardTitle>
        <CardDescription className={isMobile ? 'text-sm' : ''}>
          Sales, costs, expenses, and profits (excluding quotes)
        </CardDescription>
      </CardHeader>
      <CardContent className={isMobile ? 'p-4 pt-0' : 'p-6 pt-0'}>
        <div className={`w-full ${isMobile ? 'h-64' : 'h-80'}`}>
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={enhancedData}
                margin={{
                  top: 5,
                  right: isMobile ? 10 : 30,
                  left: isMobile ? 10 : 20,
                  bottom: 5
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f0f0f0"
                  opacity={0.5}
                />
                <XAxis
                  dataKey="name"
                  tick={{
                    fontSize: isMobile ? 10 : 12,
                    fill: '#6B7280'
                  }}
                  tickLine={false}
                  axisLine={{ stroke: '#e0e0e0' }}
                  angle={isMobile ? -45 : 0}
                  textAnchor={isMobile ? 'end' : 'middle'}
                  height={isMobile ? 50 : 30}
                />
                <YAxis
                  tickFormatter={(value) => formatCurrency(value)}
                  tick={{
                    fontSize: isMobile ? 10 : 12,
                    fill: '#6B7280'
                  }}
                  tickLine={false}
                  axisLine={{ stroke: '#e0e0e0' }}
                  width={isMobile ? 60 : 80}
                />
                <Tooltip
                  content={<CustomTooltip formatCurrency={formatCurrency} />}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                />
                {!isMobile && (
                  <Legend
                    wrapperStyle={{
                      paddingTop: 15,
                      fontSize: 12,
                      color: '#6B7280'
                    }}
                  />
                )}
                <Bar
                  dataKey="amount"
                  name="Amount"
                  barSize={isMobile ? 30 : 40}
                  radius={[4, 4, 0, 0]}
                  fillOpacity={0.9}
                >
                  {enhancedData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.fill}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2">
              <LockIcon className="h-8 w-8 opacity-20" />
              <p>Private data restricted</p>
            </div>
          )}
        </div>

        {/* Mobile Legend */}
        {isMobile && (
          <div className="flex flex-wrap justify-center gap-3 mt-4 pt-3 border-t">
            {enhancedData.map((entry, index) => (
              <div key={index} className="flex items-center gap-1">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: entry.fill }}
                />
                <span className="text-xs text-gray-600 font-medium">
                  {entry.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FinancialOverview;
