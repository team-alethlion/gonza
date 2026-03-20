"use client";

import React, { useState, useMemo } from 'react';
import { Task, TaskFilters } from '@/types/task';
import { useTaskCategories } from '@/hooks/useTaskCategories';
import TaskFiltersComponent from './TaskFilters';
import TaskItems from './TaskItems';

interface TaskListProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onBulkComplete?: (taskIds: string[]) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onToggleComplete,
  onEdit,
  onDelete,
  onBulkComplete,
  canEdit = true,
  canDelete = true,
}) => {
  const [filters, setFilters] = useState<TaskFilters>({
    status: 'all',
    priority: 'all',
    category: 'all',
    search: '',
  });
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const { categories } = useTaskCategories();

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Status filter
      if (filters.status === 'pending' && task.completed) return false;
      if (filters.status === 'completed' && !task.completed) return false;

      // Priority filter
      if (filters.priority !== 'all' && task.priority !== filters.priority) return false;

      // Category filter
      if (filters.category !== 'all') {
        if (filters.category === 'no-category' && task.category) return false;
        if (filters.category !== 'no-category' && task.category !== filters.category) return false;
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          task.title.toLowerCase().includes(searchLower) ||
          (task.description && task.description.toLowerCase().includes(searchLower))
        );
      }

      return true;
    });
  }, [tasks, filters]);

  const handleBulkComplete = () => {
    if (onBulkComplete && selectedTasks.length > 0) {
      onBulkComplete(selectedTasks);
      setSelectedTasks([]);
    }
  };

  const taskCategories = [...new Set(tasks.map(task => task.category).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <TaskFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        taskCategories={taskCategories as string[]}
        selectedTasks={selectedTasks}
        onBulkComplete={handleBulkComplete}
        canEdit={canEdit}
      />

      {/* Task Items */}
      <TaskItems
        tasks={filteredTasks}
        onToggleComplete={onToggleComplete}
        onEdit={onEdit}
        onDelete={onDelete}
        canEdit={canEdit}
        canDelete={canDelete}
      />

      {filteredTasks.length === 0 && tasks.length > 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No tasks match your current filters.</p>
        </div>
      )}
    </div>
  );
};

export default TaskList;
