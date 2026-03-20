import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { CSVProductUpdateRow } from '@/utils/csvUpdateParser';
import { bulkUploadProductsAction } from '@/app/actions/products';
import { useBusiness } from '@/contexts/BusinessContext';

export interface ProductUpdateData {
  productId: string;
  itemNumber: string;
  updates: {
    name?: string;
    category?: string;
    quantity?: number;
    costPrice?: number;
    sellingPrice?: number;
    supplier?: string;
    description?: string;
    manufacturerBarcode?: string;
    barcode?: string;
  };
  quantityChange?: {
    oldQuantity: number;
    newQuantity: number;
  };
}

export const useProductCSVUpdate = (userId: string | undefined) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<{ current: number; total: number } | null>(null);
  const { toast } = useToast();
  const { currentBusiness } = useBusiness();
  const branchId = currentBusiness?.id;

  // Keep these for frontend preview/validation if needed
  const { products } = useProducts(userId, 10000);
  const { categories } = useCategories(userId);

  const validateUpdates = (
    updateRows: CSVProductUpdateRow[]
  ): { validUpdates: ProductUpdateData[]; errors: string[] } => {
    const validUpdates: ProductUpdateData[] = [];
    const errors: string[] = [];

    updateRows.forEach((row, index) => {
      const itemNumber = row['Item Number']?.trim();
      const paddedItemNumber = itemNumber?.padStart(4, '0');
      const product = products.find(p =>
        p.itemNumber === itemNumber || p.itemNumber === paddedItemNumber
      );

      if (!product) {
        errors.push(`Row ${index + 1}: Product with Item Number "${itemNumber}" not found`);
        return;
      }

      const updates: Partial<ProductUpdateData['updates']> = {};
      if (row['Name']?.trim() && row['Name'].trim() !== product.name) updates.name = row['Name'].trim();
      if (row['Category']?.trim() && row['Category'].trim() !== product.category) updates.category = row['Category'].trim();
      if (row['Quantity']?.trim() !== '' && !isNaN(Number(row['Quantity']))) {
        const newQuantity = Number(row['Quantity']);
        if (newQuantity !== product.quantity) updates.quantity = newQuantity;
      }
      if (row['Cost Price']?.trim() !== '' && !isNaN(Number(row['Cost Price']))) {
        const newPrice = Number(row['Cost Price']);
        if (Math.abs(newPrice - product.costPrice) > 0.001) updates.costPrice = newPrice;
      }
      if (row['Selling Price']?.trim() !== '' && !isNaN(Number(row['Selling Price']))) {
        const newPrice = Number(row['Selling Price']);
        if (Math.abs(newPrice - product.sellingPrice) > 0.001) updates.sellingPrice = newPrice;
      }
      if (row['Supplier']?.trim() && row['Supplier'].trim() !== (product.supplier || '')) updates.supplier = row['Supplier'].trim();
      if (row['Description']?.trim() && row['Description'].trim() !== (product.description || '')) updates.description = row['Description'].trim();
      if (row['Manufacturer Barcode']?.trim() !== undefined && row['Manufacturer Barcode'].trim() !== (product.manufacturerBarcode || '')) updates.manufacturerBarcode = row['Manufacturer Barcode'].trim();
      if (row['Barcode']?.trim() !== undefined && row['Barcode'].trim() !== (product.barcode || '')) updates.barcode = row['Barcode'].trim();

      if (Object.keys(updates).length > 0) {
        validUpdates.push({ productId: product.id, itemNumber: product.itemNumber, updates });
      }
    });

    return { validUpdates, errors };
  };

  const detectNewCategories = (updateRows: CSVProductUpdateRow[]): string[] => {
    const existingCategories = categories.map(cat => cat.name);
    const csvCategories = updateRows
      .map(row => row['Category']?.trim())
      .filter(category => category && category !== '');

    return [...new Set(csvCategories)].filter(category => !existingCategories.includes(category));
  };

  const bulkUpdateProducts = async (
    fileOrUpdateRows: File | CSVProductUpdateRow[],
    onProgress?: (current: number, total: number) => void
  ) => {
    setIsUpdating(true);
    
    try {
      if (fileOrUpdateRows instanceof File) {
        if (!branchId || !userId) throw new Error("Branch or User not identified");

        const formData = new FormData();
        formData.append('file', fileOrUpdateRows);
        formData.append('branch_id', branchId);
        formData.append('user_id', userId);

        onProgress?.(50, 100); // Mock halfway point for single request
        
        const result = await bulkUploadProductsAction(formData);

        if (result.success) {
          const { successCount, errors } = result.data;
          
          toast({
            title: "Bulk upload complete",
            description: `Successfully processed ${successCount} products.${errors.length > 0 ? ` Encountered ${errors.length} errors.` : ''}`,
            variant: errors.length > 0 ? "default" : "default"
          });

          return { 
            successCount, 
            failureCount: errors.length 
          };
        } else {
          throw new Error(result.error || "Failed to upload CSV");
        }
      } else {
        // Fallback for when rows are already parsed (though we should move everything to the File approach)
        throw new Error("Local iterative update is deprecated. Please pass a File object.");
      }

    } catch (error) {
      console.error('Bulk update failed:', error);
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "An error occurred during the update",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsUpdating(false);
      setUpdateProgress(null);
    }
  };

  return {
    isUpdating,
    updateProgress,
    validateUpdates,
    detectNewCategories,
    bulkUpdateProducts
  };
};