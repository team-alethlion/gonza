import { useState, useCallback } from 'react';
import { Task, CreateTaskData, UpdateTaskData } from '@/types/task';
import { isToday } from 'date-fns';

interface UseTaskPageLogicProps {
  tasks: Task[];
  createTask: (data: CreateTaskData) => Promise<Task | null>;
  updateTask: (id: string, updates: UpdateTaskData) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  toggleTaskCompletion: (id: string) => Promise<boolean>;
  bulkUpdateTasks: (taskIds: string[], updates: UpdateTaskData) => Promise<boolean>;
}

export const useTaskPageLogic = ({
  tasks,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskCompletion,
  bulkUpdateTasks,
}: UseTaskPageLogicProps) => {
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState('list');

  const todayTasks = tasks.filter(task => isToday(new Date(task.due_date)));
  const pendingTodayTasks = todayTasks.filter(task => !task.completed);

  const handleCreateTask = useCallback(() => {
    setEditingTask(null);
    setSelectedDate(null);
    setIsTaskFormOpen(true);
  }, []);

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setIsTaskFormOpen(true);
  }, []);

  const handleDeleteTask = useCallback(async (id: string): Promise<boolean> => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      return await deleteTask(id);
    }
    return false;
  }, [deleteTask]);

  const handleFormSubmit = useCallback(async (data: CreateTaskData) => {
    try {
      if (editingTask) {
        await updateTask(editingTask.id, data as UpdateTaskData);
      } else {
        await createTask(data);
      }
    } catch (error) {
      console.error('Error in handleFormSubmit:', error);
    }
  }, [editingTask, updateTask, createTask]);

  const handleBulkComplete = useCallback(async (taskIds: string[]): Promise<boolean> => {
    return await bulkUpdateTasks(taskIds, { 
      completed: true, 
      completed_at: new Date().toISOString() 
    });
  }, [bulkUpdateTasks]);

  const handleFormClose = useCallback(() => {
    setIsTaskFormOpen(false);
    setEditingTask(null);
    setSelectedDate(null);
  }, []);

  return {
    // State
    isTaskFormOpen,
    editingTask,
    selectedDate,
    activeTab,
    todayTasks,
    pendingTodayTasks,
    
    // Actions
    setActiveTab,
    handleCreateTask,
    handleEditTask,
    handleDeleteTask,
    handleFormSubmit,
    handleBulkComplete,
    handleFormClose,
    
    // Task operations
    toggleTaskCompletion,
  };
};