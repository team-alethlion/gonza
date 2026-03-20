import { useState, useEffect } from 'react';
import { TaskCategory } from '@/types/task';
import { useAuth } from '@/components/auth/AuthProvider';
import { useBusiness } from '@/contexts/BusinessContext';
import { toast } from 'sonner';
import {
  getTaskCategoriesAction,
  createTaskCategoryAction,
  updateTaskCategoryAction,
  deleteTaskCategoryAction,
  createDefaultTaskCategoriesAction
} from '@/app/actions/tasks';

import { localDb } from '@/lib/dexie';

export const useTaskCategories = () => {
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();

  // Load from Dexie cache on mount
  useEffect(() => {
    const loadFromCache = async () => {
      if (currentBusiness?.id && categories.length === 0) {
        const cached = await localDb.categories
          .where('[locationId+type]')
          .equals([currentBusiness.id, 'task'])
          .toArray();
        
        if (cached && cached.length > 0) {
          console.log('[TaskCategories] Loaded from Dexie cache');
          setCategories(cached);
          setIsLoading(false);
        }
      }
    };
    loadFromCache();
  }, [currentBusiness?.id]);

  const loadCategories = async () => {
    if (!user?.id || !currentBusiness?.id) {
      setCategories([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(categories.length === 0);
      const result = await getTaskCategoriesAction(user.id, currentBusiness.id);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch categories');
      }

      const fetched = result.data as any[];
      
      // Update Dexie cache in the background
      if (fetched.length > 0) {
        const cacheData = fetched.map((c: any) => ({
          ...c,
          type: 'task',
          locationId: currentBusiness.id as string
        }));
        await localDb.categories.where('[locationId+type]').equals([currentBusiness.id, 'task']).delete();
        await localDb.categories.bulkPut(cacheData as any);
      }

      setCategories(fetched);
    } catch (error) {
      console.error('Error loading task categories:', error);
      toast.error('Failed to load task categories');
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const createCategory = async (name: string): Promise<TaskCategory | null> => {
    if (!user?.id || !currentBusiness?.id) return null;

    try {
      const result = await createTaskCategoryAction(user.id, currentBusiness.id, name.trim());

      if (!result.success || !result.data) {
        throw new Error(result.error);
      }

      const data = result.data as any;
      const newCategory: TaskCategory = {
        ...data,
        user_id: data.userId,
        location_id: data.locationId,
        created_at: data.createdAt.toISOString(),
        updated_at: data.updatedAt.toISOString()
      };

      setCategories(prev => [...prev, newCategory]);
      toast.success('Category created successfully');
      return newCategory;
    } catch (error) {
      console.error('Error creating task category:', error);
      toast.error('Failed to create category');
      return null;
    }
  };

  const updateCategory = async (id: string, name: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const result = await updateTaskCategoryAction(id, user.id, name.trim());

      if (!result.success) throw new Error(result.error);

      setCategories(prev =>
        prev.map(cat => (cat.id === id ? { ...cat, name: name.trim() } : cat))
      );
      toast.success('Category updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating task category:', error);
      toast.error('Failed to update category');
      return false;
    }
  };

  const deleteCategory = async (id: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const result = await deleteTaskCategoryAction(id, user.id);

      if (!result.success) throw new Error(result.error);

      setCategories(prev => prev.filter(cat => cat.id !== id));
      toast.success('Category deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting task category:', error);
      toast.error('Failed to delete category');
      return false;
    }
  };

  const createDefaultCategories = async () => {
    if (!user?.id || !currentBusiness?.id) return;

    try {
      const result = await createDefaultTaskCategoriesAction(user.id, currentBusiness.id);

      if (!result.success) throw new Error(result.error);

      // Refresh to get the new categories
      await loadCategories();
    } catch (error) {
      console.error('Error creating default categories:', error);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [user?.id, currentBusiness?.id]);

  return {
    categories,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    createDefaultCategories,
    refreshCategories: loadCategories,
  };
};
