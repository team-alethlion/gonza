"use client";

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Clock, Repeat } from 'lucide-react';
import { Task } from '@/types/task';
import { format, isToday, isTomorrow, isPast, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}) => {
  const [isCompleting, setIsCompleting] = useState(false);

  const handleToggleComplete = async () => {
    setIsCompleting(true);
    await onToggleComplete(task.id);
    setIsCompleting(false);
  };

  const getDueDateDisplay = (dueDate: string) => {
    const date = new Date(dueDate);

    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isPast(date) && !isToday(date)) {
      const daysAgo = Math.abs(differenceInDays(new Date(), date));
      return `${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`;
    }

    const daysUntil = differenceInDays(date, new Date());
    if (daysUntil <= 7) {
      return `In ${daysUntil} day${daysUntil === 1 ? '' : 's'}`;
    }

    return format(date, 'MMM dd, yyyy');
  };

  const getDueDateColor = (dueDate: string) => {
    const date = new Date(dueDate);

    if (task.completed) return 'text-gray-500';
    if (isPast(date) && !isToday(date)) return 'text-red-500';
    if (isToday(date)) return 'text-orange-500';
    if (isTomorrow(date)) return 'text-yellow-500';

    return 'text-gray-600';
  };

  const getPriorityColor = (priority: string) => {
    if (task.completed) return 'border-gray-200';

    switch (priority) {
      case 'High': return 'border-red-300 bg-red-50';
      case 'Medium': return 'border-yellow-300 bg-yellow-50';
      case 'Low': return 'border-green-300 bg-green-50';
      default: return 'border-gray-200';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-700 hover:bg-red-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200';
      case 'Low': return 'bg-green-100 text-green-700 hover:bg-green-200';
      default: return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    }
  };

  const getRecurrenceDisplay = () => {
    if (!task.is_recurring || !task.recurrence_type) return null;

    const typeMap = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly'
    };

    return typeMap[task.recurrence_type];
  };

  return (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-md',
      getPriorityColor(task.priority),
      task.completed && 'opacity-75'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <Checkbox
            checked={task.completed}
            onCheckedChange={handleToggleComplete}
            disabled={isCompleting || !canEdit}
            className="mt-1"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className={cn(
                    'font-medium text-sm',
                    task.completed && 'line-through text-gray-500'
                  )}>
                    {task.title}
                  </h3>
                  {task.is_recurring && (
                    <Repeat className="w-3 h-3 text-blue-500" />
                  )}
                </div>

                {task.description && (
                  <p className={cn(
                    'text-xs text-gray-600 mt-1',
                    task.completed && 'text-gray-400'
                  )}>
                    {task.description}
                  </p>
                )}

                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant="secondary" className={getPriorityBadgeColor(task.priority)}>
                    {task.priority}
                  </Badge>

                  {task.category && (
                    <Badge variant="outline" className="text-xs">
                      {task.category}
                    </Badge>
                  )}

                  {task.is_recurring && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                      {getRecurrenceDisplay()}
                    </Badge>
                  )}

                  <div className={cn(
                    'flex items-center text-xs',
                    getDueDateColor(task.due_date)
                  )}>
                    <Clock className="w-3 h-3 mr-1" />
                    {getDueDateDisplay(task.due_date)}
                  </div>
                </div>

                {task.parent_task_id && (
                  <div className="mt-1">
                    <Badge variant="outline" className="text-xs bg-gray-50">
                      Instance #{task.recurrence_count}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-1 ml-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(task)}
                    className="h-7 w-7 p-0 hover:bg-gray-100"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                )}

                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(task.id)}
                    className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {task.reminder_enabled && task.reminder_time && (
          <div className="mt-2 flex items-center text-xs text-gray-500">
            <Clock className="w-3 h-3 mr-1" />
            Reminder at {task.reminder_time}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskCard;
