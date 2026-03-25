"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductImage from '@/components/inventory/ProductImage';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { useBusiness } from '@/contexts/BusinessContext';
import { Product } from '@/types';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFinancialVisibility } from '@/hooks/useFinancialVisibility';

import StockSummaryOverview from "./StockSummaryOverview";

interface StockSummaryData {
  productId: string;
  productName: string;
  itemNumber: string;
  imageUrl?: string | null;
  costPrice: number;
  sellingPrice: number;
  openingStock: number;
  itemsSold: number;
  stockIn: number;
  transferOut: number;
  returnIn: number;
  returnOut: number;
  adjustmentsIn: number;
  adjustmentsOut: number;
  closingStock: number;
  category?: string;
  revaluation: number;
}

interface StockSummaryTableProps {
  data: StockSummaryData[];
  summary: any;
  isLoading: boolean;
  onProductClick: (productId: string) => void;
  currentProducts?: Product[];
}

type SortField = 'productName' | 'category' | 'openingStock' | 'itemsSold' | 'stockIn' | 'transferOut' | 'returnIn' | 'returnOut' | 'closingStock';
type SortOrder = 'asc' | 'desc';

interface TableFilters {
  searchTerm: string;
  categoryFilter: string;
  stockStatusFilter: string;
  sortField: SortField;
  sortOrder: SortOrder;
}

