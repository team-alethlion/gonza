/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react';
import { Task, CreateTaskData, UpdateTaskData } from '@/types/task';
import { useAuth } from '@/components/auth/AuthProvider';
import { useBusiness } from '@/contexts/BusinessContext';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import {
  getTasksAction,
  createTaskAction,
  updateTaskAction,
  deleteTaskAction,
  bulkUpdateTasksAction,
  bulkDeleteTasksAction,
  getTaskStatsAction,
  CreateTaskInput
} from '@/app/actions/tasks';

/**
 * Hook for Task Summary & Aggregates (Overview Tab)
 */
export const useTaskSummary = (initialStats?: any) => {
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();
  const [filters, setFilters] = useState<any>({});

  const loadStats = useCallback(async (currentFilters?: any) => {
    if (!user?.id || !currentBusiness?.id) return null;
    const result = await getTaskStatsAction(user.id, currentBusiness.id, currentFilters);
    if (!result.success) return null;
    return result.data;
  }, [user?.id, currentBusiness?.id]);

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['tasks-summary', user?.id, currentBusiness?.id, JSON.stringify(filters)],
    queryFn: () => loadStats(filters),
    enabled: !!user?.id && !!currentBusiness?.id,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    initialData: (initialStats && Object.keys(filters).length === 0) ? initialStats : undefined
  });

  return {
    stats,
    isLoading,
    isError,
    filters,
    setFilters
  };
};

/**
 * Hook for Task List & CRUD (List Tab)
 */
export const useTasks = (initialData?: Task[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<any>({});
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();
  const { logActivity } = useActivityLogger();
  const queryClient = useQueryClient();
  const debouncedSearch = useDebounce(searchTerm, 300);

  const loadTasks = useCallback(async (currentFilters?: any): Promise<Task[]> => {
    if (!user?.id || !currentBusiness?.id) return [];

    try {
      const result = await getTasksAction(user.id, currentBusiness.id, currentFilters);
      if (!result.success || !result.data) throw new Error(result.error || 'Failed to fetch tasks');
      return result.data as Task[];
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error('Failed to load tasks');
      return [];
    }
  }, [user?.id, currentBusiness?.id]);

  // React Query caching
  const queryKey = ['tasks-list', user?.id, currentBusiness?.id, debouncedSearch, JSON.stringify(filters)];
  const { data: queriedTasks, isLoading: isQueryLoading } = useQuery({
    queryKey,
    queryFn: () => loadTasks({ search: debouncedSearch, ...filters }),
    enabled: !!user?.id && !!currentBusiness?.id,
    staleTime: 60_000,
    initialData: (initialData?.length && !debouncedSearch && Object.keys(filters).length === 0) ? initialData : undefined
  });

  const refreshTasks = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tasks-list'] });
    queryClient.invalidateQueries({ queryKey: ['tasks-summary'] });
  }, [queryClient]);

  const createTask = async (taskData: CreateTaskData): Promise<Task | null> => {
    if (!user?.id || !currentBusiness?.id) return null;

    try {
      const input: CreateTaskInput = {
        userId: user.id,
        locationId: currentBusiness.id,
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority as any,
        dueDate: new Date(taskData.due_date),
        category: taskData.category,
        reminderEnabled: taskData.reminder_enabled,
        reminderTime: taskData.reminder_time && taskData.reminder_time.trim() !== '' ? taskData.reminder_time : null,
        isRecurring: taskData.is_recurring,
        recurrenceType: taskData.recurrence_type as any,
        recurrenceEndDate: taskData.recurrence_end_date ? new Date(taskData.recurrence_end_date) : null
      };

      const result = await createTaskAction(input);
      if (!result.success || !result.data) throw new Error(result.error);

      const data = result.data as any;
      const newTask: Task = {
        ...data,
        user_id: data.userId,
        location_id: data.locationId,
        due_date: data.dueDate,
        completed_at: data.completedAt || null,
        created_at: data.createdAt,
        updated_at: data.updatedAt,
        reminder_enabled: data.reminderEnabled,
        reminder_time: data.reminderTime,
        is_recurring: data.isRecurring,
        recurrence_type: data.recurrenceType,
        recurrence_end_date: data.recurrenceEndDate || null,
        parent_task_id: data.parentTaskId,
        recurrence_count: data.recurrenceCount
      };

      // Optimistic update
      queryClient.setQueryData(queryKey, (old: Task[] | undefined) => old ? [newTask, ...old] : [newTask]);
      
      refreshTasks();

      logActivity({
        activityType: 'CREATE',
        module: 'TASKS',
        entityType: 'task',
        entityId: newTask.id,
        entityName: newTask.title,
        description: `Created task "${newTask.title}"`,
        metadata: newTask
      });

      toast.success('Task created successfully');
      return newTask;
    } catch (error: any) {
      toast.error(error.message || 'Failed to create task');
      return null;
    }
  };

  const updateTask = async (id: string, updates: UpdateTaskData): Promise<boolean> => {
    if (!user?.id) return false;

    // Optimistic Update
    const previousTasks = queryClient.getQueryData<Task[]>(queryKey);
    if (previousTasks) {
      const updatedTasks = previousTasks.map(t => 
        t.id === id ? { ...t, ...updates } : t
      );
      queryClient.setQueryData(queryKey, updatedTasks);
    }

    try {
      const serverUpdates: any = { ...updates };
      if (updates.due_date) serverUpdates.dueDate = new Date(updates.due_date);
      if (updates.completed_at) serverUpdates.completedAt = new Date(updates.completed_at);
      if (updates.recurrence_end_date) serverUpdates.recurrenceEndDate = new Date(updates.recurrence_end_date);

      const result = await updateTaskAction(id, user.id, serverUpdates);
      if (!result.success) throw new Error(result.error);

      refreshTasks();

      logActivity({
        activityType: 'UPDATE',
        module: 'TASKS',
        entityType: 'task',
        entityId: id,
        entityName: updates.title || 'Task',
        description: `Updated task "${updates.title || 'Task'}"`,
        metadata: updates
      });

      return true;
    } catch (error: any) {
      // Rollback on error
      if (previousTasks) {
        queryClient.setQueryData(queryKey, previousTasks);
      }
      console.error('Error updating task:', error);
      toast.error(error.message || 'Failed to update task');
      return false;
    }
  };

  const toggleTaskCompletion = async (id: string): Promise<boolean> => {
    const task = (queriedTasks || []).find(t => t.id === id);
    if (!task) return false;

    return await updateTask(id, {
      completed: !task.completed,
      completed_at: !task.completed ? new Date().toISOString() : null,
    });
  };

  const deleteTask = async (id: string): Promise<boolean> => {
    if (!user?.id) return false;
    try {
      const result = await deleteTaskAction(id, user.id);
      if (!result.success) throw new Error(result.error);

      // Optimistic delete
      queryClient.setQueryData(queryKey, (old: Task[] | undefined) => old ? old.filter(t => t.id !== id) : []);
      
      refreshTasks();

      logActivity({
        activityType: 'DELETE',
        module: 'TASKS',
        entityType: 'task',
        entityId: id,
        entityName: 'Task',
        description: `Deleted task #${id}`
      });

      toast.success('Task deleted successfully');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete task');
      return false;
    }
  };
