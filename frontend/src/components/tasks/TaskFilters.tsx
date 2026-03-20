"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { TaskFilters as TaskFiltersType } from '@/types/task';

interface TaskFiltersProps {
  filters: TaskFiltersType;
  onFiltersChange: (filters: TaskFiltersType) => void;
  taskCategories: string[];
  selectedTasks: string[];
  onBulkComplete: () => void;
  canEdit?: boolean;
}

const TaskFilters: React.FC<TaskFiltersProps> = ({
  filters,
  onFiltersChange,
  taskCategories,
  selectedTasks,
  onBulkComplete,
  canEdit = true,
}) => {
  return (
    <div className="bg-white p-4 rounded-lg border space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search tasks..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Select
          value={filters.status}
          onValueChange={(value: any) => onFiltersChange({ ...filters, status: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.priority}
          onValueChange={(value: any) => onFiltersChange({ ...filters, priority: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="High">High Priority</SelectItem>
            <SelectItem value="Medium">Medium Priority</SelectItem>
            <SelectItem value="Low">Low Priority</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.category}
          onValueChange={(value) => onFiltersChange({ ...filters, category: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="no-category">No Category</SelectItem>
            {taskCategories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedTasks.length > 0 && (
        <div className="flex items-center justify-between bg-blue-50 p-3 rounded-md">
          <span className="text-sm text-blue-700">
            {selectedTasks.length} task{selectedTasks.length === 1 ? '' : 's'} selected
          </span>
          {canEdit && (
            <Button onClick={onBulkComplete} size="sm">
              Mark as Complete
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskFilters;
