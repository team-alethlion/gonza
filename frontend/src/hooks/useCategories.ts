import { useCallback } from 'react';
import { ProductCategory } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useBusiness } from '@/contexts/BusinessContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getProductCategoriesAction,
  createProductCategoryAction,
  updateProductCategoryAction,
  deleteProductCategoryAction
} from '@/app/actions/products';

import { localDb } from '@/lib/dexie';

export const useCategories = (userId: string | undefined) => {
  const { toast } = useToast();
  const { currentBusiness } = useBusiness();
  const queryClient = useQueryClient();

  const queryKey = ['product_categories', currentBusiness?.id];

  // 🚀 REFACTORED: Use React Query for automatic caching and request de-duplication
  const { data: categories = [], isLoading, refetch } = useQuery<ProductCategory[]>({
    queryKey,
    queryFn: async () => {
      if (!currentBusiness?.id) return [];

      const result = await getProductCategoriesAction(currentBusiness.id);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch categories');
      }

      const formattedCategories: ProductCategory[] = result.data.map((item: any) => ({
        id: item.id,
        name: item.name,
        createdAt: item.createdAt ? new Date(item.createdAt) : (item.created_at ? new Date(item.created_at) : undefined)
      }));

      // Background Dexie sync
      if (formattedCategories.length > 0) {
        const cacheData = formattedCategories.map(c => ({
          ...c,
          type: 'product',
          locationId: currentBusiness.id as string,
        }));
        localDb.categories.where('[locationId+type]').equals([currentBusiness.id, 'product']).delete().then(() => {
            localDb.categories.bulkPut(cacheData as any);
        });
      }

      return formattedCategories;
    },
    enabled: !!currentBusiness?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createCategory = async (name: string) => {
    try {
      if (!userId || !currentBusiness?.id) return null;

      const result = await createProductCategoryAction(currentBusiness.id, userId, name);
      if (!result.success || !result.data) throw new Error(result.error);

      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Success", description: "Category created successfully" });
      return result.data;
    } catch (error) {
      console.error('Error creating category:', error);
      toast({ title: "Error", description: "Failed to create category.", variant: "destructive" });
      return null;
    }
  };

  const updateCategory = async (id: string, name: string) => {
    if (!currentBusiness?.id) return false;
    try {
      const result = await updateProductCategoryAction(id, currentBusiness.id, name);
      if (!result.success) throw new Error(result.error);

      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Success", description: "Category updated successfully" });
      return true;
    } catch (error) {
      console.error('Error updating category:', error);
      toast({ title: "Error", description: "Failed to update category.", variant: "destructive" });
      return false;
    }
  };

  const deleteCategory = async (id: string) => {
    if (!currentBusiness?.id) return false;
    try {
      const result = await deleteProductCategoryAction(id, currentBusiness.id);
      if (!result.success) {
        toast({ title: "Cannot delete category", description: result.error || "Failed to delete category.", variant: "destructive" });
        return false;
      }

      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Success", description: "Category deleted successfully" });
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({ title: "Error", description: "Failed to delete category.", variant: "destructive" });
      return false;
    }
  };

  return {
    categories,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    refetch
  };
};
