"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Clock, Layers, TrendingUp } from 'lucide-react';

interface HistoryStatsProps {
  stats?: any;
  isLoading?: boolean;
}

const HistoryStats: React.FC<HistoryStatsProps> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-12 bg-slate-100 rounded-lg"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statItems = [
    {
      title: 'Total Activities',
      value: stats.total_activities || 0,
      icon: Activity,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Recent (7 Days)',
      value: stats.recent_activities || 0,
      icon: Clock,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Most Active Module',
      value: stats.top_module || 'N/A',
      icon: Layers,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Active Modules',
      value: stats.module_distribution?.length || 0,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item, index) => (
        <Card key={index} className="overflow-hidden border-none shadow-sm bg-white dark:bg-slate-900">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${item.bgColor}`}>
                <item.icon className={`h-6 w-6 ${item.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{item.title}</p>
                <h3 className="text-2xl font-bold tracking-tight">{item.value}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default HistoryStats;
