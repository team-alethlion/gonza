"use client";

import React, { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Task } from '@/types/task';
import { format, isSameDay, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import TaskCard from './TaskCard';

interface TaskCalendarProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

const TaskCalendar: React.FC<TaskCalendarProps> = ({
  tasks,
  onToggleComplete,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const tasksByDate = useMemo(() => {
    const grouped: { [key: string]: Task[] } = {};
    tasks.forEach(task => {
      const dateKey = format(new Date(task.due_date), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(task);
    });
    return grouped;
  }, [tasks]);

  const selectedDateTasks = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return tasksByDate[dateKey] || [];
  }, [tasksByDate, selectedDate]);

  const getDayTasks = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return tasksByDate[dateKey] || [];
  };

  const getDayIndicator = (date: Date) => {
    const dayTasks = getDayTasks(date);
    if (dayTasks.length === 0) return null;

    const completedCount = dayTasks.filter(task => task.completed).length;
    const totalCount = dayTasks.length;
    const pendingCount = totalCount - completedCount;

    const highPriorityCount = dayTasks.filter(task => task.priority === 'High' && !task.completed).length;

    return (
      <div className="flex items-center justify-center mt-1 space-x-1">
        {highPriorityCount > 0 && (
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
        )}
        {pendingCount > 0 && (
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
        )}
        {completedCount > 0 && (
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
        )}
      </div>
    );
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              {format(currentMonth, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="text-xs"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            className="w-full"
            components={{
              Day: ({ date, ...props }) => {
                const dayTasks = getDayTasks(date);
                const isSelected = isSameDay(date, selectedDate);

                return (
                  <div
                    className={`relative p-2 hover:bg-gray-50 cursor-pointer rounded-md ${isSelected ? 'bg-blue-100' : ''
                      }`}
                    onClick={() => handleDateSelect(date)}
                  >
                    <div className="text-center">
                      <span className={`text-sm ${isSelected ? 'font-bold' : ''}`}>
                        {format(date, 'd')}
                      </span>
                      {getDayIndicator(date)}
                    </div>
                  </div>
                );
              },
            }}
          />

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center space-x-4 text-xs text-gray-600">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span>High Priority</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Pending</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Completed</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            {format(selectedDate, 'MMM dd, yyyy')}
          </CardTitle>
          {selectedDateTasks.length > 0 && (
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">
                {selectedDateTasks.filter(task => !task.completed).length} pending
              </Badge>
              <Badge variant="secondary">
                {selectedDateTasks.filter(task => task.completed).length} completed
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {selectedDateTasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">
                No tasks for this date.
              </p>
              <p className="text-gray-400 text-xs mt-1">
                All clear! Time for a coffee break ☕
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selectedDateTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleComplete={onToggleComplete}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  canEdit={canEdit}
                  canDelete={canDelete}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TaskCalendar;
