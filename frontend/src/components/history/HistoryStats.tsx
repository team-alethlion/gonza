import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActivityHistoryItem } from '@/hooks/useActivityHistory';
import { TrendingUp, Activity, Clock, BarChart3 } from 'lucide-react';

interface HistoryStatsProps {
  activities: ActivityHistoryItem[];
  totalCount: number;
}

export const HistoryStats: React.FC<HistoryStatsProps> = ({ activities, totalCount }) => {
  const todayActivities = activities.filter(activity => {
    const today = new Date();
    const activityDate = new Date(activity.created_at);
    return activityDate.toDateString() === today.toDateString();
  }).length;

  const moduleStats = activities.reduce((acc, activity) => {
    acc[activity.module] = (acc[activity.module] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topModule = Object.entries(moduleStats).sort(([,a], [,b]) => b - a)[0];

  const createCount = activities.filter(a => a.activity_type === 'CREATE').length;
  const updateCount = activities.filter(a => a.activity_type === 'UPDATE').length;
  const deleteCount = activities.filter(a => a.activity_type === 'DELETE').length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs md:text-sm font-medium">Total Activities</CardTitle>
          <Activity className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-lg md:text-2xl font-bold">{totalCount}</div>
          <p className="text-xs text-muted-foreground hidden sm:block">All time activities</p>
          <p className="text-xs text-muted-foreground sm:hidden">All time</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs md:text-sm font-medium">Today</CardTitle>
          <Clock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-lg md:text-2xl font-bold">{todayActivities}</div>
          <p className="text-xs text-muted-foreground hidden sm:block">Activities today</p>
          <p className="text-xs text-muted-foreground sm:hidden">Today</p>
        </CardContent>
      </Card>
      
      <Card className="col-span-2 lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs md:text-sm font-medium">Most Active</CardTitle>
          <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-lg md:text-2xl font-bold">{topModule?.[1] || 0}</div>
          <p className="text-xs text-muted-foreground">{topModule?.[0] || 'No data'}</p>
        </CardContent>
      </Card>
      
      <Card className="col-span-2 lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs md:text-sm font-medium">Activity Breakdown</CardTitle>
          <BarChart3 className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xs md:text-sm space-y-1">
            <div className="flex justify-between">
              <span className="truncate">Created:</span>
              <span className="font-medium">{createCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="truncate">Updated:</span>
              <span className="font-medium">{updateCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="truncate">Deleted:</span>
              <span className="font-medium">{deleteCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};