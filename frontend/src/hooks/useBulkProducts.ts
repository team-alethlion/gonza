
import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { ProductFormData } from '@/types';
import { toast } from 'sonner';

export const useBulkProducts = () => {
  const { user } = useAuth();
  const { createProduct } = useProducts(user?.id);
  const { categories, createCategory } = useCategories(user?.id);
  const [isUploading, setIsUploading] = useState(false);

  const createMissingCategories = async (productCategories: string[]) => {
    const existingCategoryNames = categories.map(cat => cat.name.toLowerCase());
    const uniqueCategories = [...new Set(productCategories.filter(cat => cat.trim() !== ''))];
    const missingCategories = uniqueCategories.filter(
      category => !existingCategoryNames.includes(category.toLowerCase())
    );

    const createdCategories: string[] = [];
    const failedCategories: string[] = [];

    for (const categoryName of missingCategories) {
      try {
        const result = await createCategory(categoryName);
        if (result) {
          createdCategories.push(categoryName);
        } else {
          failedCategories.push(categoryName);
        }
      } catch (error) {
        console.error(`Failed to create category ${categoryName}:`, error);
        failedCategories.push(categoryName);
      }
    }

    return { createdCategories, failedCategories };
  };

  const bulkCreateProducts = async (
    products: ProductFormData[], 
    progressCallback?: (current: number, total: number) => void
  ) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    setIsUploading(true);
    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    try {
      // Extract all categories from products
      const productCategories = products.map(p => p.category).filter((c): c is string => Boolean(c));
      
      // Create missing categories first
      if (productCategories.length > 0) {
        const { createdCategories, failedCategories } = await createMissingCategories(productCategories);
        
        if (createdCategories.length > 0) {
          toast.success(`Created ${createdCategories.length} new categories`);
        }
        
        if (failedCategories.length > 0) {
          toast.error(`Failed to create ${failedCategories.length} categories`);
        }
      }

      // Now create products with progress tracking
      for (let i = 0; i < products.length; i++) {
        const productData = products[i];
        
        try {
          const result = await createProduct(productData);
          if (result) {
            successCount++;
          } else {
            failureCount++;
            errors.push(`Failed to create product: ${productData.name}`);
          }
        } catch (error) {
          failureCount++;
          errors.push(`Error creating ${productData.name}: ${error}`);
          console.error(`Error creating product ${productData.name}:`, error);
        }
        
        // Update progress after each product
        if (progressCallback) {
          progressCallback(successCount + failureCount, products.length);
        }
      }

      // Show summary toast only if no progress callback (for regular usage)
      if (!progressCallback) {
        if (successCount > 0) {
          toast.success(`Successfully created ${successCount} products`);
        }
        
        if (failureCount > 0) {
          toast.error(`${failureCount} products failed to upload`);
        }
      }

      return { successCount, failureCount, errors };
    } finally {
      setIsUploading(false);
    }
  };

  const detectNewCategories = (products: ProductFormData[]): string[] => {
    const existingCategoryNames = categories.map(cat => cat.name.toLowerCase());
    const productCategories = products.map(p => p.category).filter((c): c is string => Boolean(c));
    const uniqueCategories = [...new Set(productCategories)];
    
    return uniqueCategories.filter(
      category => category && !existingCategoryNames.includes(category.toLowerCase())
    );
  };

  return {
    bulkCreateProducts,
    detectNewCategories,
    isUploading
  };
};
