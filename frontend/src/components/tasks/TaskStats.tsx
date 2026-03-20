
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { Task } from '@/types/task';
import { isToday, isPast, isTomorrow } from 'date-fns';

interface TaskStatsProps {
  tasks: Task[];
}

const TaskStats: React.FC<TaskStatsProps> = ({ tasks }) => {
  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    const pendingTasks = totalTasks - completedTasks;
    
    const todayTasks = tasks.filter(task => isToday(new Date(task.due_date)));
    const todayCompleted = todayTasks.filter(task => task.completed).length;
    
    const overdueTasks = tasks.filter(task => 
      isPast(new Date(task.due_date)) && 
      !task.completed && 
      !isToday(new Date(task.due_date))
    ).length;
    
    const highPriorityPending = tasks.filter(task => 
      task.priority === 'High' && !task.completed
    ).length;
    
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const todayCompletionRate = todayTasks.length > 0 ? Math.round((todayCompleted / todayTasks.length) * 100) : 0;
    
    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      todayTasks: todayTasks.length,
      todayCompleted,
      overdueTasks,
      highPriorityPending,
      completionRate,
      todayCompletionRate,
    };
  }, [tasks]);

  const statCards = [
    {
      title: 'Total Tasks',
      value: stats.totalTasks,
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Completed',
      value: stats.completedTasks,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Overdue',
      value: stats.overdueTasks,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'High Priority',
      value: stats.highPriorityPending,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  if (stats.totalTasks === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">No tasks yet. Create your first task to see statistics!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-600">{stat.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Overall Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Completion Rate</span>
                <span className="font-semibold">{stats.completionRate}%</span>
              </div>
              <Progress value={stats.completionRate} className="h-2" />
              <p className="text-xs text-gray-600">
                {stats.completedTasks} of {stats.totalTasks} tasks completed
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Today's Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today's Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Today's Completion</span>
                <span className="font-semibold">{stats.todayCompletionRate}%</span>
              </div>
              <Progress value={stats.todayCompletionRate} className="h-2" />
              <p className="text-xs text-gray-600">
                {stats.todayCompleted} of {stats.todayTasks} today's tasks completed
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Motivational Message */}
      {stats.completionRate > 80 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <p className="text-green-800 font-medium">🎉 Excellent work!</p>
            <p className="text-green-700 text-sm mt-1">
              You're doing great with a {stats.completionRate}% completion rate!
            </p>
          </CardContent>
        </Card>
      )}

      {stats.overdueTasks > 0 && (
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4 text-center">
            <p className="text-orange-800 font-medium">⏰ Heads up!</p>
            <p className="text-orange-700 text-sm mt-1">
              You have {stats.overdueTasks} overdue task{stats.overdueTasks === 1 ? '' : 's'}. 
              Consider updating your schedule or completing them soon.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TaskStats;
