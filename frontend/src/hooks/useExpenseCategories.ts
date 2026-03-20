/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  getExpenseCategoriesAction,
  createExpenseCategoryAction,
  deleteExpenseCategoryAction,
  createDefaultExpenseCategoriesAction
} from '@/app/actions/finance';

export interface ExpenseCategory {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: Date;
}

const DEFAULT_CATEGORIES = [
  'Rent & Utilities',
  'Salaries & Wages',
  'Marketing & Advertising',
  'Office Supplies & Equipment',
  'Professional Services',
  'Cost of bringing Goods',
  'Delivery To Customer',
  'Insurance',
  'Licenses, Permits & Fees',
  'Software & Subscriptions',
  'Depreciation & Amortization',
  'Training & Development',
  'Communication',
  'Bank & Transaction Fees',
  'Miscellaneous'
];

import { localDb } from '@/lib/dexie';

export const useExpenseCategories = () => {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();

  // Load from Dexie cache on mount
  useEffect(() => {
    const loadFromCache = async () => {
      if (currentBusiness?.id && categories.length === 0) {
        const cached = await localDb.categories
          .where('[locationId+type]')
          .equals([currentBusiness.id, 'expense'])
          .toArray();
        
        if (cached && cached.length > 0) {
          console.log('[ExpenseCategories] Loaded from Dexie cache');
          setCategories(cached.map(c => ({
            ...c,
            createdAt: new Date(c.createdAt)
          })));
          setIsLoading(false);
        }
      }
    };
    loadFromCache();
  }, [currentBusiness?.id]);

  const loadCategories = useCallback(async () => {
    if (!currentBusiness?.id) {
      setCategories([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(categories.length === 0);
      const result = await getExpenseCategoriesAction(currentBusiness.id);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch categories');
      }

      const formattedCategories: ExpenseCategory[] = result.data.map((category: any) => ({
        ...category,
        createdAt: new Date(category.createdAt)
      }));

      if (formattedCategories.length === 0) {
        await createDefaultCategories();
        return;
      }

      // Update Dexie cache in the background
      if (formattedCategories.length > 0) {
        const cacheData = formattedCategories.map(c => ({
          ...c,
          type: 'expense',
          locationId: currentBusiness.id as string,
        }));
        await localDb.categories.where('[locationId+type]').equals([currentBusiness.id, 'expense']).delete();
        await localDb.categories.bulkPut(cacheData as any);
      }

      setCategories(formattedCategories);
    } catch (error) {
      console.error('Error loading expense categories:', error);
      toast({
        title: "Error",
        description: "Failed to load expense categories",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentBusiness?.id, toast]);

  const createDefaultCategories = async () => {
    if (!currentBusiness?.id || !user?.id) return;

    try {
      const result = await createDefaultExpenseCategoriesAction(user.id, currentBusiness.id, DEFAULT_CATEGORIES);
      if (result.success) {
        await loadCategories();
      }
    } catch (error) {
      console.error('Error creating default categories:', error);
    }
  };

  const createCategory = async (name: string) => {
    if (!currentBusiness?.id || !user?.id) return null;

    try {
      // Check if category already exists (case-insensitive)
      const existingCategory = categories.find(
        cat => cat.name.toLowerCase() === name.toLowerCase()
      );

      if (existingCategory) {
        toast({
          title: "Category exists",
          description: "This category already exists.",
        });
        return existingCategory;
      }

      const result = await createExpenseCategoryAction({
        userId: user.id,
        locationId: currentBusiness.id,
        name,
        isDefault: false
      });

      if (!result.success || !result.data) throw new Error(result.error);

      const newCategory: ExpenseCategory = {
        ...result.data,
        createdAt: new Date(result.data.createdAt)
      };

      setCategories(prev => [...prev, newCategory]);
      return newCategory;
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive"
      });
      return null;
    }
  };

  const deleteCategory = async (id: string) => {
    if (!currentBusiness?.id) return false;
    try {
      const result = await deleteExpenseCategoryAction(id, currentBusiness.id);
      if (!result.success) throw new Error(result.error);

      setCategories(prev => prev.filter(c => c.id !== id));
      toast({
        title: "Success",
        description: "Category deleted successfully"
      });
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return {
    categories,
    isLoading,
    createCategory,
    deleteCategory,
    refreshCategories: loadCategories
  };
};
