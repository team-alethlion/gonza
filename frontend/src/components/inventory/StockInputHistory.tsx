"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getActivityByEntityIdsAction, updateStockHistoryDatesAction } from '@/app/actions/inventory';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { History, Edit, Trash2, Search } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useStockHistory } from '@/hooks/useStockHistory';
import { useProducts } from '@/hooks/useProducts';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useStockSummaryData } from '@/hooks/useStockSummaryData';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { getDateRangeFromFilter } from '@/utils/dateFilters';
import StockHistoryDateFilter from './StockHistoryDateFilter';
import EditStockHistoryDialog from './EditStockHistoryDialog';
import { EditGroupDateDialog } from './EditGroupDateDialog';
import DeleteStockHistoryDialog from './DeleteStockHistoryDialog';
import { DeleteInvoiceDialog } from './DeleteInvoiceDialog';
import { StockHistoryEntry } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFinancialVisibility } from '@/hooks/useFinancialVisibility';

const StockInputHistory = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { stockHistory, isLoading, updateStockHistoryEntry, deleteStockHistoryEntry, deleteMultipleStockHistoryEntries, recalculateProductStock, loadStockHistory } = useStockHistory(user?.id);
  const { products, loadProducts } = useProducts(user?.id, 10000);
  const { settings } = useBusinessSettings();
  const { clearAllLocationCaches } = useStockSummaryData({ from: undefined, to: undefined });
  const { formatFinancial, canViewCostPrice } = useFinancialVisibility();

  const [dateFilter, setDateFilter] = useState<string>('this-month');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');
  const [editHistoryDialog, setEditHistoryDialog] = useState<{ open: boolean; entry: StockHistoryEntry | null }>({ open: false, entry: null });
  const [editGroupDateDialog, setEditGroupDateDialog] = useState<{ open: boolean; group: { date: Date; entries: StockHistoryEntry[]; supplier?: string; invoice?: string } | null }>({ open: false, group: null });
  const [deleteHistoryDialog, setDeleteHistoryDialog] = useState<{ open: boolean; entry: StockHistoryEntry | null }>({ open: false, entry: null });
  const [deleteInvoiceDialog, setDeleteInvoiceDialog] = useState<{ open: boolean; group: { supplier: string; invoice: string; entries: StockHistoryEntry[] } | null }>({ open: false, group: null });
  const [scavengedNames, setScavengedNames] = useState<Record<string, string>>({});
  const [isScavenging, setIsScavenging] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'NGN': '₦',
      'GHS': '₵',
      'KES': 'KSh',
      'ZAR': 'R',
      'EGP': 'E£'
    };
    return symbols[currency] || currency;
  };

  const currencySymbol = getCurrencySymbol(settings.currency);

  useEffect(() => {
    const handleStockHistoryUpdate = () => {
      loadStockHistory();
    };

    window.addEventListener('stock-history-updated', handleStockHistoryUpdate);

    return () => {
      window.removeEventListener('stock-history-updated', handleStockHistoryUpdate);
    };
  }, [loadStockHistory]);

  useEffect(() => {
    const scavengeNames = async () => {
      if (!stockHistory.length || products.length === 0 || isScavenging) return;

      const missingProductIds = Array.from(new Set(
        stockHistory
          .map(entry => entry.productId)
          .filter(id => {
            if (!id) return false;
            const exists = products.some(p => p.id === id || p.itemNumber === id);
            return !exists && !scavengedNames[id];
          })
      ));

      if (missingProductIds.length === 0) return;

      setIsScavenging(true);
      try {
        // Fetch entity names from activity history via server action
        const result = await getActivityByEntityIdsAction(missingProductIds);
        const newNames: Record<string, string> = { ...scavengedNames };

        if (result.success && result.data) {
          result.data.forEach((item: any) => {
            if (item.entityId && item.entityName && !newNames[item.entityId]) {
              newNames[item.entityId] = item.entityName;
            }
          });
        }

        if (Object.keys(newNames).length > Object.keys(scavengedNames).length) {
          setScavengedNames(newNames);
        }
      } catch (err) {
        console.error('Error scavenging names:', err);
      } finally {
        setIsScavenging(false);
      }
    };

    scavengeNames();
  }, [stockHistory, products, isScavenging, scavengedNames]);

  const formatNumber = (num: number) => {
    return parseFloat(num.toFixed(5)).toLocaleString();
  };

  const dateRange = dateFilter === 'all' ? null : getDateRangeFromFilter(dateFilter);

  const { filteredBulkGroups, filteredRegularGroups } = useMemo(() => {
    try {
      if (isLoading || !stockHistory.length) {
        return { filteredBulkGroups: [], filteredRegularGroups: [] };
      }

      const filteredHistory = stockHistory.filter(entry => {
        try {
          const entryDate = new Date(entry.createdAt);
          let isInDateRange = true;

          if (dateRange) {
            isInDateRange = entryDate >= dateRange.from && entryDate <= dateRange.to;
          }

          return isInDateRange && entry.newQuantity > entry.oldQuantity;
        } catch {
          return false;
        }
      });

      const bulkStockAdditions = filteredHistory.filter(entry => {
        const reason = entry.changeReason?.toLowerCase() || '';
        return reason.includes('purchase:') ||
          reason.includes('invoice:') ||
          reason.includes('supplier:') ||
          reason.includes('session:');
      });

      const regularStockAdditions = filteredHistory.filter(entry => {
        const reason = entry.changeReason?.toLowerCase() || '';
        return !reason.includes('purchase:') &&
          !reason.includes('invoice:') &&
          !reason.includes('supplier:') &&
          !reason.includes('session:');
      });

      const groupedBulkHistory = bulkStockAdditions.reduce((groups, entry) => {
        try {
          const sessionMatch = entry.changeReason?.match(/Session: (\d+)/);
          const sessionId = sessionMatch ? sessionMatch[1] : entry.createdAt.toString();

          if (!groups[sessionId]) {
            const supplierMatch = entry.changeReason?.match(/Purchase: ([^|]+)/);
            const invoiceMatch = entry.changeReason?.match(/Invoice: ([^|]+)/);

            groups[sessionId] = {
              date: entry.createdAt,
              sessionId,
              supplier: supplierMatch ? supplierMatch[1].trim() : 'Unknown Supplier',
              invoice: invoiceMatch ? invoiceMatch[1].trim() : 'N/A',
              entries: []
            };
          }

          groups[sessionId].entries.push(entry);
          return groups;
        } catch {
          return groups;
        }
      }, {} as Record<string, { date: Date; sessionId: string; supplier: string; invoice: string; entries: typeof bulkStockAdditions }>);

      Object.values(groupedBulkHistory).forEach(group => {
        try {
          group.entries.sort((a, b) => {
            const seqA = a.changeReason?.match(/Seq: (\d+)/);
            const seqB = b.changeReason?.match(/Seq: (\d+)/);

            if (seqA && seqB) {
              return parseInt(seqA[1]) - parseInt(seqB[1]);
            }

            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          });
        } catch {
        }
      });

      const groupedRegularHistory = regularStockAdditions.reduce((groups, entry) => {
        try {
          const dateKey = format(new Date(entry.createdAt), 'yyyy-MM-dd');

          if (!groups[dateKey]) {
            groups[dateKey] = {
              date: entry.createdAt,
              entries: []
            };
          }

          groups[dateKey].entries.push(entry);
          return groups;
        } catch {
          return groups;
        }
      }, {} as Record<string, { date: Date; entries: typeof regularStockAdditions }>);

      Object.values(groupedRegularHistory).forEach(group => {
        try {
          group.entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } catch {
        }
      });

      const sortedBulkGroups = Object.values(groupedBulkHistory).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      const sortedRegularGroups = Object.values(groupedRegularHistory).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      const filteredBulkGroups = sortedBulkGroups.filter(group => {
        if (!debouncedSearchTerm.trim()) return true;

        try {
          const searchLower = debouncedSearchTerm.toLowerCase().trim();
          const matchesSupplier = group.supplier?.toLowerCase()?.includes(searchLower) || false;
          const matchesInvoice = group.invoice?.toLowerCase()?.includes(searchLower) || false;

          const matchesProduct = group.entries.some(entry => {
            if (!entry?.productId) return false;
            try {
              const productDetails = getProductDetails(entry);
              return productDetails.name.toLowerCase().includes(searchLower);
            } catch {
              return false;
            }
          });

          return matchesSupplier || matchesInvoice || matchesProduct;
        } catch {
          return false;
        }
      });

      const filteredRegularGroups = sortedRegularGroups.filter(group => {
        if (!debouncedSearchTerm.trim()) return true;

        try {
          const searchLower = debouncedSearchTerm.toLowerCase().trim();
          return group.entries.some(entry => {
            try {
              if (!entry?.productId) {
                return entry.changeReason?.toLowerCase()?.includes(searchLower) || false;
              }
              const productDetails = getProductDetails(entry);
              const matchesProduct = productDetails.name.toLowerCase().includes(searchLower);
              const matchesReason = entry.changeReason?.toLowerCase()?.includes(searchLower) || false;
              return matchesProduct || matchesReason;
            } catch {
              return false;
            }
          });
        } catch {
          return false;
        }
      });

      return { filteredBulkGroups, filteredRegularGroups };
    } catch (error) {
      console.error('Error in filtering logic:', error);
      return { filteredBulkGroups: [], filteredRegularGroups: [] };
    }
  }, [stockHistory, products, dateRange, debouncedSearchTerm, isLoading]);

  const getProductDetails = useCallback((entry: StockHistoryEntry) => {
    try {
      if (!entry) return { name: "Unknown", costPrice: 0, sellingPrice: 0 };

      const { productId, changeReason, product: joinedProduct } = entry;

      if (joinedProduct) {
        return {
          name: joinedProduct.name,
          costPrice: joinedProduct.costPrice,
          sellingPrice: joinedProduct.sellingPrice
        };
      }

      const cachedProduct = products.find(p => p.id === productId || p.itemNumber === productId);
      if (cachedProduct) {
        return {
          name: cachedProduct.name,
          costPrice: cachedProduct.costPrice,
          sellingPrice: cachedProduct.sellingPrice
        };
      }

      if (changeReason) {
        const nameMatch = changeReason.match(/^\[(.*?)\]\s*\|/);
        if (nameMatch) {
          return {
            name: nameMatch[1],
            costPrice: 0,
            sellingPrice: 0
          };
        }
      }

      if (scavengedNames[productId]) {
        return {
          name: scavengedNames[productId],
          costPrice: 0,
          sellingPrice: 0
        };
      }

      const idStr = productId || "";
      return {
        name: `Deleted Product (${idStr.length > 8 ? idStr.slice(-8) : idStr})`,
        costPrice: 0,
        sellingPrice: 0
      };
    } catch (err) {
      console.error('Error in getProductDetails:', err);
      return {
        name: "Deleted Product",
        costPrice: 0,
        sellingPrice: 0
      };
    }
  }, [products, scavengedNames]);

  const calculateGroupTotals = (entries: StockHistoryEntry[]) => {
    return entries.reduce((totals, entry) => {
      const productDetails = getProductDetails(entry);
      const qtyAdded = entry.newQuantity - entry.oldQuantity;
      const amount = qtyAdded * productDetails.costPrice;

      return {
        totalQty: totals.totalQty + qtyAdded,
        totalAmount: totals.totalAmount + amount
      };
    }, { totalQty: 0, totalAmount: 0 });
  };

  const handleProductClick = (productId: string) => {
    router.push(`/inventory/${productId}`);
  };

  const handleEditStockHistory = async (entryId: string, newQuantity: number, newReason: string, newDate?: Date) => {
    const entry = stockHistory.find(e => e.id === entryId);
    if (!entry) return false;

    const success = await updateStockHistoryEntry(entryId, newQuantity, newReason, newDate);
    if (success) {
      clearAllLocationCaches();
      await Promise.all([
        recalculateProductStock(entry.productId),
        loadStockHistory()
      ]);
    }
    return success;
  };

  const handleDeleteStockHistory = async (entryId: string) => {
    const entry = stockHistory.find(e => e.id === entryId);
    if (!entry) return false;

    const success = await deleteStockHistoryEntry(entryId);
    if (success) {
      clearAllLocationCaches();
      await Promise.all([
        recalculateProductStock(entry.productId),
        loadStockHistory()
      ]);
    }
    return success;
  };

  const handleDeleteInvoice = (group: { supplier: string; invoice: string; entries: StockHistoryEntry[] }) => {
    setDeleteInvoiceDialog({ open: true, group });
  };

  const handleEditGroupDate = (group: { date: Date; entries: StockHistoryEntry[]; supplier?: string; invoice?: string }) => {
    setEditGroupDateDialog({ open: true, group });
  };

  const handleEditGroupDateConfirm = async (newDate: Date) => {
    if (!editGroupDateDialog.group) return false;

    const entryIds = editGroupDateDialog.group.entries.map(e => e.id);
    const productIds = Array.from(new Set(editGroupDateDialog.group.entries.map(e => e.productId)));

    try {
      const result = await updateStockHistoryDatesAction(entryIds, newDate.toISOString());
      if (!result.success) throw new Error(result.error);

      await Promise.all(productIds.map(id => recalculateProductStock(id)));

      clearAllLocationCaches();
      await Promise.all([
        loadStockHistory(),
        loadProducts()
      ]);

      return true;
    } catch (err) {
      console.error('Error updating invoice date:', err);
      return false;
    }
  };

  const handleDeleteInvoiceConfirm = async (entryIds: string[]) => {
    const success = await deleteMultipleStockHistoryEntries(entryIds);
    if (success) {
      clearAllLocationCaches();
      await Promise.all([
        loadStockHistory(),
        loadProducts()
      ]);
      window.dispatchEvent(new CustomEvent('stock-updated'));
    }
    return success;
  };

  return (
    <Card className="mt-6 shadow-sm">
      <CardHeader className="pb-3 md:pb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <History size={20} />
            <div>
              <CardTitle className="text-base md:text-lg">Stock Input History</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                View all stock additions and increases
              </p>
            </div>
          </div>

          <StockHistoryDateFilter
            selectedFilter={dateFilter}
            onFilterChange={setDateFilter}
          />
        </div>

        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by supplier, invoice, or item name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading history...</div>
          </div>
        ) : filteredBulkGroups.length === 0 && filteredRegularGroups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History size={48} className="mx-auto mb-4 opacity-50" />
            <p>{searchTerm.trim() ? 'No matching stock history found.' : 'No stock input history found for the selected date range.'}</p>
          </div>
        ) : (
          <TooltipProvider>
            <div className="space-y-6 p-4">
              {filteredBulkGroups.length > 0 && (
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-primary">Stock Purchases</h3>
                    <p className="text-sm text-muted-foreground">Stock purchased from suppliers</p>
                  </div>
                  <div className="space-y-6">
                    {filteredBulkGroups.map((group, groupIndex) => {
                      const groupTotals = calculateGroupTotals(group.entries);

                      return (
                        <div key={`purchase-${groupIndex}`} className="border rounded-lg overflow-hidden">
                          <div className="bg-primary/5 px-4 py-3 border-b">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                              <div className="space-y-1">
                                <div className="flex items-center gap-4">
                                  <h4 className="font-semibold text-base">
                                    {format(new Date(group.date), 'PPP')}
                                  </h4>
                                  <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                                    {group.entries.length} item{group.entries.length > 1 ? 's' : ''}
                                  </span>
                                </div>
                                <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 text-sm text-muted-foreground">
                                  <span><strong>Supplier:</strong> {group.supplier}</span>
                                  <span><strong>Invoice:</strong> {group.invoice}</span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditGroupDate(group)}
                                  className="h-8 px-3 text-xs"
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Edit Date
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteInvoice(group)}
                                  className="h-8 px-3 text-xs text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Delete Invoice
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[200px]">Item</TableHead>
                                  <TableHead className="w-[100px]">Qty Added</TableHead>
                                  <TableHead className="w-[100px]">Price</TableHead>
                                  <TableHead className="w-[100px]">Amount</TableHead>
                                  <TableHead className="w-[100px]">Time</TableHead>
                                  <TableHead className="w-[60px]">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.entries.map((entry) => {
                                  const productDetails = getProductDetails(entry);
                                  const qtyAdded = entry.newQuantity - entry.oldQuantity;
                                  const price = productDetails.costPrice;
                                  const amount = qtyAdded * price;
                                  const productExistsInCache = products.some(p => p.id === entry.productId || p.itemNumber === entry.productId);

                                  return (
                                    <TableRow key={entry.id}>
                                      <TableCell className="font-medium">
                                        {productExistsInCache ? (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button
                                                onClick={() => handleProductClick(entry.productId)}
                                                className="text-left hover:text-primary hover:underline cursor-pointer transition-colors max-w-[200px] truncate"
                                              >
                                                {productDetails.name}
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="max-w-xs">
                                              <div className="space-y-1">
                                                <p className="font-bold break-words whitespace-normal">{productDetails.name}</p>
                                                {entry.changeReason && (
                                                  <p className="text-xs text-muted-foreground">{entry.changeReason}</p>
                                                )}
                                              </div>
                                            </TooltipContent>
                                          </Tooltip>
                                        ) : (
                                          <span className="max-w-[200px] truncate block">{productDetails.name}</span>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-green-700 bg-green-50 font-medium px-3 py-2 rounded-lg border border-green-200">
                                        {entry.oldQuantity} → {entry.newQuantity} (+{formatNumber(qtyAdded)})
                                      </TableCell>
                                      <TableCell>
                                        {canViewCostPrice ? `${currencySymbol}${formatFinancial(price, 'cost')}` : '•••'}
                                      </TableCell>
                                      <TableCell className="font-medium">
                                        {canViewCostPrice ? `${currencySymbol}${formatNumber(amount)}` : '•••'}
                                      </TableCell>
                                      <TableCell className="text-sm text-muted-foreground">
                                        {format(new Date(entry.createdAt), 'p')}
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex gap-1">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setEditHistoryDialog({ open: true, entry })}
                                            className="h-8 w-8 p-0"
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setDeleteHistoryDialog({ open: true, entry })}
                                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                                <TableRow className="bg-primary/5 font-semibold border-t-2">
                                  <TableCell className="font-bold">
                                    Total
                                  </TableCell>
                                  <TableCell className="text-green-700 bg-green-50 font-bold px-3 py-2 rounded-lg border border-green-200">
                                    Total: +{formatNumber(groupTotals.totalQty)}
                                  </TableCell>
                                  <TableCell>
                                    -
                                  </TableCell>
                                  <TableCell className="font-bold">
                                    {canViewCostPrice ? `${currencySymbol}${formatNumber(groupTotals.totalAmount)}` : '•••'}
                                  </TableCell>
                                  <TableCell>
                                    -
                                  </TableCell>
                                  <TableCell>
                                    -
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {filteredRegularGroups.length > 0 && (
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-muted-foreground">Regular Stock Additions</h3>
                    <p className="text-sm text-muted-foreground">Individual stock additions and manual adjustments</p>
                  </div>
                  <div className="space-y-4">
                    {filteredRegularGroups.map((group, groupIndex) => {
                      const groupTotals = calculateGroupTotals(group.entries);

                      return (
                        <div key={`regular-${groupIndex}`} className="border rounded-lg overflow-hidden">
                          <div className="bg-muted/50 px-4 py-2 border-b">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-sm">
                                {format(new Date(group.date), 'PPP')}
                              </h4>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {group.entries.length} item{group.entries.length > 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[200px]">Item</TableHead>
                                  <TableHead className="w-[100px]">Qty Added</TableHead>
                                  <TableHead className="w-[100px]">Price</TableHead>
                                  <TableHead className="w-[100px]">Amount</TableHead>
                                  <TableHead className="w-[100px]">Time</TableHead>
                                  <TableHead className="w-[120px]">Type</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.entries.map((entry) => {
                                  const productDetails = getProductDetails(entry);
                                  const qtyAdded = entry.newQuantity - entry.oldQuantity;
                                  const price = productDetails.costPrice;
                                  const amount = qtyAdded * price;
                                  const productExistsInCache = products.some(p => p.id === entry.productId || p.itemNumber === entry.productId);

                                  return (
                                    <TableRow key={entry.id}>
                                      <TableCell className="font-medium">
                                        {productExistsInCache ? (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button
                                                onClick={() => handleProductClick(entry.productId)}
                                                className="text-left hover:text-primary hover:underline cursor-pointer transition-colors max-w-[200px] truncate"
                                              >
                                                {productDetails.name}
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="max-w-xs">
                                              <div className="space-y-1">
                                                <p className="font-bold break-words whitespace-normal">{productDetails.name}</p>
                                                {entry.changeReason && (
                                                  <p className="text-xs text-muted-foreground">{entry.changeReason}</p>
                                                )}
                                              </div>
                                            </TooltipContent>
                                          </Tooltip>
                                        ) : (
                                          <span className="max-w-[200px] truncate block">{productDetails.name}</span>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-green-700 bg-green-50 font-medium px-3 py-2 rounded-lg border border-green-200">
                                        {entry.oldQuantity} → {entry.newQuantity} (+{formatNumber(qtyAdded)})
                                      </TableCell>
                                      <TableCell>
                                        {canViewCostPrice ? `${currencySymbol}${formatFinancial(price, 'cost')}` : '•••'}
                                      </TableCell>
                                      <TableCell className="font-medium">
                                        {canViewCostPrice ? `${currencySymbol}${formatNumber(amount)}` : '•••'}
                                      </TableCell>
                                      <TableCell className="text-sm text-muted-foreground">
                                        {format(new Date(entry.createdAt), 'p')}
                                      </TableCell>
                                      <TableCell>
                                        <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                                          {entry.changeReason}
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                                <TableRow className="bg-muted/30 font-semibold border-t-2">
                                  <TableCell className="font-bold">
                                    Total
                                  </TableCell>
                                  <TableCell className="text-green-700 bg-green-50 font-bold px-3 py-2 rounded-lg border border-green-200">
                                    Total: +{formatNumber(groupTotals.totalQty)}
                                  </TableCell>
                                  <TableCell>
                                    -
                                  </TableCell>
                                  <TableCell className="font-bold">
                                    {canViewCostPrice ? `${currencySymbol}${formatNumber(groupTotals.totalAmount)}` : '•••'}
                                  </TableCell>
                                  <TableCell>
                                    -
                                  </TableCell>
                                  <TableCell>
                                    -
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </TooltipProvider>
        )}
      </CardContent>

      <EditStockHistoryDialog
        open={editHistoryDialog.open}
        onOpenChange={(open) => setEditHistoryDialog({ open, entry: null })}
        entry={editHistoryDialog.entry}
        onConfirm={handleEditStockHistory}
        productCreatedAt={editHistoryDialog.entry ? (() => {
          const product = products.find(p => p.id === editHistoryDialog.entry?.productId);
          return product ? new Date(product.createdAt) : undefined;
        })() : undefined}
      />

      <DeleteStockHistoryDialog
        open={deleteHistoryDialog.open}
        onOpenChange={(open) => setDeleteHistoryDialog({ open, entry: null })}
        entry={deleteHistoryDialog.entry}
        onConfirm={handleDeleteStockHistory}
      />

      <DeleteInvoiceDialog
        open={deleteInvoiceDialog.open}
        onOpenChange={(open) => setDeleteInvoiceDialog({ open, group: null })}
        group={deleteInvoiceDialog.group}
        onConfirm={handleDeleteInvoiceConfirm}
      />

      <EditGroupDateDialog
        open={editGroupDateDialog.open}
        onOpenChange={(open) => setEditGroupDateDialog({ open, group: null })}
        group={editGroupDateDialog.group}
        onConfirm={handleEditGroupDateConfirm}
      />
    </Card>
  );
};

export default StockInputHistory;
