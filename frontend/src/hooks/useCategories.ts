import { useState, useEffect, useCallback } from 'react';
import { ProductCategory } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useBusiness } from '@/contexts/BusinessContext';
import {
  getProductCategoriesAction,
  createProductCategoryAction,
  updateProductCategoryAction,
  deleteProductCategoryAction
} from '@/app/actions/products';

import { localDb } from '@/lib/dexie';

export const useCategories = (userId: string | undefined) => {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { currentBusiness } = useBusiness();

  // Load from Dexie cache on mount
  useEffect(() => {
    const loadFromCache = async () => {
      if (currentBusiness?.id && categories.length === 0) {
        const cached = await localDb.categories
          .where('[locationId+type]')
          .equals([currentBusiness.id, 'product'])
          .toArray();
        
        if (cached && cached.length > 0) {
          console.log('[Categories] Loaded from Dexie cache');
          setCategories(cached.map(c => ({
            ...c,
            createdAt: c.createdAt ? new Date(c.createdAt) : undefined
          })));
          setIsLoading(false);
        }
      }
    };
    loadFromCache();
  }, [currentBusiness?.id]);

  const loadCategories = useCallback(async () => {
    try {
      if (!currentBusiness?.id) {
        setCategories([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(categories.length === 0);
      const result = await getProductCategoriesAction(currentBusiness.id);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch categories');
      }

      const formattedCategories: ProductCategory[] = result.data.map((item: any) => ({
        id: item.id,
        name: item.name,
        createdAt: item.createdAt ? new Date(item.createdAt) : (item.created_at ? new Date(item.created_at) : undefined)
      }));

      // Update Dexie cache in the background
      if (formattedCategories.length > 0) {
        const cacheData = formattedCategories.map(c => ({
          ...c,
          type: 'product',
          locationId: currentBusiness.id as string,
        }));
        await localDb.categories.where('[locationId+type]').equals([currentBusiness.id, 'product']).delete();
        await localDb.categories.bulkPut(cacheData as any);
      }

      setCategories(formattedCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: "Error",
        description: "Failed to load product categories.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentBusiness?.id, toast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const createCategory = async (name: string) => {
    try {
      if (!userId || !currentBusiness?.id) return null;

      // Check if category already exists
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

      const result = await createProductCategoryAction(currentBusiness.id, userId, name);

      if (!result.success || !result.data) throw new Error(result.error);

      const newCategory: ProductCategory = {
        id: result.data.id,
        name: result.data.name,
        createdAt: new Date(result.data.createdAt)
      };

      setCategories(prev => [...prev, newCategory]);
      toast({
        title: "Success",
        description: "Category created successfully"
      });
      return newCategory;
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: "Error",
        description: "Failed to create category.",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateCategory = async (id: string, name: string) => {
    if (!currentBusiness?.id) return false;

    try {
      // Check if another category with this name exists
      const existingCategory = categories.find(
        cat => cat.name.toLowerCase() === name.toLowerCase() && cat.id !== id
      );

      if (existingCategory) {
        toast({
          title: "Category exists",
          description: "Another category with this name already exists.",
        });
        return false;
      }

      const result = await updateProductCategoryAction(id, currentBusiness.id, name);

      if (!result.success) throw new Error(result.error);

      setCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c));
      toast({
        title: "Success",
        description: "Category updated successfully"
      });
      return true;
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "Failed to update category.",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteCategory = async (id: string) => {
    if (!currentBusiness?.id) return false;
    try {
      const result = await deleteProductCategoryAction(id, currentBusiness.id);

      if (!result.success) {
        toast({
          title: "Cannot delete category",
          description: result.error || "Failed to delete category.",
          variant: "destructive"
        });
        return false;
      }

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
        description: "Failed to delete category.",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    categories,
    isLoading,
    loadCategories,
    createCategory,
    updateCategory,
    deleteCategory
  };
};
