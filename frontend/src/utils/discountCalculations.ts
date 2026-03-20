import { SaleItem } from '@/types';

/**
 * Calculate the actual amount for a sale item after applying discounts
 */
export const calculateItemActualAmount = (item: SaleItem): number => {
  const subtotal = item.price * item.quantity;
  
  let discountAmount = 0;
  
  // Handle cases where discountType is explicitly set
  if (item.discountType === 'amount') {
    discountAmount = Number(item.discountAmount) || 0;
  } else if (item.discountType === 'percentage') {
    const percentage = Number(item.discountPercentage) || 0;
    discountAmount = (subtotal * percentage) / 100;
  } 
  // Fallback: Infer discount type from available data (for legacy sales)
  else if (!item.discountType) {
    const percentage = Number(item.discountPercentage) || 0;
    const amount = Number(item.discountAmount) || 0;
    
    if (percentage > 0) {
      // Treat as percentage discount
      discountAmount = (subtotal * percentage) / 100;
    } else if (amount > 0) {
      // Treat as amount discount
      discountAmount = amount;
    }
  }
  
  return subtotal - discountAmount;
};

/**
 * Calculate the actual selling price per unit after discount
 */
export const calculateItemActualPrice = (item: SaleItem): number => {
  const actualAmount = calculateItemActualAmount(item);
  return actualAmount / item.quantity;
};