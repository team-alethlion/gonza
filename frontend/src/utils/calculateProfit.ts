
/**
 * Calculate profit based on sale price, cost of production, and quantity
 */
export const calculateProfit = (
  salePrice: number,
  costOfProduction: number,
  quantity: number
): number => {
  return (salePrice * quantity) - (costOfProduction * quantity);
};
