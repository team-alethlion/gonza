"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useProducts } from "@/hooks/useProducts";
import { useStockHistory } from "@/hooks/useStockHistory";
import { useStockSummaryData } from "@/hooks/useStockSummaryData";
import { Product } from "@/types";
import { toast } from "sonner";
import ProductDetails from "@/components/inventory/ProductDetails";
import ProductStockHistory from "@/components/inventory/ProductStockHistory";

const ProductDetail = () => {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const { products, isLoading, loadProducts, refetch } = useProducts(
    user?.id,
    10000,
  ); // Load all products
  const [product, setProduct] = useState<Product | null>(null);
  const {
    stockHistory,
    isLoading: isLoadingHistory,
    refreshHistory: loadStockHistory,
    recalculateStockChain: recalculateProductStock,
    createStockHistoryEntry,
  } = useStockHistory(user?.id, id);
  const { clearAllLocationCaches } = useStockSummaryData({
    from: undefined,
    to: undefined,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadProductData = React.useCallback(async () => {
    if (id) {
      setIsRefreshing(true);
      const { data: refetchedData } = await refetch();
      const fetchedProducts = refetchedData?.products || [];

      const foundProduct = fetchedProducts.find((p: Product) => p.id === id);
      if (foundProduct) {
        setProduct(foundProduct);
      } else {
        toast.error("Product not found");
        router.push("/inventory");
      }

      setIsRefreshing(false);
    }
  }, [id, refetch, router]);

  // Handle stock update callback - refresh both product and stock history
  const handleStockUpdate = React.useCallback(async () => {
    await loadProductData();
    if (id && loadStockHistory) {
      await loadStockHistory();
    }
    setRefreshKey((prev) => prev + 1);
  }, [loadProductData, id, loadStockHistory]);

  // Stock history handlers
  const handleEditStockHistory = async (
    entryId: string,
    newQuantity: number,
    newReason: string,
    newDate?: Date,
  ) => {
    // Single entry update is not fully supported in the hook yet.
    // We would need a dedicated action for this. For now, returning false.
    console.warn(
      "Edit stock history entry is not yet implemented in the backend.",
    );
    toast.error("Editing history entries is not yet supported.");
    return false;
  };

  const handleDeleteStockHistory = async (entryId: string) => {
    // Single entry delete is not directly supported without reference id in the hook.
    // For now, warning the user.
    console.warn(
      "Delete stock history entry is not yet implemented in the backend.",
    );
    toast.error("Deleting history entries directly is not yet supported.");
    return false;
  };

  useEffect(() => {
    if (!isLoading && products.length > 0 && id) {
      const foundProduct = products.find((p) => p.id === id);

      if (foundProduct) {
        if (product?.id !== foundProduct.id) {
          const timer = setTimeout(() => {
            setProduct(foundProduct);
          }, 0);
          return () => clearTimeout(timer);
        }
      } else {
        toast.error("Product not found");
        router.push("/inventory");
      }
    }
  }, [id, products, isLoading, router, product?.id]);

  // Listen for stock updates from other components
  useEffect(() => {
    const handleStockUpdateEvent = () => {
      console.log("Stock updated, refreshing product data");
      handleStockUpdate();
    };

    window.addEventListener("stock-updated", handleStockUpdateEvent);

    return () => {
      window.removeEventListener("stock-updated", handleStockUpdateEvent);
    };
  }, [handleStockUpdate]);

  if (isLoading || isRefreshing || !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <img
          src="/lovable-uploads/7f7549a3-e9df-4762-b8b9-8e041e34f55d.png"
          alt="Loading"
          className="w-16 h-16 animate-spin"
        />
        <p className="text-muted-foreground">Loading product data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Product Details Section */}
      <ProductDetails
        key={`details-${refreshKey}`}
        product={product}
        stockHistory={stockHistory}
        isLoadingHistory={isLoadingHistory}
        onStockUpdate={handleStockUpdate}
      />

      {/* Stock History Section */}
      <ProductStockHistory
        key={`history-${refreshKey}`}
        stockHistory={stockHistory}
        isLoadingHistory={isLoadingHistory}
        onEditStockHistory={handleEditStockHistory}
        onDeleteStockHistory={handleDeleteStockHistory}
        products={products}
      />
    </div>
  );
};

export default ProductDetail;
