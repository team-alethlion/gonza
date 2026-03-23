"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useBusiness } from '@/contexts/BusinessContext';
import { useProducts } from '@/hooks/useProducts';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRouter } from 'next/navigation';
import InventoryStats from '@/components/inventory/InventoryStats';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProductSuggestionsPanel from '@/components/inventory/ProductSuggestionsPanel';
import { useProductSuggestions } from '@/hooks/useProductSuggestions';
import { Product } from '@/types';
import SoldItemsTab from '@/components/inventory/SoldItemsTab';
import StockSummaryTab from '@/components/inventory/StockSummaryTab';
import CSVUploadDialog from '@/components/inventory/CSVUploadDialog';
import { useBulkProducts } from '@/hooks/useBulkProducts';
import { generateProductCSVTemplate } from '@/utils/csvTemplate';
import { useCategories } from '@/hooks/useCategories';
import { useProfiles, ProfileProvider } from '@/contexts/ProfileContext';
import BulkStockAddTab from '@/components/inventory/BulkStockAddTab';
import StockCountTab from '@/components/inventory/StockCountTab';
import RequisitionTab from '@/components/inventory/RequisitionTab';
import StockTransferTab from '@/components/inventory/StockTransferTab';
import InventoryPageSkeleton from '@/components/inventory/InventoryPageSkeleton';
import InventoryHeader from '@/components/inventory/InventoryHeader';
import InventorySearchBar from '@/components/inventory/InventorySearchBar';
import TopSellingProductsCard from '@/components/inventory/TopSellingProductsCard';
import StockLevelOverviewCard from '@/components/inventory/StockLevelOverviewCard';
import { useSoldItemsData } from '@/hooks/useSoldItemsData';
import { useQueryClient } from '@tanstack/react-query';
import { useGlobalInventoryStats } from '@/hooks/useGlobalInventoryStats';




