import { useState, useEffect } from 'react';
import { SalesCategory } from '@/types';
import { useBusiness } from '@/contexts/BusinessContext';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  getSalesCategoriesAction,
  createSalesCategoryAction,
  updateSalesCategoryAction,
  deleteSalesCategoryAction
} from '@/app/actions/sales';

export const useSalesCategories = () => {
  const [categories, setCategories] = useState<SalesCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();

  const fetchCategories = async () => {
    if (!currentBusiness) {
      setCategories([]);
      setIsLoading(false);
      return;
    }

    try {
      const result = await getSalesCategoriesAction(currentBusiness.id);
      if (result.success && result.data) {
        setCategories(result.data as any);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error fetching sales categories:', error);
      toast({
        title: "Error",
        description: "Failed to fetch sales categories",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [currentBusiness]);

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
        toast({
          title: "Success",
          description: "Sales category created successfully",
        });
        fetchCategories();
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
        toast({
          title: "Success",
          description: "Sales category updated successfully",
        });
        fetchCategories();
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
        toast({
          title: "Success",
          description: "Sales category deleted successfully",
        });
        fetchCategories();
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
      fetchCategories();
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
    refetch: fetchCategories,
  };
};