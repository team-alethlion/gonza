import { useState, useEffect } from 'react';
import { Product } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useBusiness } from '@/contexts/BusinessContext';
import { getProductsAction } from '@/app/actions/products';

/**
 * Base hook for fetching and storing products using Prisma
 */
export const useProductsBase = (userId: string | undefined) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { currentBusiness } = useBusiness();

  const loadProducts = async () => {
    try {
      if (!userId || !currentBusiness) return;

      setIsLoading(true);
      const result = await getProductsAction({
        userId,
        businessId: currentBusiness.id,
        page: 1,
        pageSize: 1000, // Fetch all for base hook
      });

      setProducts(result.products as Product[]);
      return result.products as Product[];
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: "Error",
        description: "Failed to load products. Please try again.",
        variant: "destructive"
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [userId, currentBusiness?.id]);

  return {
    products,
    isLoading,
    setProducts,
    loadProducts
  };
};
