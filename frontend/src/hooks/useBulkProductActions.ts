
import { useState } from 'react';
import { Product } from '@/types';
import { useProductCRUD } from './useProductCRUD';
import { useToast } from '@/hooks/use-toast';

export const useBulkProductActions = (
  userId: string | undefined,
  products: Product[],
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>,
  refreshProducts: () => void
) => {
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Create a dummy applyFilters function since we don't need filtering in bulk actions
  const dummyApplyFilters = (products: Product[]) => products;
  
  const { deleteProduct } = useProductCRUD(userId, products, setProducts, dummyApplyFilters);
  const { toast } = useToast();

  const selectedProducts = products.filter(product => selectedProductIds.has(product.id));

  const toggleProductSelection = (productId: string) => {
    const newSelection = new Set(selectedProductIds);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProductIds(newSelection);
  };

  const toggleAllProducts = (productIds: string[]) => {
    if (selectedProductIds.size === productIds.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(productIds));
    }
  };

  const clearSelection = () => {
    setSelectedProductIds(new Set());
  };

  const bulkDeleteProducts = async () => {
    if (selectedProducts.length === 0) return;

    setIsDeleting(true);
    let successCount = 0;
    let failureCount = 0;

    try {
      for (const product of selectedProducts) {
        try {
          const success = await deleteProduct(product.id);
          if (success) {
            successCount++;
          } else {
            failureCount++;
          }
        } catch (error) {
          failureCount++;
          console.error(`Error deleting product ${product.name}:`, error);
        }
      }

      // Clear selection after deletion
      clearSelection();

      // Show summary toast
      if (successCount > 0) {
        toast({
          title: "Products deleted",
          description: `Successfully deleted ${successCount} product${successCount > 1 ? 's' : ''}`,
        });
      }
      
      if (failureCount > 0) {
        toast({
          title: "Some deletions failed",
          description: `${failureCount} product${failureCount > 1 ? 's' : ''} could not be deleted`,
          variant: "destructive"
        });
      }

      // Refresh the products list
      refreshProducts();

    } finally {
      setIsDeleting(false);
    }
  };

  return {
    selectedProductIds,
    selectedProducts,
    toggleProductSelection,
    toggleAllProducts,
    clearSelection,
    bulkDeleteProducts,
    isDeleting
  };
};
