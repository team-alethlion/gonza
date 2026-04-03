/* eslint-disable @typescript-eslint/no-explicit-any */
import { useBusiness } from '@/contexts/BusinessContext';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCustomerCategoriesAction,
  createCustomerCategoryAction,
  updateCustomerCategoryAction,
  deleteCustomerCategoryAction
} from '@/app/actions/customers';

export interface CustomerCategory {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

import { localDb } from '@/lib/dexie';

export const useCustomerCategories = () => {
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ['customer_categories', currentBusiness?.id];

  const { data: categories = [], isLoading, refetch } = useQuery<CustomerCategory[]>({
    queryKey,
    queryFn: async () => {
      if (!currentBusiness?.id) return [];

      const result = await getCustomerCategoriesAction(currentBusiness.id);
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch customer categories');
      }

      const fetched = result.data as CustomerCategory[];
      
      // Update Dexie cache in the background
      if (fetched.length > 0) {
        const cacheData = fetched.map((c: any) => ({
          ...c,
          type: 'customer',
          locationId: currentBusiness.id as string
        }));
        localDb.categories.where('[locationId+type]').equals([currentBusiness.id, 'customer']).delete().then(() => {
            localDb.categories.bulkPut(cacheData as any);
        });
      }
      
      return fetched;
    },
    enabled: !!currentBusiness?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
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
      const result = await createCustomerCategoryAction(currentBusiness.id, user.id, name);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey });
        toast({
          title: "Success",
          description: "Customer category created successfully",
        });
        return true;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error creating customer category:', error);
      toast({
        title: "Error",
        description: "Failed to create customer category",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateCategory = async (id: string, name: string) => {
    try {
      if (!currentBusiness) throw new Error("No business selected");
      const result = await updateCustomerCategoryAction(id, currentBusiness.id, name);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey });
        toast({
          title: "Success",
          description: "Customer category updated successfully",
        });
        return true;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error updating customer category:', error);
      toast({
        title: "Error",
        description: "Failed to update customer category",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      if (!currentBusiness) throw new Error("No business selected");
      const result = await deleteCustomerCategoryAction(id, currentBusiness.id);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey });
        toast({
          title: "Success",
          description: "Customer category deleted successfully",
        });
        return true;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error deleting customer category:', error);
      toast({
        title: "Error",
        description: "Failed to delete customer category",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    categories,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    refetch,
  };
};