const bulkUpdateTasks = async (taskIds: string[], updates: UpdateTaskData): Promise<boolean> => {
  if (!user?.id || taskIds.length === 0) return false;

  // Optimistic Update
  const previousTasks = queryClient.getQueryData<Task[]>(queryKey);
  if (previousTasks) {
    const updatedTasks = previousTasks.map(t => 
      taskIds.includes(t.id) ? { ...t, ...updates } : t
    );
    queryClient.setQueryData(queryKey, updatedTasks);
  }

  try {
    const result = await bulkUpdateTasksAction(taskIds, user.id, updates);
    if (!result.success) throw new Error(result.error);
    refreshTasks();
    toast.success(`Updated ${taskIds.length} tasks`);
    return true;
  } catch (error: any) {
    if (previousTasks) {
      queryClient.setQueryData(queryKey, previousTasks);
    }
    console.error('Error bulk updating tasks:', error);
    toast.error(error.message || 'Failed to update tasks');
    return false;
  }
};

const bulkDeleteTasks = async (taskIds: string[]): Promise<boolean> => {
  if (!user?.id || taskIds.length === 0) return false;

  // Optimistic Delete
  const previousTasks = queryClient.getQueryData<Task[]>(queryKey);
  if (previousTasks) {
    const remainingTasks = previousTasks.filter(t => !taskIds.includes(t.id));
    queryClient.setQueryData(queryKey, remainingTasks);
  }

  try {
    const result = await bulkDeleteTasksAction(taskIds, user.id);
    if (!result.success) throw new Error(result.error);
    refreshTasks();
    toast.success(`Deleted ${taskIds.length} tasks`);
    return true;
  } catch (error: any) {
    if (previousTasks) {
      queryClient.setQueryData(queryKey, previousTasks);
    }
    console.error('Error bulk deleting tasks:', error);
    toast.error(error.message || 'Failed to delete tasks');
    return false;
  }
};

  return {
    tasks: queriedTasks || [],
    isLoading: isQueryLoading && !queriedTasks,
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    bulkUpdateTasks,
    bulkDeleteTasks,
    refreshTasks,
  };
};
