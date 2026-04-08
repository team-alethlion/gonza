import { useBusiness } from '@/contexts/BusinessContext';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getSalesCategoriesAction,
  createSalesCategoryAction,
  updateSalesCategoryAction,
  deleteSalesCategoryAction
} from '@/app/actions/sales';
import { localDb } from '@/lib/dexie';

export const useSalesCategories = (initialData?: SalesCategory[]) => {
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ['sales_categories', currentBusiness?.id];

  const { data: categories = [], isLoading, refetch } = useQuery<SalesCategory[]>({
    queryKey,
    queryFn: async () => {
      if (!currentBusiness?.id) return [];

      const result = await getSalesCategoriesAction(currentBusiness.id);
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch sales categories');
      }

      const fetched = result.data as SalesCategory[];
      
      // Update Dexie cache in the background
      if (fetched.length > 0) {
        const cacheData = fetched.map((c: any) => ({
          ...c,
          type: 'sale',
          locationId: currentBusiness.id as string
        }));
        localDb.categories.where('[locationId+type]').equals([currentBusiness.id, 'sale']).delete().then(() => {
            localDb.categories.bulkPut(cacheData as any);
        });
      }
      
      return fetched;
    },
    enabled: !!currentBusiness?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    initialData: initialData,
  });

  const createCategory = async (name: string) => {
    if (!currentBusiness || !user) {
      toast({
        title: "Error",
        description: "No business selected or user not authenticated",
        variant: "destructive",
      });
      return false;
    }

    try {
      const result = await createSalesCategoryAction(currentBusiness.id, user.id, name);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey });
        toast({
          title: "Success",
          description: "Sales category created successfully",
        });
        return true;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error creating sales category:', error);
      toast({
        title: "Error",
        description: "Failed to create sales category",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateCategory = async (id: string, name: string) => {
    try {
      const result = await updateSalesCategoryAction(id, name);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey });
        toast({
          title: "Success",
          description: "Sales category updated successfully",
        });
        return true;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error updating sales category:', error);
      toast({
        title: "Error",
        description: "Failed to update sales category",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const result = await deleteSalesCategoryAction(id);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey });
        toast({
          title: "Success",
          description: "Sales category deleted successfully",
        });
        return true;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error deleting sales category:', error);
      toast({
        title: "Error",
        description: "Failed to delete sales category",
        variant: "destructive",
      });
      return false;
    }
  };

  const createDefaultCategories = async () => {
    if (!currentBusiness || !user) return;

    const defaultCategories = ['Retail', 'Online', 'Wholesale'];

    try {
      for (const name of defaultCategories) {
        await createSalesCategoryAction(currentBusiness.id, user.id, name, true);
      }
      queryClient.invalidateQueries({ queryKey });
    } catch (error) {
      console.error('Error creating default categories:', error);
    }
  };

  return {
    categories,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    createDefaultCategories,
    refetch,
  };
};