"use client";
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBusiness } from '@/contexts/BusinessContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, CalendarIcon, Search } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useSalesData } from '@/hooks/useSalesData';
import { useSoldItemsData } from '@/hooks/useSoldItemsData';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatNumber, formatCashCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import DateRangeFilter from '@/components/sales/DateRangeFilter';
import { exportSoldItemsToCSV } from '@/utils/exportSoldItemsToCSV';
import { exportSoldItemsToPDF } from '@/utils/exportSoldItemsToPDF';
import { Skeleton } from '@/components/ui/skeleton';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import ItemSalesDialog from './ItemSalesDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { getDateRangeFromFilter } from '@/utils/dateFilters';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFinancialVisibility } from '@/hooks/useFinancialVisibility';

const SoldItemsTab = () => {
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();
  const mobileConfig = useMobileOptimization();
  const { sales } = useSalesData(user?.id, 'desc'); // Load all sales without pagination limit
  const { settings, isLoading: settingsLoading } = useBusinessSettings();
  const { canViewCostPrice, canViewProfit, canViewSellingPrice } = useFinancialVisibility();
  const { toast } = useToast();

  const FILTER_STORAGE_KEY = useMemo(() =>
    currentBusiness?.id ? `soldItemsFilters_${currentBusiness.id}` : 'soldItemsFilters'
    , [currentBusiness?.id]);

  // Load persisted state from localStorage with mobile optimization
  const getPersistedState = useCallback(() => {
    try {
      const saved = localStorage.getItem(FILTER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          dateFilter: parsed.dateFilter || 'this-month',
          dateRange: parsed.dateRange ? {
            from: parsed.dateRange.from ? new Date(parsed.dateRange.from) : undefined,
            to: parsed.dateRange.to ? new Date(parsed.dateRange.to) : undefined
          } : { from: undefined, to: undefined },
          specificDate: parsed.specificDate ? new Date(parsed.specificDate) : undefined,
          showOnlyNotInInventory: parsed.showOnlyNotInInventory || false,
          showOnlyCostData: parsed.showOnlyCostData || false
        };
      }
    } catch (error) {
      console.error('Error loading persisted sold items filters:', error);
    }
    return {
      dateFilter: 'this-month',
      dateRange: { from: undefined, to: undefined },
      specificDate: undefined,
      showOnlyNotInInventory: false,
      showOnlyCostData: false
    };
  }, [FILTER_STORAGE_KEY]);

  const persistedState = useMemo(() => getPersistedState(), [getPersistedState]);
  const [dateFilter, setDateFilter] = useState<string>(persistedState.dateFilter);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined; }>(persistedState.dateRange);
  const [specificDate, setSpecificDate] = useState<Date | undefined>(persistedState.specificDate);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [isItemSalesDialogOpen, setIsItemSalesDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyNotInInventory, setShowOnlyNotInInventory] = useState(persistedState.showOnlyNotInInventory);
  const [showOnlyCostData, setShowOnlyCostData] = useState(persistedState.showOnlyCostData);

  // Use the new hook for sold items data
  const { soldItems, isLoading } = useSoldItemsData(
    dateFilter,
    dateRange,
    specificDate,
    showOnlyNotInInventory
  );

  // Persist state to localStorage whenever filters change
  useEffect(() => {
    const stateToSave = {
      dateFilter,
      dateRange: {
        from: dateRange.from?.toISOString(),
        to: dateRange.to?.toISOString()
      },
      specificDate: specificDate?.toISOString(),
      showOnlyNotInInventory,
      showOnlyCostData
    };
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(stateToSave));
  }, [dateFilter, dateRange, specificDate, showOnlyNotInInventory, showOnlyCostData, FILTER_STORAGE_KEY]);

  // Optimized search filtering with debouncing effect
  const filteredSoldItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return soldItems;
    }

    const query = searchQuery.toLowerCase();
    return soldItems.filter(item =>
      item.description.toLowerCase().includes(query)
    );
  }, [soldItems, searchQuery]);

  // Handle export to CSV
  const handleExportToCSV = () => {
    let dateRangeForExport: { from: Date | undefined; to: Date | undefined };

    if (dateFilter === 'specific-date' && specificDate) {
      dateRangeForExport = {
        from: specificDate,
        to: specificDate
      };
    } else if (dateFilter === 'custom' && dateRange.from && dateRange.to) {
      dateRangeForExport = dateRange;
    } else {
      const range = getDateRangeFromFilter(dateFilter);
      dateRangeForExport = range;
    }

    exportSoldItemsToCSV(filteredSoldItems, 'Current Period', settings.currency, showOnlyCostData);
    toast({
      title: "Export successful",
      description: "Sold items exported to CSV file.",
    });
  };

  // Handle export to PDF
  const handleExportToPDF = () => {
    // Don't export if settings are still loading
    if (settingsLoading) {
      toast({
        title: "Please wait",
        description: "Business settings are still loading. Please try again in a moment.",
        variant: "destructive"
      });
      return;
    }

    let dateRangeForExport: { from: Date | undefined; to: Date | undefined };

    if (dateFilter === 'specific-date' && specificDate) {
      dateRangeForExport = {
        from: specificDate,
        to: specificDate
      };
    } else if (dateFilter === 'custom' && dateRange.from && dateRange.to) {
      dateRangeForExport = dateRange;
    } else {
      const range = getDateRangeFromFilter(dateFilter);
      dateRangeForExport = range;
    }

    exportSoldItemsToPDF(filteredSoldItems, 'Current Period', settings.currency, showOnlyCostData, dateRangeForExport, {
      businessName: settings.businessName,
      businessAddress: settings.businessAddress,
      businessPhone: settings.businessPhone,
      businessEmail: settings.businessEmail
    });
    toast({
      title: "Export successful",
      description: "Sold items exported to PDF file.",
    });
  };

  // Get period display text
  const getPeriodDisplayText = () => {
    if (dateFilter === 'specific-date' && specificDate) {
      return format(specificDate, 'dd/MM/yyyy');
    } else if (dateFilter === 'custom' && dateRange.from && dateRange.to) {
      return `${format(dateRange.from, 'dd/MM/yyyy')} to ${format(dateRange.to, 'dd/MM/yyyy')}`;
    } else {
      const range = getDateRangeFromFilter(dateFilter);
      if (range.from.toDateString() === range.to.toDateString()) {
        return format(range.from, 'dd/MM/yyyy');
      } else {
        return `${format(range.from, 'dd/MM/yyyy')} to ${format(range.to, 'dd/MM/yyyy')}`;
      }
    }
  };

  // Handle item click
  const handleItemClick = (itemDescription: string) => {
    setSelectedItem(itemDescription);
    setIsItemSalesDialogOpen(true);
  };

  // Handle inventory filter change
  const handleInventoryFilterChange = (checked: boolean | 'indeterminate') => {
    setShowOnlyNotInInventory(checked === true);
  };

  // Handle cost data filter change
  const handleCostDataFilterChange = (checked: boolean | 'indeterminate') => {
    setShowOnlyCostData(checked === true);
  };

  // Optimized loading skeleton for mobile
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Optimized filter controls for mobile */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="last-week">Last Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
                <SelectItem value="specific-date">Specific Date</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {dateFilter === 'specific-date' && (
              <div className="w-full md:w-auto">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full md:w-[240px] justify-start text-left font-normal bg-white",
                        !specificDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {specificDate ? format(specificDate, "PPP") : <span>Pick a specific date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[100] bg-white shadow-lg" align="start">
                    <Calendar
                      mode="single"
                      selected={specificDate}
                      onSelect={setSpecificDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {dateFilter === 'custom' && (
              <DateRangeFilter
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
            )}
          </div>

          {/* Export buttons - stack on mobile */}
          <div className="flex flex-col md:flex-row gap-2">
            <Button variant="outline" onClick={handleExportToCSV} className="gap-2 w-full md:w-auto">
              <FileText className="h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={handleExportToPDF} className="gap-2 w-full md:w-auto">
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Optimized search and filter controls */}
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="not-in-inventory"
                checked={showOnlyNotInInventory}
                onCheckedChange={handleInventoryFilterChange}
              />
              <label
                htmlFor="not-in-inventory"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Show only items not in inventory
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="cost-data-only"
                checked={showOnlyCostData}
                onCheckedChange={handleCostDataFilterChange}
                disabled={!canViewCostPrice}
              />
              <label
                htmlFor="cost-data-only"
                className={cn(
                  "text-sm font-medium leading-none",
                  !canViewCostPrice && "opacity-50 cursor-not-allowed"
                )}
              >
                Show only cost data (Item, Quantity, Average Cost, Total Cost)
              </label>
            </div>
          </div>
        </div>

        {/* Optimized sold items table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Items Sold - {getPeriodDisplayText()}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Click on an item to view all sales containing that item
              {searchQuery && ` • Showing ${filteredSoldItems.length} of ${soldItems.length} items`}
              {showOnlyNotInInventory && ` • Filtered to show only items not in current inventory`}
              {showOnlyCostData && ` • Showing only cost data`}
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {filteredSoldItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {searchQuery ? "No items found matching your search." :
                  showOnlyNotInInventory ? "No sold items found that are not in current inventory." :
                    "No items sold in the selected period."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      {showOnlyCostData ? (
                        <>
                          <TableHead className="text-right">Avg Cost</TableHead>
                          <TableHead className="text-right">Total Cost</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead className="text-right">Avg Price</TableHead>
                          <TableHead className="text-right font-bold">Total</TableHead>
                          <TableHead className="text-right hidden sm:table-cell">Discount</TableHead>
                          {canViewCostPrice && <TableHead className="text-right">Cost</TableHead>}
                          {canViewProfit && <TableHead className="text-right">Profit</TableHead>}
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSoldItems.slice(0, mobileConfig.pageSize * 2).map((item, index) => (
                      <TableRow
                        key={index}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleItemClick(item.description)}
                      >
                        <TableCell className="font-medium max-w-[200px] truncate">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">{item.description}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="space-y-1">
                                <p className="font-bold break-words whitespace-normal">{item.description}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-right">{item.totalQuantity}</TableCell>
                        {showOnlyCostData ? (
                          <>
                            <TableCell className="text-right">
                              {canViewCostPrice ? formatCashCurrency(item.averageCost || 0, settings.currency) : '•••'}
                            </TableCell>
                            <TableCell className="text-right">
                              {canViewCostPrice ? formatCashCurrency(item.totalCost, settings.currency) : '•••'}
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="text-right">
                              {canViewSellingPrice ? formatCashCurrency(item.averagePrice, settings.currency) : '•••'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {canViewSellingPrice ? formatCashCurrency(item.totalAmount, settings.currency) : '•••'}
                            </TableCell>
                            <TableCell className="text-right hidden sm:table-cell">
                              {canViewSellingPrice ? formatCashCurrency(item.totalDiscount, settings.currency) : '•••'}
                            </TableCell>
                            {canViewCostPrice && (
                              <TableCell className="text-right text-sales-dark">
                                {formatCashCurrency(item.totalCost, settings.currency)}
                              </TableCell>
                            )}
                            {canViewProfit && (
                              <TableCell className="text-right font-semibold text-green-600">
                                {formatCashCurrency(item.totalProfit, settings.currency)}
                              </TableCell>
                            )}
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Optimized summary for mobile */}
        {filteredSoldItems.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              {showOnlyCostData ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Items</p>
                    <p className="text-lg md:text-2xl font-bold">{filteredSoldItems.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Quantity</p>
                    <p className="text-lg md:text-2xl font-bold">
                      {filteredSoldItems.reduce((sum, item) => sum + item.totalQuantity, 0)}
                    </p>
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="text-sm text-muted-foreground">Total Cost</p>
                    <p className="text-lg md:text-2xl font-bold">
                      {canViewCostPrice ? formatCashCurrency(filteredSoldItems.reduce((sum, item) => sum + item.totalCost, 0), settings.currency) : '•••'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* First row: Items, Quantity, Revenue */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Items</p>
                      <p className="text-base sm:text-lg md:text-xl font-bold truncate">{filteredSoldItems.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Quantity</p>
                      <p className="text-base sm:text-lg md:text-xl font-bold truncate">
                        {filteredSoldItems.reduce((sum, item) => sum + item.totalQuantity, 0)}
                      </p>
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="text-sm text-muted-foreground">Revenue</p>
                      <p className="text-base sm:text-lg md:text-xl font-bold truncate">
                        {canViewSellingPrice ? formatCashCurrency(filteredSoldItems.reduce((sum, item) => sum + item.totalAmount, 0), settings.currency) : '•••'}
                      </p>
                    </div>
                  </div>
                  {/* Second row: Discount, Cost, Profit */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Discount</p>
                      <p className="text-base sm:text-lg md:text-xl font-bold truncate">
                        {canViewSellingPrice ? formatCashCurrency(filteredSoldItems.reduce((sum, item) => sum + item.totalDiscount, 0), settings.currency) : '•••'}
                      </p>
                    </div>
                    {canViewCostPrice && (
                      <div className="flex flex-col items-center">
                        <p className="text-sm text-muted-foreground">Cost</p>
                        <p className="text-base sm:text-lg md:text-xl font-bold truncate">
                          {formatCashCurrency(filteredSoldItems.reduce((sum, item) => sum + item.totalCost, 0), settings.currency)}
                        </p>
                      </div>
                    )}
                    {canViewProfit && (
                      <div className="flex flex-col items-center">
                        <p className="text-sm text-muted-foreground">Profit</p>
                        <p className="text-base sm:text-lg md:text-xl font-bold truncate">
                          {formatCashCurrency(filteredSoldItems.reduce((sum, item) => sum + item.totalProfit, 0), settings.currency)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Item Sales Dialog */}
        <ItemSalesDialog
          isOpen={isItemSalesDialogOpen}
          onOpenChange={setIsItemSalesDialogOpen}
          itemDescription={selectedItem || ''}
          sales={sales}
          currency={settings.currency}
          dateFilter={dateFilter}
          dateRange={dateRange}
          specificDate={specificDate}
        />
      </div>
    </TooltipProvider>
  );
};

export default SoldItemsTab;
