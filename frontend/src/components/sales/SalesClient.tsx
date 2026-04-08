"use client";

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EmptySalesState from './EmptySalesState';
import SalesTableSkeleton from './SalesTableSkeleton';
import NoBusinessState from './NoBusinessState';
import SalesDataTable from './SalesDataTable';
import SalesReceiptDialog from './SalesReceiptDialog';
import SalesCategoryAnalysis from './SalesCategoryAnalysis';
import { DeletedSalesTable } from './DeletedSalesTable';
import { useSalesData } from '@/hooks/useSalesData';
import { useDeletedSales } from '@/hooks/useDeletedSales';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useBusiness } from '@/contexts/BusinessContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useSalesActions } from '@/hooks/useSalesActions';
import { RefreshCw, History, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { Sale, SalesCategory } from '@/types';

export const SalesClient = ({ 
  initialSales, 
  initialCategories = [] 
}: { 
  initialSales?: Sale[],
  initialCategories?: SalesCategory[]
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const { currentBusiness, isLoading: businessLoading } = useBusiness();
  const { settings } = useBusinessSettings();
  const { userId } = useCurrentUser();

  const {
    sales,
    isLoading: salesLoading,
    deleteSale,
    refetch,
    isFetching
  } = useSalesData(userId, 'desc', undefined, true, initialSales);

  const {
    deletedSales,
    isLoading: deletedLoading,
    refetch: refetchDeleted
  } = useDeletedSales();

  const {
    selectedSale,
    isReceiptDialogOpen,
    handleEditSale,
    handleViewReceipt,
    handleDeleteSale,
    handleCloseReceiptDialog
  } = useSalesActions();

  // Show loading while business context OR user ID is loading
  if (businessLoading || !userId) {
    return (
      <div className="p-6 space-y-6">
        <SalesTableSkeleton />
      </div>
    );
  }

  if (!currentBusiness) {
    return <NoBusinessState />;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: settings.currency || 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleRefresh = async () => {
    if (activeTab === 'deleted-sales') {
      await refetchDeleted();
    } else {
      await refetch();
    }
  };

  return (
    <>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Sales Management</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-2"
            disabled={isFetching || deletedLoading}
          >
            <RefreshCw className={`h-4 w-4 ${(isFetching || deletedLoading) ? 'animate-spin' : ''}`} />
            {(isFetching || deletedLoading) ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Sales Overview</TabsTrigger>
            <TabsTrigger value="analysis">Sales Source</TabsTrigger>
            <TabsTrigger value="deleted-sales" className="flex items-center gap-2 text-destructive data-[state=active]:text-destructive">
              <Trash2 className="h-4 w-4" />
              Deleted Sales
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            {salesLoading && !sales.length ? (
              <SalesTableSkeleton />
            ) : sales.length === 0 ? (
              <EmptySalesState />
            ) : (
              <SalesDataTable
                sales={sales}
                onViewReceipt={handleViewReceipt}
                onEditSale={handleEditSale}
                onDeleteSale={handleDeleteSale(deleteSale)}
                currency={settings.currency}
                isLoading={salesLoading}
                initialCategories={initialCategories}
              />
            )}
          </TabsContent>

          <TabsContent value="analysis" className="mt-6">
            <SalesCategoryAnalysis
              sales={sales}
              formatCurrency={formatCurrency}
              initialCategories={initialCategories}
            />
          </TabsContent>

          <TabsContent value="deleted-sales" className="mt-6">
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-muted-foreground" />
                  Deleted Sales History
                </h3>
                <p className="text-sm text-muted-foreground">
                  View and manage recently deleted sales records.
                </p>
              </div>
              <DeletedSalesTable
                sales={deletedSales}
                isLoading={deletedLoading}
                currency={settings.currency}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <SalesReceiptDialog
        selectedSale={selectedSale}
        isOpen={isReceiptDialogOpen}
        onOpenChange={handleCloseReceiptDialog}
        currency={settings.currency}
      />
    </>
  );
};
