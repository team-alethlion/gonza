import { useState, useEffect, useRef } from 'react';
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
  
  // 🛡️ HYDRATION GUARD: Prevent multiple fetches if component re-renders quickly on mount
  const lastFetchRef = useRef<{businessId: string, time: number} | null>(null);

  const loadProducts = async () => {
    try {
      if (!userId || !currentBusiness?.id) return;

      const now = Date.now();
      // Skip if we fetched (or started fetching) for THIS business in the last 60 seconds
      if (
        lastFetchRef.current?.businessId === currentBusiness.id && 
        now - lastFetchRef.current.time < 60000
      ) {
        console.log(`[Products] Skipping fetch for ${currentBusiness.id}: Cache is fresh`);
        setIsLoading(false);
        return;
      }

      // 🛡️ Lock the guard IMMEDIATELY before starting the async work
      lastFetchRef.current = { businessId: currentBusiness.id, time: now };

      setIsLoading(true);
      const result = await getProductsAction({
        userId,
        businessId: currentBusiness.id,
        page: 1,
        pageSize: 1000, // Fetch all for base hook
      });

      setProducts(result.products as Product[]);
      lastFetchRef.current = { businessId: currentBusiness.id, time: Date.now() };
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
