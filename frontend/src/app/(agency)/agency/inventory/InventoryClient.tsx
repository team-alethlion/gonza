"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useBusiness } from "@/contexts/BusinessContext";
import { useProducts } from "@/hooks/useProducts";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import InventoryStats from "@/components/inventory/InventoryStats";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Product } from "@/types";
import SoldItemsTab from "@/components/inventory/SoldItemsTab";
import StockSummaryTab from "@/components/inventory/StockSummaryTab";
import CSVUploadDialog from "@/components/inventory/CSVUploadDialog";
import { useBulkProducts } from "@/hooks/useBulkProducts";
import { generateProductCSVTemplate } from "@/utils/csvTemplate";
import { useCategories } from "@/hooks/useCategories";
import { useProfiles, ProfileProvider } from "@/contexts/ProfileContext";
import BulkStockAddTab from "@/components/inventory/BulkStockAddTab";
import StockCountTab from "@/components/inventory/StockCountTab";
import RequisitionTab from "@/components/inventory/RequisitionTab";
import StockTransferTab from "@/components/inventory/StockTransferTab";
import InventoryPageSkeleton from "@/components/inventory/InventoryPageSkeleton";
import InventoryHeader from "@/components/inventory/InventoryHeader";
import TopSellingProductsCard from "@/components/inventory/TopSellingProductsCard";
import StockLevelOverviewCard from "@/components/inventory/StockLevelOverviewCard";
import { useQueryClient } from "@tanstack/react-query";
import { useGlobalInventoryStats } from "@/hooks/useGlobalInventoryStats";
import { useSoldItemsData } from "@/hooks/useSoldItemsData";
import InventorySearchSection from "@/components/inventory/InventorySearchSection";
import InventoryOverviewTab from "@/components/inventory/InventoryOverviewTab";
import InventoryTabsList from "@/components/inventory/InventoryTabsList";

