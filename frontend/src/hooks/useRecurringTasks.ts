import { useCallback } from 'react';
import { Task } from '@/types/task';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  // We'll use the server actions from tasks.ts
  updateTaskAction,
  deleteTaskAction
} from '@/app/actions/tasks';

/**
 * useRecurringTasks hook
 * Note: Most recurring logic has been moved to server actions in tasks.ts
 * for better consistency and performance.
 */
export const useRecurringTasks = () => {
  const { user } = useAuth();

  const createRecurringInstances = useCallback(async (task: Task) => {
    // In the new Prisma model, this is handled automatically during task creation or update
    // via the createTaskAction or updateTaskAction in src/app/actions/tasks.ts.
    // This hook is kept for backward compatibility but redirecting to server logic where needed.
    console.log('Recurring instances are now managed via server actions in tasks.ts');
  }, []);

  const deleteRecurringInstances = useCallback(async (parentTaskId: string) => {
    if (!user?.id) return;

    try {
      // In Prisma, we handle this as part of deleteTaskAction or updateTaskAction
      // If needed to be called standalone, we'd use a specific server action.
      // For now, ensuring the logic in tasks.ts covers the deletion of pending instances.
      const result = await deleteTaskAction(parentTaskId, user.id);
      if (!result.success) throw new Error(result.error);
    } catch (error) {
      console.error('Error deleting recurring task instances:', error);
      toast.error('Failed to delete recurring task instances');
    }
  }, [user?.id]);

  return {
    createRecurringInstances,
    deleteRecurringInstances,
  };
};
