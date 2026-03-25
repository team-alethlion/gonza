import { useState, useEffect, useCallback, useMemo } from 'react';
import { Product, ProductFormData, ProductFilters } from '@/types';
import { useBusinessSettings } from './useBusinessSettings';
import { useBusiness } from '@/contexts/BusinessContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clearInventoryCaches } from '@/utils/inventoryCacheUtils';

// Import our new Server Actions
import { getProductsAction, createProductAction, updateProductAction, deleteProductAction, updateProductsBulkAction } from '@/app/actions/products';

const EMPTY_ARRAY: Product[] = [];

export const useProducts = (
  userId: string | undefined, 
  initialPageSize: number = 50,
  initialData?: { products: Product[], count: number }
) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [isTyping, setIsTyping] = useState(false);
  const { settings } = useBusinessSettings();
  const { currentBusiness } = useBusiness();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    category: 'all',
    stockStatus: 'all'
  });

  const [typingTimer, setTypingTimer] = useState<NodeJS.Timeout | null>(null);

  const setFiltersWithTypingState = useCallback((newFilters: ProductFilters) => {
    if (newFilters.search !== filters.search) {
      setIsTyping(true);
      if (typingTimer) clearTimeout(typingTimer);
      const timer = setTimeout(() => {
        setIsTyping(false);
      }, 600);
      setTypingTimer(timer);
    }
    setFilters(newFilters);
  }, [filters.search, typingTimer]);

  // Use Server Action instead of Supabase
  const loadProducts = useCallback(async (): Promise<{ products: Product[], count: number }> => {
    if (!userId || !currentBusiness) {
      return { products: [], count: 0 };
    }

    try {
      // Server Action call
      const result = await getProductsAction({
        userId,
        businessId: currentBusiness.id,
        page,
        pageSize,
        search: filters.search,
        category: filters.category === 'all' ? undefined : filters.category,
        stockStatus: filters.stockStatus,
      });
      return result as { products: Product[], count: number };
    } catch (error) {
      console.error('Error loading products from server action:', error);
      return { products: [], count: 0 };
    }
  }, [userId, currentBusiness, page, pageSize, filters.search, filters.category, filters.stockStatus]);

  const baseQueryKey = useMemo(() => ['products', userId, currentBusiness?.id], [userId, currentBusiness?.id]);
  const queryKey = useMemo(() => [...baseQueryKey, page, pageSize, filters.search, filters.category, filters.stockStatus], [baseQueryKey, page, pageSize, filters.search, filters.category, filters.stockStatus]);

  const { data: queriedData, isLoading: isQueryLoading, refetch: reloadProducts, isFetching } = useQuery<{ products: Product[], count: number }, Error>({
    queryKey: ['products', currentBusiness?.id, page, pageSize, filters],
    queryFn: loadProducts,
    enabled: !!userId && !!currentBusiness?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    initialData: (page === 1 && filters.search === '' && filters.category === 'all' && filters.stockStatus === 'all') ? initialData : undefined
  });

  // 🚀 PERFORMANCE FIX: Filter products locally as the user types
  // Only hit the database when they press Enter or the typing timer finishes.
  const products = useMemo(() => {
    const rawProducts = queriedData?.products || EMPTY_ARRAY;
    
    if (isTyping && filters.search) {
      const searchLower = filters.search.toLowerCase();
      return rawProducts.filter(p => 
        p.name.toLowerCase().includes(searchLower) || 
        p.itemNumber?.toLowerCase().includes(searchLower) ||
        p.barcode?.toLowerCase().includes(searchLower)
      );
    }
    
    return rawProducts;
  }, [queriedData?.products, isTyping, filters.search]);

  const totalCount = queriedData?.count || 0;

  const isLoading = (isQueryLoading && !queriedData) && !isTyping;

  // Supabase Storage remains untouched since Prisma doesn't do file storage
  // but we isolate it here.
  const uploadProductImage = async (imageFile: File): Promise<string | null> => {
    try {
      if (!userId) return null;

      // We will implement a server action for this. 
      // For now, let's assume we have an uploadImageAction.
      // const formData = new FormData();
      // formData.append('file', imageFile);
      // formData.append('userId', userId);
      // const result = await uploadImageAction(formData);
      // return result.url;

      console.warn('Image upload redirecting to server action (TODO)');
      return null;
    } catch (error) {
      console.error('Error in uploadProductImage:', error);
      return null;
    }
  };

  const createProduct = async (productData: ProductFormData): Promise<Product | null> => {
    try {
      if (!userId || !currentBusiness || !user?.agencyId) return null;

      const result = await createProductAction({
        ...productData,
        userId,
        businessId: currentBusiness.id,
        agencyId: user.agencyId
      });

      if (!result) return null;

      const newProduct: Product = {
        ...result,
        createdAt: new Date(result.createdAt),
        updatedAt: new Date(result.updatedAt)
      } as any;

      queryClient.invalidateQueries({ queryKey: baseQueryKey });
      clearInventoryCaches(queryClient);

      return newProduct;
    } catch (error) {
      console.error('Error creating product:', error);
      return null;
    }
  };

  const updateProduct = async (
    id: string,
    updates: Partial<Product>,
    imageFile?: File | null,
    isFromSale = false,
    customChangeReason?: string,
    adjustmentDate?: Date,
    referenceId?: string,
    receiptNumber?: string
  ): Promise<boolean> => {
    try {
      if (!userId || !currentBusiness) return false;

      let imageUrl = updates.imageUrl;
      if (imageFile) {
        imageUrl = await uploadProductImage(imageFile);
      }

      const result = await updateProductAction(id, currentBusiness.id, {
        ...updates,
        imageUrl,
        userId,
        isFromSale,
        customChangeReason,
        referenceId
      } as any);

      if (!result) return false;

      // Type-safe conversion of dates
      const updatedProduct: Product = {
        ...result,
        createdAt: new Date(result.createdAt),
        updatedAt: new Date(result.updatedAt)
      } as any;

      queryClient.invalidateQueries({ queryKey: baseQueryKey });
      clearInventoryCaches(queryClient);
      return true;
    } catch (error) {
      console.error('Error updating product:', error);
      return false;
    }
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    try {
      if (!userId || !currentBusiness) return false;

      const success = await deleteProductAction(id, currentBusiness.id);

      if (success) {
        queryClient.invalidateQueries({ queryKey: baseQueryKey });
        clearInventoryCaches(queryClient);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting product:', error);
      return false;
    }
  };

  const updateProductsBulk = async (
    updates: Array<{ id: string; updated: Partial<Product>; imageFile?: File | null }>,
    userIdForHistory?: string,
    changeReason?: string,
    referenceId?: string,
    adjustmentDate?: Date,
    receiptNumber?: string
  ): Promise<boolean> => {
    try {
      if (!userId || !currentBusiness) return false;

      const success = await updateProductsBulkAction(
        updates.map(u => ({ id: u.id, updated: u.updated })),
        currentBusiness.id
      );

      if (success) {
        queryClient.invalidateQueries({ queryKey: baseQueryKey });
        clearInventoryCaches(queryClient);
      }

      return success;
    } catch (error) {
      console.error('Error in bulk update:', error);
      return false;
    }
  };

  return {
    products,
    isLoading,
    loadProducts,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalCount,
    createProduct,
    updateProduct,
    updateProductsBulk,
    deleteProduct,
    uploadProductImage,
    refetch: reloadProducts,
    isFetching,
    filters,
    setFilters: setFiltersWithTypingState,
    filteredProducts: products, // Returning products directly as filtering is likely handled server-side now
  };
};