const InventoryClient = ({
  initialProducts,
  initialCount,
  initialStats,
  initialTopSelling,
  initialProfiles,
}: {
  initialProducts?: Product[];
  initialCount?: number;
  initialStats?: any;
  initialTopSelling?: any[];
  initialProfiles?: any[];
}) => {
  const { user } = useAuth();
  const { currentBusiness, isLoading: businessLoading } = useBusiness();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { hasPermission } = useProfiles();

  const [activeTab, setActiveTab] = React.useState("overview");

  const {
    products,
    isLoading,
    isFetching,
    loadProducts,
    filters,
    setFilters,
    totalCount,
    refetch,
  } = useProducts(user?.id, 50, {
    products: initialProducts || [],
    count: initialCount || 0,
  });

  const { categories } = useCategories(user?.id);
  const { bulkCreateProducts } = useBulkProducts();

  // Add state for CSV upload dialog
  const [csvUploadOpen, setCsvUploadOpen] = React.useState(false);

  // Add state for period filtering
  const [period, setPeriod] = React.useState<
    | "today"
    | "yesterday"
    | "this-week"
    | "last-week"
    | "this-month"
    | "last-month"
    | "all-time"
  >("this-month");

  // Global stats hook
  const { data: globalStats, refetch: refetchGlobalStats } =
    useGlobalInventoryStats(currentBusiness?.id, initialStats);
  const queryClient = useQueryClient();

  // Use the working sold items data hook for the Top Selling Products
  const {
    soldItems: topSellingProducts,
    loadSoldItemsData: refetchSoldItems,
    isLoading: soldItemsLoading,
  } = useSoldItemsData(
    period,
    { from: undefined, to: undefined },
    undefined,
    false,
    initialTopSelling,
  );

  // Memoize handlers to prevent unnecessary re-renders
  const handleRefresh = useCallback(async () => {
    queryClient.invalidateQueries({ queryKey: ["inventory_global_stats"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["sold_items_report"] });

    await refetchGlobalStats();
    await refetch();

    toast({
      title: "Inventory refreshed",
      description:
        "Your inventory data and stats have been updated with fresh server data.",
    });
  }, [refetch, toast, refetchGlobalStats, queryClient]);

  // Add CSV template download handler
  const handleDownloadTemplate = React.useCallback(() => {
    generateProductCSVTemplate();
    toast({
      title: "Template downloaded",
      description: "CSV template has been downloaded to your device.",
    });
  }, [toast]);

  // Add CSV upload handler
  const handleCSVUpload = React.useCallback(
    async (products: any[]) => {
      try {
        await bulkCreateProducts(products);
        setCsvUploadOpen(false);
        await loadProducts();
      } catch (error) {
        console.error("CSV upload failed:", error);
        toast({
          title: "Upload failed",
          description:
            "There was an error uploading your products. Please try again.",
          variant: "destructive",
        });
      }
    },
    [bulkCreateProducts, loadProducts, toast],
  );

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (businessLoading || !currentBusiness || isLoading) {
    return <InventoryPageSkeleton />;
  }

  return (
    <div className="p-2 md:p-6 space-y-4 md:space-y-6 max-w-full">
      {/* Header Section */}
      <InventoryHeader
        isLoading={isLoading}
        onRefresh={handleRefresh}
        onDownloadTemplate={handleDownloadTemplate}
        onCSVUpload={() => setCsvUploadOpen(true)}
      />

      {/* CSV Upload Dialog */}
      <CSVUploadDialog
        open={csvUploadOpen}
        onOpenChange={setCsvUploadOpen}
        onUpload={handleCSVUpload}
        categories={categories.map((cat) => cat.name)}
      />

      {/* Stats Cards */}
      <InventoryStats
        products={products}
        totalCountOverride={globalStats?.totalCount !== undefined ? globalStats.totalCount : totalCount}
        totalCostValueOverride={globalStats?.totalCostValue}
        lowStockOverride={globalStats?.lowStockCount}
        outOfStockOverride={globalStats?.outOfStockCount}
        totalStockValueOverride={globalStats?.totalStockValue}
      />

      {/* Main Content with Tabs - Only render content structure when mounted to fix Radix ID mismatch */}
      {mounted ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 md:space-y-6">
          <InventoryTabsList 
            isMobile={isMobile}
            hasPermission={hasPermission}
          />

          {/* 🚀 PERFORMANCE: Conditional Rendering (Lazy Loading) for each tab content */}

          {activeTab === "overview" && (
            <InventoryOverviewTab
              products={products}
              filters={filters}
              setFilters={setFilters}
              isMobile={isMobile}
              isFetching={isFetching}
              globalStats={globalStats}
              topSellingProducts={topSellingProducts}
              topSellingLoading={soldItemsLoading}
              period={period}
              setPeriod={setPeriod}
            />
          )}

          {activeTab === "add-stock" && hasPermission("inventory", "stock_adjustment") && (
            <TabsContent value="add-stock">
              <BulkStockAddTab />
            </TabsContent>
          )}

          {activeTab === "stock-count" && hasPermission("inventory", "stock_adjustment") && (
            <TabsContent value="stock-count">
              <StockCountTab />
            </TabsContent>
          )}

          {activeTab === "transfer" && hasPermission("inventory", "stock_adjustment") && (
            <TabsContent value="transfer">
              <StockTransferTab />
            </TabsContent>
          )}

          {activeTab === "requisition" && (
            <TabsContent value="requisition">
              <RequisitionTab />
            </TabsContent>
          )}

          {activeTab === "sold-items" && (
            <TabsContent value="sold-items">
              <SoldItemsTab />
            </TabsContent>
          )}

          {activeTab === "stock-summary" && (
            <TabsContent value="stock-summary">
              <StockSummaryTab />
            </TabsContent>
          )}
        </Tabs>
      ) : (
        <div className="space-y-6">
           <div className="h-12 w-full bg-gray-50 animate-pulse rounded-md" />
           <div className="h-64 w-full bg-gray-50 animate-pulse rounded-md" />
        </div>
      )}
    </div>
  );

};
export default InventoryClient;