const InventoryClient = ({ 
  initialProducts, 
  initialCount,
  initialStats,
  initialTopSelling,
  initialProfiles
}: { 
  initialProducts?: Product[], 
  initialCount?: number,
  initialStats?: any,
  initialTopSelling?: any[],
  initialProfiles?: any[]
}) => {
  const { user } = useAuth();
  const { currentBusiness, isLoading: businessLoading } = useBusiness();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { hasPermission } = useProfiles();
  const router = useRouter();

  const {
    products,
    isLoading,
    isFetching,
    loadProducts,
    filters,
    setFilters,
    totalCount,
    refetch
  } = useProducts(user?.id, 50, { products: initialProducts || [], count: initialCount || 0 });

  const { categories } = useCategories(user?.id);
  const { bulkCreateProducts } = useBulkProducts();

  // Add state for CSV upload dialog
  const [csvUploadOpen, setCsvUploadOpen] = React.useState(false);

  // Add state for period filtering
  const [period, setPeriod] = React.useState<'today' | 'yesterday' | 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'all-time'>('this-month');

  // Add live search state for instant suggestions without triggering DB fetches
  const [liveSearch, setLiveSearch] = React.useState(filters.search || '');

  // Global stats hook
  const { data: globalStats, refetch: refetchGlobalStats } = useGlobalInventoryStats(currentBusiness?.id, initialStats);
  const queryClient = useQueryClient();

  // Sync live search when filters change (e.g. on mount or from storage)
  React.useEffect(() => {
    setLiveSearch(filters.search || '');
  }, [filters.search]);


  // Realtime product sync removed (Supabase-specific). Stats refresh handled by
  // manual refetch on handleRefresh and React Query stale-time settings.

  // Replace useInventoryData with backend-driven useSoldItemsData
  const { soldItems: topSellingProducts } = useSoldItemsData(
    period,
    { from: undefined, to: undefined },
    undefined,
    false,
    initialTopSelling
  );

  // Product suggestions hook - uses liveSearch for zero lag
  const {
    suggestions,
    isOpen: panelOpen,
    openPanel,
    closePanel
  } = useProductSuggestions(products, liveSearch);

  // Memoize handlers to prevent unnecessary re-renders
  const handleRefresh = useCallback(async () => {
    // Clear the specific new cache keys if we want to force EVERYTHING (optional with React Query but good for "Refresh" button)
    queryClient.invalidateQueries({ queryKey: ['inventory_global_stats'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });

    // Force immediate reload of global stats
    await refetchGlobalStats();

    // Reload products from server
    await refetch();

    toast({
      title: "Inventory refreshed",
      description: "Your inventory data and stats have been updated with fresh server data.",
    });
  }, [refetch, toast, refetchGlobalStats, queryClient]);


  // Memoize search input changes handler - updates only liveSearch for performance
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value;
    setLiveSearch(searchValue);

    // 🚀 PERFORMANCE: Don't trigger a database fetch while typing
    // Just show suggestions from the products we already have
    if (searchValue.length >= 1) {
      openPanel();
    } else {
      closePanel();
    }
  }, [openPanel, closePanel]);

  // Handle Enter key or final search submit
  const handleSearchSubmit = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value;
    setFilters({
      ...filters,
      search: searchValue
    });

    // Ensure panel is open if there's content
    if (searchValue.length > 0) {
      openPanel();
    }
  }, [filters, setFilters, openPanel]);

  // Handle product selection from suggestions - navigate to product details
  const handleProductSelect = (product: Product) => {
    // Update live search too so the input stays in sync if it re-renders
    setLiveSearch(product.name);
    router.push(`/inventory/${product.id}`);
    closePanel();
  };

  // Handle input focus for desktop search
  const handleSearchFocus = useCallback(() => {
    if (liveSearch) {
      openPanel();
    }
  }, [liveSearch, openPanel]);

  // Add CSV template download handler
  const handleDownloadTemplate = React.useCallback(() => {
    generateProductCSVTemplate();
    toast({
      title: "Template downloaded",
      description: "CSV template has been downloaded to your device.",
    });
  }, [toast]);

  // Add CSV upload handler
  const handleCSVUpload = React.useCallback(async (products: any[]) => {
    try {
      await bulkCreateProducts(products);
      setCsvUploadOpen(false);
      await loadProducts();
    } catch (error) {
      console.error('CSV upload failed:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your products. Please try again.",
        variant: "destructive"
      });
    }
  }, [bulkCreateProducts, loadProducts, toast]);

  if (businessLoading || !currentBusiness || isLoading) {
    return <InventoryPageSkeleton />;
  }

  return (
    <ProfileProvider initialProfiles={initialProfiles}>
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
        categories={categories.map(cat => cat.name)}
      />

      {/* Stats Cards */}
      <InventoryStats
        products={products}
        totalCountOverride={totalCount}
        totalCostValueOverride={globalStats?.totalCostValue}
        lowStockOverride={globalStats?.lowStockCount}
        outOfStockOverride={globalStats?.outOfStockCount}
        totalStockValueOverride={globalStats?.totalStockValue}
      />

      {/* Main Content with Tabs */}
      <Tabs defaultValue="overview" className="space-y-3 md:space-y-6">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-4 gap-1' : 'grid-cols-6'} h-auto p-1`}>
          <TabsTrigger value="overview" className="text-xs md:text-sm px-1 md:px-2 py-2 min-h-[44px]">
            {isMobile ? 'Overview' : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="requisition" className="text-xs md:text-sm px-1 md:px-2 py-2 min-h-[44px]">
            {isMobile ? 'Request' : 'Requisition'}
          </TabsTrigger>
          {hasPermission('inventory', 'stock_adjustment') && (
            <>
              <TabsTrigger value="add-stock" className="text-xs md:text-sm px-1 md:px-2 py-2 min-h-[44px]">
                {isMobile ? 'Restock' : 'Restock'}
              </TabsTrigger>
              <TabsTrigger value="stock-count" className="text-xs md:text-sm px-1 md:px-2 py-2 min-h-[44px]">
                {isMobile ? 'Count' : 'Stock Count'}
              </TabsTrigger>
              <TabsTrigger value="transfer" className="text-xs md:text-sm px-1 md:px-2 py-2 min-h-[44px]">
                {isMobile ? 'Transfer' : 'Stock Transfer'}
              </TabsTrigger>
            </>
          )}
          {!isMobile && (
            <>
              <TabsTrigger value="sold-items" className="text-xs md:text-sm px-1 md:px-2 py-2 min-h-[44px]">
                Items Sold
              </TabsTrigger>
              <TabsTrigger value="stock-summary" className="text-xs md:text-sm px-1 md:px-2 py-2 min-h-[44px]">
                Stock Summary
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Mobile: Additional tabs in dropdown or secondary row */}
        {isMobile && (
          <div className="flex gap-1 overflow-x-auto pb-2">
            <TabsList className="grid grid-cols-2 gap-1 w-auto min-w-fit p-1">
              <TabsTrigger value="sold-items" className="text-xs px-2 py-2 min-h-[44px] whitespace-nowrap">
                Items Sold
              </TabsTrigger>
              <TabsTrigger value="stock-summary" className="text-xs px-2 py-2 min-h-[44px] whitespace-nowrap">
                Stock Summary
              </TabsTrigger>
            </TabsList>
          </div>
        )}

        <TabsContent value="overview" className="space-y-4 md:space-y-6">
          {/* Search Bar with Local Suggestions */}
          <div className="relative">
            <InventorySearchBar
              filters={filters}
              setFilters={setFilters}
              products={products}
              onSearchChange={handleSearchChange}
              onSearchSubmit={handleSearchSubmit}
              onSearchFocus={handleSearchFocus}
            />

            {/* Mobile Suggestions Dropdown - Uses liveSearch for zero lag */}
            {isMobile && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1">
                <ProductSuggestionsPanel
                  suggestions={suggestions}
                  isOpen={panelOpen}
                  onClose={closePanel}
                  onSelectProduct={handleProductSelect}
                  searchTerm={liveSearch}
                  isLoading={isFetching}
                />
              </div>
            )}
          </div>

          {/* Stock Level Overview Chart */}
          <StockLevelOverviewCard products={products} />

          {/* Top Selling Products */}
          <TopSellingProductsCard
            topSellingProducts={topSellingProducts}
            period={period}
            onPeriodChange={setPeriod}
          />
        </TabsContent>

        {hasPermission('inventory', 'stock_adjustment') && (
          <>
            <TabsContent value="add-stock">
              <BulkStockAddTab />
            </TabsContent>

            <TabsContent value="stock-count">
              <StockCountTab />
            </TabsContent>

            <TabsContent value="transfer">
              <StockTransferTab />
            </TabsContent>
          </>
        )}

        <TabsContent value="requisition">
          <RequisitionTab />
        </TabsContent>

        <TabsContent value="sold-items">
          <SoldItemsTab />
        </TabsContent>

        <TabsContent value="stock-summary">
          <StockSummaryTab />
        </TabsContent>
      </Tabs>

      {/* Desktop Product Suggestions Panel - Uses liveSearch for zero lag */}
      {!isMobile && (
        <ProductSuggestionsPanel
          suggestions={suggestions}
          isOpen={panelOpen}
          onClose={closePanel}
          onSelectProduct={handleProductSelect}
          searchTerm={liveSearch}
          isLoading={isFetching}
        />
      )}
      </div>
      </ProfileProvider>
      );
      };
export default InventoryClient;
