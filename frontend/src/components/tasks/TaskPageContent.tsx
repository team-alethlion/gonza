"use client";

import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Calendar } from 'lucide-react';
import { Task } from '@/types/task';
import TaskList from './TaskList';
import TaskCalendar from './TaskCalendar';
import TaskStats from './TaskStats';
import TaskItems from './TaskItems';

interface TaskPageContentProps {
  tasks: Task[];
  todayTasks: Task[];
  onToggleComplete: (id: string) => Promise<boolean>;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => Promise<boolean>;
  onBulkComplete: (taskIds: string[]) => Promise<boolean>;
  onCreateTask: () => void;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

const TaskPageContent: React.FC<TaskPageContentProps> = ({
  tasks,
  todayTasks,
  onToggleComplete,
  onEdit,
  onDelete,
  onBulkComplete,
  onCreateTask,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}) => {
  return (
    <>
      <TabsContent value="list" className="space-y-6">
        <TaskList
          tasks={tasks}
          onToggleComplete={onToggleComplete}
          onEdit={onEdit}
          onDelete={onDelete}
          onBulkComplete={onBulkComplete}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      </TabsContent>

      <TabsContent value="calendar" className="space-y-6">
        <TaskCalendar
          tasks={tasks}
          onToggleComplete={onToggleComplete}
          onEdit={onEdit}
          onDelete={onDelete}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      </TabsContent>

      <TabsContent value="today" className="space-y-6">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Today's Tasks</h2>
            {canCreate && (
              <Button onClick={onCreateTask} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            )}
          </div>

          {todayTasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Calendar className="w-16 h-16 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-600">No tasks for today</p>
                <p className="text-sm text-gray-500 mt-1">Time for a coffee break ☕</p>
              </div>
            </div>
          ) : (
            <TaskItems
              tasks={todayTasks}
              onToggleComplete={onToggleComplete}
              onEdit={onEdit}
              onDelete={onDelete}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          )}
        </div>
      </TabsContent>

      <TabsContent value="stats" className="space-y-6">
        <TaskStats tasks={tasks} />
      </TabsContent>
    </>
  );
};

export default TaskPageContent;
