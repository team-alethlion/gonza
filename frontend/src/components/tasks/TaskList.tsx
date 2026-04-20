"use client";

import React, { useState, useEffect } from 'react';
import { Task, TaskFilters } from '@/types/task';
import { useTaskCategories } from '@/hooks/useTaskCategories';
import TaskFiltersComponent from './TaskFilters';
import TaskItems from './TaskItems';
import { useTasks } from '@/hooks/useTasks';

interface TaskListProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onBulkComplete?: (taskIds: string[]) => void;
  onBulkDelete?: (taskIds: string[]) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onToggleComplete,
  onEdit,
  onDelete,
  onBulkComplete,
  onBulkDelete,
  canEdit = true,
  canDelete = true,
  searchTerm = '',
  onSearchChange
}) => {
  const { setFilters } = useTasks();
  const [localFilters, setLocalFilters] = useState<TaskFilters>({
    status: 'all',
    priority: 'all',
    category: 'all',
    search: searchTerm,
  });
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const { categories } = useTaskCategories();

  // Sync local filters to hook filters
  useEffect(() => {
    const hookFilters: any = {};
    if (localFilters.status !== 'all') hookFilters.status = localFilters.status;
    if (localFilters.priority !== 'all') hookFilters.priority = localFilters.priority;
    if (localFilters.category !== 'all') hookFilters.category = localFilters.category;
    
    setFilters(hookFilters);
  }, [localFilters, setFilters]);

  const handleBulkComplete = () => {
    if (onBulkComplete && selectedTasks.length > 0) {
      onBulkComplete(selectedTasks);
      setSelectedTasks([]);
    }
  };

  const handleBulkDelete = () => {
    if (onBulkDelete && selectedTasks.length > 0) {
      if (window.confirm(`Are you sure you want to delete ${selectedTasks.length} tasks?`)) {
        onBulkDelete(selectedTasks);
        setSelectedTasks([]);
      }
    }
  };

  const taskCategories = categories.map(c => c.name);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <TaskFiltersComponent
        filters={localFilters}
        onFiltersChange={setLocalFilters}
        taskCategories={taskCategories}
        selectedTasks={selectedTasks}
        onBulkComplete={handleBulkComplete}
        onBulkDelete={handleBulkDelete}
        canEdit={canEdit}
        canDelete={canDelete}
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
      />

      {/* Task Items */}
      <TaskItems
        tasks={tasks}
        onToggleComplete={onToggleComplete}
        onEdit={onEdit}
        onDelete={onDelete}
        canEdit={canEdit}
        canDelete={canDelete}
      />

      {tasks.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No tasks found.</p>
        </div>
      )}
    </div>
  );
};

export default TaskList;
