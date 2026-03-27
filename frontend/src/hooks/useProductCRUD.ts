/* eslint-disable @typescript-eslint/no-explicit-any */
import { Product } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useBusiness } from '@/contexts/BusinessContext';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import {
  createProductAction,
  updateProductAction,
  deleteProductAction
} from '@/app/actions/products';

/**
 * Hook for Create, Read, Update, Delete operations on products using Prisma
 */
export const useProductCRUD = (
  userId: string | undefined,
  products: Product[],
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>,
  applyFilters: (products: Product[], filters: any) => Product[]
) => {
  const { toast } = useToast();
  const { currentBusiness } = useBusiness();
  const { logActivity } = useActivityLogger();

  const createProduct = async (productData: Partial<Product> & { createdAt?: Date }) => {
    try {
      if (!userId || !currentBusiness) {
        toast({
          title: "Error",
          description: "You must be logged in and have a business selected to create products",
          variant: "destructive"
        });
        return null;
      }

      if (!productData.name) {
        toast({
          title: "Error",
          description: "Product name is required",
          variant: "destructive"
        });
        return null;
      }

      const result = await createProductAction({
        ...productData,
        name: productData.name,
        userId,
        businessId: currentBusiness.id
      } as any);

      if (result.success && result.data) {
        // Correctly format dates before adding to state
        const newProduct: Product = {
          ...result.data,
          createdAt: new Date(result.data.createdAt),
          updatedAt: new Date(result.data.updatedAt)
        } as any;
        
        setProducts(prev => [newProduct, ...prev]);

        // Log activity
        await logActivity({
          activityType: 'CREATE',
          module: 'INVENTORY',
          entityType: 'product',
          entityId: newProduct.id,
          entityName: newProduct.name,
          description: `Created product "${newProduct.name}" with quantity: ${newProduct.quantity}`,
          metadata: {
            itemNumber: newProduct.itemNumber,
            category: newProduct.category,
            costPrice: newProduct.costPrice,
            sellingPrice: newProduct.sellingPrice,
            quantity: newProduct.quantity
          }
        });

        toast({
          title: "Success",
          description: `Product "${newProduct.name}" created successfully`,
        });

        return newProduct;
      }

      return null;
    } catch (error: any) {
      console.error('Error creating product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create product. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateProduct = async (
    productId: string,
    productData: Partial<Product> & { createdAt?: Date },
    referenceId?: string,
    isFromSale = false,
    customChangeReason?: string
  ) => {
    try {
      if (!userId || !currentBusiness) return false;

      const currentProduct = products.find(p => p.id === productId);

      const result = await updateProductAction(productId, currentBusiness.id, {
        ...productData,
        userId,
        customChangeReason,
        isFromSale,
        referenceId
      } as any);

      if (result.success) {
        // Update local state
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...productData } as Product : p));

        // Log activity
        await logActivity({
          activityType: 'UPDATE',
          module: 'INVENTORY',
          entityType: 'product',
          entityId: productId,
          entityName: productData.name || currentProduct?.name || 'Product',
          description: `Updated product "${productData.name || currentProduct?.name}"`,
          metadata: {
            changes: productData,
            previousQuantity: currentProduct?.quantity,
            newQuantity: productData.quantity
          }
        });

        return true;
      }

      return false;
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update product. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      if (!userId || !currentBusiness?.id) return false;

      const productToDelete = products.find(p => p.id === productId);

      const result = await deleteProductAction(productId, currentBusiness.id);

      if (result) {
        setProducts(prev => prev.filter(p => p.id !== productId));

        if (productToDelete) {
          await logActivity({
            activityType: 'DELETE',
            module: 'INVENTORY',
            entityType: 'product',
            entityId: productId,
            entityName: productToDelete.name,
            description: `Deleted product "${productToDelete.name}"`,
            metadata: {
              itemNumber: productToDelete.itemNumber,
              category: productToDelete.category,
              lastQuantity: productToDelete.quantity
            }
          });
        }

        toast({
          title: "Success",
          description: "Product deleted successfully",
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: "Failed to delete product. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    createProduct,
    updateProduct,
    deleteProduct
  };
};
