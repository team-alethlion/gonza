"use client";
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface TaskPageHeaderProps {
  pendingTodayTasksCount: number;
  totalTasksCount: number;
  onCreateTask: () => void;
  canCreate?: boolean;
}

const TaskPageHeader: React.FC<TaskPageHeaderProps> = ({
  pendingTodayTasksCount,
  totalTasksCount,
  onCreateTask,
  canCreate = true,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        <p className="text-gray-600 mt-1">
          {pendingTodayTasksCount > 0
            ? `You have ${pendingTodayTasksCount} task${pendingTodayTasksCount === 1 ? '' : 's'} due today`
            : totalTasksCount > 0
              ? "All clear for today! 🎉"
              : "What's on your mind today?"
          }
        </p>
      </div>
      {canCreate && (
        <Button onClick={onCreateTask} className="mt-4 sm:mt-0">
          <Plus className="w-4 h-4 mr-2" />
          Create Task
        </Button>
      )}
    </div>
  );
};

export default TaskPageHeader;