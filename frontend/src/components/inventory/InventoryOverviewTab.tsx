"use client";

import React from "react";
import { TabsContent } from "@/components/ui/tabs";
import InventorySearchSection from "@/components/inventory/InventorySearchSection";
import StockLevelOverviewCard from "@/components/inventory/StockLevelOverviewCard";
import TopSellingProductsCard from "@/components/inventory/TopSellingProductsCard";
import { Product } from "@/types";

interface InventoryOverviewTabProps {
  products: Product[];
  filters: any;
  setFilters: (filters: any) => void;
  isMobile: boolean;
  isFetching: boolean;
  globalStats: any;
  topSellingProducts: any[];
  topSellingLoading?: boolean;
  period: any;
  setPeriod: (period: any) => void;
}

const InventoryOverviewTab: React.FC<InventoryOverviewTabProps> = ({
  products,
  filters,
  setFilters,
  isMobile,
  isFetching,
  globalStats,
  topSellingProducts,
  topSellingLoading,
  period,
  setPeriod
}) => {
  return (
    <TabsContent value="overview" className="space-y-4 md:space-y-6">
      {/* Isolated Search & Suggestions Component to reduce InventoryClient re-renders */}
      <InventorySearchSection 
        products={products}
        filters={filters}
        setFilters={setFilters}
        isMobile={isMobile}
        isFetching={isFetching}
      />

      {/* Stock Level Overview Chart */}
      <StockLevelOverviewCard 
        products={products} 
        totalInStockQty={globalStats?.totalInStockQty}
        totalLowStockQty={globalStats?.totalLowStockQty}
        totalMinLevelQty={globalStats?.totalMinLevelQty}
      />

      {/* Top Selling Products - Now powered by dedicated hook for reliability */}
      <TopSellingProductsCard
        topSellingProducts={Array.isArray(topSellingProducts) ? topSellingProducts : []}
        isLoading={topSellingLoading}
        period={period}
        onPeriodChange={setPeriod}
      />
    </TabsContent>
  );
};

// Memoize to prevent re-renders when other tabs or unrelated state in parent changes
export default React.memo(InventoryOverviewTab);
