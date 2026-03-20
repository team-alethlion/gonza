import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { List, Calendar, BarChart3 } from 'lucide-react';

interface TaskTabNavigationProps {
  activeTab: string;
}

const TaskTabNavigation: React.FC<TaskTabNavigationProps> = ({ activeTab }) => {
  return (
    <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-4">
      <TabsTrigger value="list" className="flex items-center gap-2">
        <List className="w-4 h-4" />
        <span className="hidden sm:inline">List</span>
      </TabsTrigger>
      <TabsTrigger value="calendar" className="flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        <span className="hidden sm:inline">Calendar</span>
      </TabsTrigger>
      <TabsTrigger value="today" className="flex items-center gap-2">
        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-xs text-white font-bold">T</span>
        </div>
        <span className="hidden sm:inline">Today</span>
      </TabsTrigger>
      <TabsTrigger value="stats" className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4" />
        <span className="hidden sm:inline">Stats</span>
      </TabsTrigger>
    </TabsList>
  );
};

export default TaskTabNavigation;