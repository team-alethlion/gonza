import { useCallback } from 'react';
import { SaleFormData, SaleItem } from '@/types';

const emptyItem: SaleItem = {
  description: '',
  quantity: 1,
  price: 0,
  cost: 0,
};

interface UseItemManagementProps {
  formData: SaleFormData;
  setFormData: React.Dispatch<React.SetStateAction<SaleFormData>>;
}

export const useItemManagement = ({ formData, setFormData }: UseItemManagementProps) => {
  const handleAddItem = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ...emptyItem }]
    }));
  }, [setFormData]);

  const handleAddItemWithProduct = useCallback((product: any) => {
    setFormData(prev => {
      // Check if product already exists in items
      const existingItemIndex = prev.items.findIndex(item => item.productId === product.id);

      if (existingItemIndex !== -1) {
        const newItems = [...prev.items];
        newItems[existingItemIndex] = {
          ...newItems[existingItemIndex],
          quantity: newItems[existingItemIndex].quantity + 1
        };
        return { ...prev, items: newItems };
      }

      const newItem: SaleItem = {
        productId: product.id,
        description: product.name,
        quantity: 1,
        price: product.sellingPrice,
        cost: product.costPrice,
      };

      // If the first item is empty, replace it
      if (prev.items.length === 1 && !prev.items[0].description && !prev.items[0].productId) {
        return { ...prev, items: [newItem] };
      }

      return { ...prev, items: [...prev.items, newItem] };
    });
  }, [setFormData]);

  const handleUpdateItem = useCallback((index: number, updatedItem: SaleItem) => {
    setFormData(prev => {
      // If this item has a productId, check if it already exists in another row
      if (updatedItem.productId) {
        const existingItemIndex = prev.items.findIndex((item, i) =>
          i !== index && item.productId === updatedItem.productId
        );

        if (existingItemIndex !== -1) {
          // Duplicate found! Merge this item into the existing one
          const newItems = [...prev.items];
          const existingItem = newItems[existingItemIndex];

          newItems[existingItemIndex] = {
            ...existingItem,
            quantity: existingItem.quantity + updatedItem.quantity
          };

          // If there's more than one item, remove the current (duplicate) row
          if (newItems.length > 1) {
            newItems.splice(index, 1);
          } else {
            // If it's the only item (unlikely for a duplicate but safe), reset it
            newItems[index] = { ...emptyItem };
          }

          return { ...prev, items: newItems };
        }
      }

      const newItems = [...prev.items];
      newItems[index] = updatedItem;
      return { ...prev, items: newItems };
    });
  }, [setFormData]);

  const handleRemoveItem = useCallback((index: number) => {
    setFormData(prev => {
      if (prev.items.length === 1) return prev;
      const newItems = prev.items.filter((_, i) => i !== index);
      return { ...prev, items: newItems };
    });
  }, [setFormData]);

  return {
    handleAddItem,
    handleAddItemWithProduct,
    handleUpdateItem,
    handleRemoveItem,
  };
};