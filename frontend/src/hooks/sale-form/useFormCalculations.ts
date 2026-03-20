import { useCallback } from 'react';
import { SaleItem } from '@/types';

interface UseFormCalculationsProps {
  taxRate: number;
}

export const useFormCalculations = ({ taxRate }: UseFormCalculationsProps) => {
  const calculateTotalAmount = useCallback((items: SaleItem[]): number => {
    return items.reduce((total, item) => {
      const subtotal = item.price * item.quantity;
      const discountAmount = item.discountType === 'amount' 
        ? (item.discountAmount || 0)
        : (subtotal * (item.discountPercentage || 0)) / 100;
      return total + (subtotal - discountAmount);
    }, 0);
  }, []);

  const calculateTaxAmount = useCallback((total: number): number => {
    return total * (taxRate / 100);
  }, [taxRate]);

  return {
    calculateTotalAmount,
    calculateTaxAmount,
  };
};