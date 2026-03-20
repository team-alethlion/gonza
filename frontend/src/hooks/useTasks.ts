import { useState, useEffect, useCallback } from 'react';
import { Task, CreateTaskData, UpdateTaskData } from '@/types/task';
import { useAuth } from '@/components/auth/AuthProvider';
import { useBusiness } from '@/contexts/BusinessContext';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getTasksAction,
  createTaskAction,
  updateTaskAction,
  deleteTaskAction,
  bulkUpdateTasksAction,
  CreateTaskInput
} from '@/app/actions/tasks';

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();
  const queryClient = useQueryClient();

  const loadTasks = useCallback(async (): Promise<Task[]> => {
    if (!user?.id || !currentBusiness?.id) {
      return [];
    }

    try {
      const result = await getTasksAction(user.id, currentBusiness.id);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch tasks');
      }

      return result.data as Task[];
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error('Failed to load tasks');
      return [];
    }
  }, [user?.id, currentBusiness?.id]);

  // React Query caching
  const queryKey = ['tasks', user?.id, currentBusiness?.id];
  const { data: queriedTasks, isLoading: isQueryLoading, isFetching } = useQuery({
    queryKey,
    queryFn: loadTasks,
    enabled: !!user?.id && !!currentBusiness?.id,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (queriedTasks) {
      setTasks(queriedTasks);
    }
  }, [queriedTasks]);

  // Derived loading state to prevent flash when background fetching
  const isLoading = isQueryLoading && !queriedTasks;

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

      if (!result.success || !result.data) {
        throw new Error(result.error);
      }

      const data = result.data as any;
      const newTask: Task = {
        ...data,
        user_id: data.userId,
        location_id: data.locationId,
        due_date: data.dueDate.toISOString().split('T')[0],
        completed_at: data.completedAt?.toISOString() || null,
        created_at: data.createdAt.toISOString(),
        updated_at: data.updatedAt.toISOString(),
        reminder_enabled: data.reminderEnabled,
        reminder_time: data.reminderTime,
        is_recurring: data.isRecurring,
        recurrence_type: data.recurrenceType,
        recurrence_end_date: data.recurrenceEndDate?.toISOString().split('T')[0] || null,
        parent_task_id: data.parentTaskId,
        recurrence_count: data.recurrenceCount
      };

      // Update local state and cache
      setTasks(prev => [newTask, ...prev]);
      queryClient.setQueryData(queryKey, (oldData: Task[] | undefined) => {
        return oldData ? [newTask, ...oldData] : [newTask];
      });

      queryClient.invalidateQueries({ queryKey });
      toast.success('Task created successfully');
      return newTask;
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
      return null;
    }
  };

  const updateTask = async (id: string, updates: UpdateTaskData): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      // Prepare updates for server action
      const serverUpdates: any = {
        ...updates,
      };

      if (updates.due_date) serverUpdates.dueDate = new Date(updates.due_date);
      if (updates.completed_at) serverUpdates.completedAt = new Date(updates.completed_at);
      if (updates.recurrence_end_date) serverUpdates.recurrenceEndDate = new Date(updates.recurrence_end_date);
      if (updates.is_recurring !== undefined) serverUpdates.isRecurring = updates.is_recurring;
      if (updates.recurrence_type) serverUpdates.recurrenceType = updates.recurrence_type;

      // Clean reminder_time
      if (updates.reminder_time !== undefined) {
        serverUpdates.reminderTime = (updates.reminder_time && updates.reminder_time.trim() !== '' ? updates.reminder_time : null);
      }

      const result = await updateTaskAction(id, user.id, serverUpdates);

      if (!result.success || !result.data) {
        throw new Error(result.error);
      }

      queryClient.invalidateQueries({ queryKey });
      return true;
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
      return false;
    }
  };

  const toggleTaskCompletion = async (id: string): Promise<boolean> => {
    const task = tasks.find(t => t.id === id);
    if (!task) return false;

    const updates: UpdateTaskData = {
      completed: !task.completed,
      completed_at: !task.completed ? new Date().toISOString() : null,
    };

    const success = await updateTask(id, updates);

    if (success) {
      if (!task.completed) {
        toast.success('Well done! 🎉 Task completed');
      } else {
        toast.success('Task marked as pending');
      }
    }

    return success;
  };

  const deleteTask = async (id: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const result = await deleteTaskAction(id, user.id);

      if (!result.success) throw new Error(result.error);

      queryClient.invalidateQueries({ queryKey });
      toast.success('Task deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
      return false;
    }
  };

  const bulkUpdateTasks = async (taskIds: string[], updates: UpdateTaskData): Promise<boolean> => {
    if (!user?.id || taskIds.length === 0) return false;

    try {
      // Map keys as in updateTask
      const serverUpdates: any = { ...updates };
      if (updates.completed !== undefined) serverUpdates.completed = updates.completed;
      if (updates.completed_at !== undefined) serverUpdates.completedAt = updates.completed_at ? new Date(updates.completed_at) : null;

      const result = await bulkUpdateTasksAction(taskIds, user.id, serverUpdates);

      if (!result.success) throw new Error(result.error);

      queryClient.invalidateQueries({ queryKey });
      toast.success(`Updated ${taskIds.length} tasks`);
      return true;
    } catch (error) {
      console.error('Error bulk updating tasks:', error);
      toast.error('Failed to update tasks');
      return false;
    }
  };

  const refreshTasks = () => {
    queryClient.invalidateQueries({ queryKey });
  };

  return {
    tasks,
    isLoading,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    bulkUpdateTasks,
    refreshTasks,
  };
};
