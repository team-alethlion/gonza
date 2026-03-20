import { useState } from 'react';
import { Product } from '@/types';
import { useProducts } from './useProducts';
import { useBusiness } from '@/contexts/BusinessContext';

export const useSaleProductSelection = (userId: string | undefined) => {
  const { products } = useProducts(userId);
  const { currentBusiness } = useBusiness();
  const [selectedProducts, setSelectedProducts] = useState<Record<string, string | null>>({});

  const selectProduct = (itemIndex: number, productId: string | null) => {
    setSelectedProducts(prev => ({
      ...prev,
      [itemIndex]: productId
    }));
  };

  const getProductForItem = (itemIndex: number): Product | null => {
    const productId = selectedProducts[itemIndex];
    if (!productId) return null;

    return products.find(p => p.id === productId) || null;
  };

  return {
    products,
    selectedProducts,
    selectProduct,
    getProductForItem
  };
};