import { FileDown, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StockSummaryTableProps {
  data: StockSummaryData[];
  summary: any;
  isLoading: boolean;
  onProductClick: (productId: string) => void;
  currentProducts?: Product[];
  onExportCSV?: (filteredData: StockSummaryData[]) => void;
  onExportPDF?: (filteredData: StockSummaryData[]) => void;
}

const StockSummaryTable: React.FC<StockSummaryTableProps> = ({
  data,
  summary,
  isLoading,
  onProductClick,
  currentProducts = [],
  onExportCSV,
  onExportPDF
}) => {
  const { currentBusiness } = useBusiness();
  const { canViewCostPrice } = useFinancialVisibility();

  // Generate cache key for table filters
  const getTableFiltersCacheKey = () => {
    return `stockSummaryTableFilters_${currentBusiness?.id || 'default'}`;
  };

  // Load persisted table filters
  const getPersistedTableFilters = (): TableFilters => {
    try {
      const saved = localStorage.getItem(getTableFiltersCacheKey());
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Error loading persisted table filters:', error);
    }
    return {
      searchTerm: '',
      categoryFilter: 'all',
      stockStatusFilter: 'all',
      sortField: 'productName',
      sortOrder: 'asc'
    };
  };

  const persistedFilters = getPersistedTableFilters();
  const [searchTerm, setSearchTerm] = useState(persistedFilters.searchTerm);
  const [categoryFilter, setCategoryFilter] = useState(persistedFilters.categoryFilter);
  const [stockStatusFilter, setStockStatusFilter] = useState(persistedFilters.stockStatusFilter);
  const [sortField, setSortField] = useState<SortField>(persistedFilters.sortField);
  const [sortOrder, setSortOrder] = useState<SortOrder>(persistedFilters.sortOrder);

  // 🛡️ Math Hardening - Mandated by data-integrity.md
  const toSafeNum = (val: any) => {
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Persist table filters whenever they change
  useEffect(() => {
    const filtersToSave: TableFilters = {
      searchTerm,
      categoryFilter,
      stockStatusFilter,
      sortField,
      sortOrder
    };
    localStorage.setItem(getTableFiltersCacheKey(), JSON.stringify(filtersToSave));
  }, [searchTerm, categoryFilter, stockStatusFilter, sortField, sortOrder, currentBusiness?.id]);

  // Check if closing stock matches current quantity
  const isStockMismatch = (item: StockSummaryData): boolean => {
    const currentProduct = (currentProducts || []).find(p => p.id === item.productId);
    return currentProduct ? currentProduct.quantity !== item.closingStock : false;
  };

  // Get unique categories from data
  const categories = useMemo(() => {
    const safeData = Array.isArray(data) ? data : [];
    const uniqueCategories = Array.from(new Set(safeData.map(item => item.category).filter(Boolean)));
    return uniqueCategories.sort();
  }, [data]);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    const safeData = Array.isArray(data) ? data : [];
    const filtered = safeData.filter(item => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          (item.productName || '').toLowerCase().includes(searchLower) ||
          (item.itemNumber || '').toLowerCase().includes(searchLower) ||
          (item.category && item.category.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false;
      }

      // Stock status filter
      if (stockStatusFilter !== 'all') {
        const closingStock = toSafeNum(item.closingStock);
        if (stockStatusFilter === 'in-stock' && closingStock <= 0) return false;
        if (stockStatusFilter === 'out-of-stock' && closingStock > 0) return false;
        if (stockStatusFilter === 'low-stock' && (closingStock > 10 || closingStock <= 0)) return false;
      }

      return true;
    });

    // Sort data
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'productName':
          comparison = (a.productName || '').localeCompare(b.productName || '');
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
        case 'openingStock':
          comparison = toSafeNum(a.openingStock) - toSafeNum(b.openingStock);
          break;
        case 'itemsSold':
          comparison = toSafeNum(a.itemsSold) - toSafeNum(b.itemsSold);
          break;
        case 'stockIn':
          comparison = toSafeNum(a.stockIn) - toSafeNum(b.stockIn);
          break;
        case 'transferOut':
          comparison = toSafeNum(a.transferOut) - toSafeNum(b.transferOut);
          break;
        case 'returnIn':
          comparison = toSafeNum(a.returnIn) - toSafeNum(b.returnIn);
          break;
        case 'returnOut':
          comparison = toSafeNum(a.returnOut) - toSafeNum(b.returnOut);
          break;
        case 'closingStock':
          comparison = toSafeNum(a.closingStock) - toSafeNum(b.closingStock);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [data, searchTerm, categoryFilter, stockStatusFilter, sortField, sortOrder]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = Array.isArray(filteredAndSortedData) ? filteredAndSortedData.slice(startIndex, endIndex) : [];

  // Reset page when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchTerm, categoryFilter, stockStatusFilter]);

  const handleSort = (field: SortField) => {

    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const totals = React.useMemo(() => {
    const safeData = Array.isArray(filteredAndSortedData) ? filteredAndSortedData : [];
    return safeData.reduce((acc, item) => ({
      openingStock: acc.openingStock + toSafeNum(item.openingStock),
      itemsSold: acc.itemsSold + toSafeNum(item.itemsSold),
      stockIn: acc.stockIn + toSafeNum(item.stockIn),
      transferOut: acc.transferOut + toSafeNum(item.transferOut),
      returnIn: acc.returnIn + toSafeNum(item.returnIn),
      returnOut: acc.returnOut + toSafeNum(item.returnOut),
      adjustmentsIn: acc.adjustmentsIn + toSafeNum(item.adjustmentsIn),
      adjustmentsOut: acc.adjustmentsOut + toSafeNum(item.adjustmentsOut),
      closingStock: acc.closingStock + toSafeNum(item.closingStock)
    }), {
      openingStock: 0,
      itemsSold: 0,
      stockIn: 0,
      transferOut: 0,
      returnIn: 0,
      returnOut: 0,
      adjustmentsIn: 0,
      adjustmentsOut: 0,
      closingStock: 0
    });
  }, [filteredAndSortedData]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex items-center relative flex-grow">
          <Search className="h-4 w-4 absolute left-3 text-gray-400" />
          <Input
            placeholder="Search products..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Category Filter */}
        <div className="min-w-[180px]">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category || 'Unknown'}>
                  {category || 'Unknown'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stock Status Filter */}
        <div className="min-w-[150px]">
          <Select value={stockStatusFilter} onValueChange={setStockStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Stock Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock</SelectItem>
              <SelectItem value="in-stock">In Stock</SelectItem>
              <SelectItem value="low-stock">Low Stock (≤10)</SelectItem>
              <SelectItem value="out-of-stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
           <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <FileDown size={16} />
                  Export
                  <ChevronDown size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onExportCSV?.(filteredAndSortedData)}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExportPDF?.(filteredAndSortedData)}>
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center gap-4 py-2 border-b">
        <Badge variant="secondary" className="text-xs">
          {filteredAndSortedData.length} {filteredAndSortedData.length === 1 ? 'product' : 'products'} found
        </Badge>
        {totalPages > 1 && (
          <div className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
        )}
      </div>

      {/* Table */}
      <TooltipProvider>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Image</TableHead>
                <TableHead>Item #</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('productName')}
                    className="h-auto p-0 font-medium text-left justify-start hover:bg-transparent"
                  >
                    Product Name {getSortIcon('productName')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('category')}
                    className="h-auto p-0 font-medium text-left justify-start hover:bg-transparent"
                  >
                    Category {getSortIcon('category')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('openingStock')}
                    className="h-auto p-0 font-medium text-right justify-end hover:bg-transparent"
                  >
                    Opening Stock {getSortIcon('openingStock')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('stockIn')}
                    className="h-auto p-0 font-medium text-right justify-end hover:bg-transparent"
                  >
                    Stock In {getSortIcon('stockIn')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('transferOut')}
                    /* Using transferOut sort key for Stock Out generally, though it's a mix */
                    className="h-auto p-0 font-medium text-right justify-end hover:bg-transparent"
                  >
                    Stock Out
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('closingStock')}
                    className="h-auto p-0 font-medium text-right justify-end hover:bg-transparent"
                  >
                    Closing Stock {getSortIcon('closingStock')}
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((item) => (
                <TableRow
                  key={item.productId}
                  className={`cursor-pointer hover:bg-muted/50 transition-colors ${isStockMismatch(item) ? 'bg-red-50 hover:bg-red-100 border-l-4 border-l-red-500' : ''
                    }`}
                  onClick={() => onProductClick(item.productId)}
                >
                  <TableCell>
                    <ProductImage imageUrl={item.imageUrl} alt={item.productName} size="sm" />
                  </TableCell>
                  <TableCell className="font-medium truncate max-w-[120px]">#{item.itemNumber}</TableCell>
                  <TableCell className="truncate max-w-[200px]">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help">{item.productName}</span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-bold break-words whitespace-normal">{item.productName}</p>
                          {item.category && (
                            <p className="text-xs text-muted-foreground">Category: {item.category}</p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{item.category || '-'}</TableCell>
                  <TableCell className="text-right">{item.openingStock}</TableCell>
                  {/* Stock In = Stock In + Return In + Positive Adjustments */}
                  <TableCell className="text-right text-green-600 font-medium">
                    {item.stockIn + item.returnIn + (item.adjustmentsIn || 0)}
                  </TableCell>
                  {/* Stock Out = Sold + Transfer Out + Return Out + Negative Adjustments (abs) */}
                  <TableCell className="text-right text-red-600 font-medium">
                    {item.itemsSold + item.transferOut + item.returnOut + (item.adjustmentsOut || 0)}
                  </TableCell>
                  <TableCell className="text-right font-bold">{item.closingStock}</TableCell>
                </TableRow>
              ))}
              {filteredAndSortedData.length > 0 && (
                <TableRow className="font-semibold bg-muted/50 border-t-2">
                  <TableCell colSpan={4}>Total</TableCell>
                  <TableCell className="text-right">{totals.openingStock}</TableCell>
                  <TableCell className="text-right text-green-700">
                    {totals.stockIn + totals.returnIn + totals.adjustmentsIn}
                  </TableCell>
                  <TableCell className="text-right text-red-700">
                    {totals.itemsSold + totals.transferOut + totals.returnOut + totals.adjustmentsOut}
                  </TableCell>
                  <TableCell className="text-right">{totals.closingStock}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {filteredAndSortedData.length === 0 && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              No products found matching your filters.
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }

                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        onClick={() => handlePageChange(pageNumber)}
                        isActive={currentPage === pageNumber}
                        className="cursor-pointer"
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        {/* Stock Summary Overview - Now inside table component to prevent re-render loops */}
        <div className="mt-8">
            <StockSummaryOverview 
                data={filteredAndSortedData} 
                summary={summary}
                isFiltered={filteredAndSortedData.length !== (Array.isArray(data) ? data.length : 0)}
            />
        </div>
      </TooltipProvider>
    </div>
  );
};

export default React.memo(StockSummaryTable);
