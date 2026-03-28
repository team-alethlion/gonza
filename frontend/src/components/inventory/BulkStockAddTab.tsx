/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Plus, Trash2, Save, CalendarIcon, ChevronUp, ChevronDown } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useProducts } from '@/hooks/useProducts';
import { useToast } from '@/hooks/use-toast';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useIsMobile } from '@/hooks/use-mobile';
import { useStockHistory } from '@/hooks/useStockHistory';
import { Product } from '@/types';
import ProductSuggestionsPanel from './ProductSuggestionsPanel';
import { useProductSuggestions } from '@/hooks/useProductSuggestions';
import StockInputHistory from './StockInputHistory';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useBusiness } from '@/contexts/BusinessContext';
import { bulkAdjustStockAction } from '@/app/actions/inventory';
interface StockAddRow {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  amount: number;
  searchTerm: string;
}
const STORAGE_KEY = 'bulkStockAddRows';

// Mobile Stock Row Component
const MobileStockRow = ({
  row,
  index,
  onUpdateRow,
  onRemoveRow,
  onInputFocus,
  onAddRowAfter,
  onKeyDown,
  onMoveRow,
  settings,
  canRemove,
  products,
  stockEntryDate,
  isLastRow,
  totalRows
}: {
  row: StockAddRow;
  index: number;
  onUpdateRow: (id: string, field: keyof StockAddRow, value: string | number) => void;
  onRemoveRow: (id: string) => void;
  onInputFocus: (rowId: string) => void;
  onAddRowAfter: (rowId: string) => void;
  onKeyDown: (e: React.KeyboardEvent, rowId: string) => void;
  onMoveRow: (rowId: string, direction: 'up' | 'down') => void;
  settings: any;
  canRemove: boolean;
  products: Product[];
  stockEntryDate: Date;
  isLastRow: boolean;
  totalRows: number;
}) => {
  const formatNumber = (num: number) => {
    return Math.round(num).toLocaleString();
  };

  // Check if product has date conflict
  const hasDateConflict = row.productId ? (() => {
    const product = products.find(p => p.id === row.productId);
    if (product) {
      const productCreationDate = new Date(product.createdAt);
      const selectedDate = new Date(stockEntryDate);
      const productDate = new Date(productCreationDate.getFullYear(), productCreationDate.getMonth(), productCreationDate.getDate());
      const entryDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      return productDate.getTime() > entryDate.getTime();
    }
    return false;
  })() : false;
  const conflictProduct = hasDateConflict ? products.find(p => p.id === row.productId) : null;
  return <Card className={cn("mb-4 shadow-sm", hasDateConflict && "border-destructive border-2")}>
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-medium">Item #{index + 1}</CardTitle>
        <div className="flex gap-2">
          {/* Move Up/Down buttons */}
          <Button variant="outline" size="icon" onClick={() => onMoveRow(row.id, 'up')} disabled={index === 0} className="h-8 w-8">
            <ChevronUp size={14} />
          </Button>
          <Button variant="outline" size="icon" onClick={() => onMoveRow(row.id, 'down')} disabled={index === totalRows - 1} className="h-8 w-8">
            <ChevronDown size={14} />
          </Button>
          <Button variant="outline" size="icon" onClick={() => onRemoveRow(row.id)} disabled={!canRemove} className="h-8 w-8">
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Product Search */}
      <div className="relative">
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          Product
        </label>
        <Input placeholder="Type to search products..." value={row.searchTerm} onChange={e => onUpdateRow(row.id, 'searchTerm', e.target.value)} onFocus={() => onInputFocus(row.id)} onKeyDown={e => onKeyDown(e, row.id)} className={cn("w-full", hasDateConflict && "border-destructive")} />
        {hasDateConflict && conflictProduct && <p className="text-xs text-destructive mt-1">
          Product was created on {format(new Date(conflictProduct.createdAt), 'PPP')} - after selected date
        </p>}
      </div>

      {/* Quantity and Price Row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Quantity
          </label>
          <Input type="number" min="0" step="0.01" value={row.quantity || ''} onChange={e => onUpdateRow(row.id, 'quantity', parseFloat(e.target.value) || 0)} onKeyDown={e => onKeyDown(e, row.id)} placeholder="0" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Price
          </label>
          <Input type="number" min="0" step="0.01" value={row.price || ''} onChange={e => onUpdateRow(row.id, 'price', parseFloat(e.target.value) || 0)} onKeyDown={e => onKeyDown(e, row.id)} placeholder="0.00" />
        </div>
      </div>

      {/* Amount Display */}
      <div className="bg-muted/50 p-3 rounded-md">
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-muted-foreground">Amount:</span>
          <span className="font-semibold">
            {settings.currency} {formatNumber(row.amount)}
          </span>
        </div>
      </div>

      {/* Add Row Button - only show on last row */}
      {isLastRow && <div className="flex justify-center pt-2">
        <Button variant="ghost" size="sm" onClick={() => onAddRowAfter(row.id)} className="gap-2 text-muted-foreground hover:text-foreground">
          <Plus size={14} />
          Add row below
        </Button>
      </div>}
    </CardContent>
  </Card>;
};
const BulkStockAddTab = () => {
  const {
    user
  } = useAuth();
  const {
    products,
    loadProducts
  } = useProducts(user?.id); // Standard load (paged)
  const {
    settings
  } = useBusinessSettings();
  const {
    toast
  } = useToast();
  const isMobile = useIsMobile();
    const { 
        currentBusiness 
    } = useBusiness();
    const {
        stockHistory,
        loadStockHistory
    } = useStockHistory(user?.id);

  // 🚀 PERFORMANCE: Helper to find product without needing all 10,000 in memory
  const getProductById = useCallback(async (id: string) => {
    const { localDb } = await import('@/lib/dexie');
    return await localDb.products.get(id);
  }, []);

  // Get the initial stock date (chronologically first entry)
  const getInitialStockDate = useCallback((): Date | null => {
    if (stockHistory.length === 0) return null;
    const sortedHistory = [...stockHistory].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return sortedHistory[0]?.createdAt || null;
  }, [stockHistory]);

  const validateStockDate = useCallback((date: Date): string => {
    const initialStockDate = getInitialStockDate();
    if (!initialStockDate) return '';

    // Compare dates at start of day level
    const proposedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
    const initialDate = new Date(initialStockDate.getFullYear(), initialStockDate.getMonth(), initialStockDate.getDate(), 0, 0, 0);

    // Check if the proposed date is exactly the same as the initial stock date
    if (proposedDate.getTime() === initialDate.getTime()) {
      return `Date cannot be the same as the initial stock entry date (${format(initialStockDate, 'PPP')})`;
    }

    // Check if the proposed date is before the initial stock date
    if (proposedDate.getTime() < initialDate.getTime()) {
      return `Date cannot be earlier than initial stock date (${format(initialStockDate, 'PPP')})`;
    }
    return '';
  }, [getInitialStockDate]);

  // Format number with commas and no decimals
  const formatNumber = (num: number) => {
    return Math.round(num).toLocaleString();
  };

  // State for stock entry date and purchase details
  const [stockEntryDate, setStockEntryDate] = useState<Date>(new Date());
  const [supplierName, setSupplierName] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');

  // Initialize state with data from localStorage or default row
  const [stockRows, setStockRows] = useState<StockAddRow[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedRows = JSON.parse(saved);
        // Ensure we have at least one row and sync searchTerm with productName
        const syncedRows = parsedRows.map((row: StockAddRow) => ({
          ...row,
          searchTerm: row.searchTerm || row.productName || '' // Use productName if searchTerm is empty
        }));
        return syncedRows.length > 0 ? syncedRows : [{
          id: '1',
          productId: '',
          productName: '',
          quantity: 0,
          price: 0,
          amount: 0,
          searchTerm: ''
        }];
      }
    } catch (error) {
      console.error('Error loading saved stock rows:', error);
    }
    return [{
      id: '1',
      productId: '',
      productName: '',
      quantity: 0,
      price: 0,
      amount: 0,
      searchTerm: ''
    }];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);

  // Save to localStorage whenever stockRows changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stockRows));
    } catch (error) {
      console.error('Error saving stock rows:', error);
    }
  }, [stockRows]);

  // Clear localStorage when component unmounts or user saves successfully
  const clearStoredData = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing stored data:', error);
    }
  }, []);

  // Create individual product suggestions hook for the focused row
  const focusedRow = stockRows.find(row => row.id === focusedRowId);
  const {
    suggestions,
    isOpen: panelOpen,
    closePanel
  } = useProductSuggestions(products, focusedRow?.searchTerm || '');
  const addNewRow = useCallback(() => {
    const newRow: StockAddRow = {
      id: Date.now().toString(),
      productId: '',
      productName: '',
      quantity: 0,
      price: 0,
      amount: 0,
      searchTerm: ''
    };
    setStockRows(prev => [...prev, newRow]);
  }, []);
  const addRowAfter = useCallback((afterRowId: string) => {
    const newRow: StockAddRow = {
      id: Date.now().toString(),
      productId: '',
      productName: '',
      quantity: 0,
      price: 0,
      amount: 0,
      searchTerm: ''
    };
    setStockRows(prev => {
      const index = prev.findIndex(row => row.id === afterRowId);
      const newRows = [...prev];
      newRows.splice(index + 1, 0, newRow);
      return newRows;
    });
  }, []);
  const moveRow = useCallback((rowId: string, direction: 'up' | 'down') => {
    setStockRows(prev => {
      const index = prev.findIndex(row => row.id === rowId);
      if (index === -1) return prev;
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const newRows = [...prev];
      [newRows[index], newRows[newIndex]] = [newRows[newIndex], newRows[index]];
      return newRows;
    });
  }, []);
  const handleKeyDown = useCallback((e: React.KeyboardEvent, rowId: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addRowAfter(rowId);
    }
  }, [addRowAfter]);
  const removeRow = useCallback((id: string) => {
    if (stockRows.length > 1) {
      setStockRows(prev => prev.filter(row => row.id !== id));
      if (focusedRowId === id) {
        setFocusedRowId(null);
      }
    }
  }, [stockRows.length, focusedRowId]);
  const updateRow = useCallback((id: string, field: keyof StockAddRow, value: string | number) => {
    setStockRows(prev => prev.map(row => {
      if (row.id === id) {
        const updatedRow = {
          ...row,
          [field]: value
        };

        // If searchTerm is updated, clear product selection if it doesn't match
        if (field === 'searchTerm' && typeof value === 'string') {
          const matchingProduct = products.find(p => p.name.toLowerCase() === value.toLowerCase());
          if (!matchingProduct) {
            updatedRow.productId = '';
            updatedRow.productName = '';
            updatedRow.price = 0;
          }
        }

        // Recalculate amount when quantity or price changes
        if (field === 'quantity' || field === 'price') {
          updatedRow.amount = updatedRow.quantity * updatedRow.price;
        }
        return updatedRow;
      }
      return row;
    }));
  }, [products]);
  const handleProductSelect = useCallback((product: Product) => {
    if (!focusedRowId) return;

    setStockRows(prev => {
      // Find if this product is already in another row (not the one being edited)
      const existingRowIndex = prev.findIndex(row => row.productId === product.id && row.id !== focusedRowId);

      if (existingRowIndex !== -1) {
        // Get the current row's potentially entered quantity
        const currentRow = prev.find(row => row.id === focusedRowId);
        const quantityToAdd = currentRow?.quantity || 0;

        // Merge into the existing row
        const newRows = prev.map((row, idx) => {
          if (idx === existingRowIndex) {
            const newQuantity = row.quantity + quantityToAdd;
            return {
              ...row,
              quantity: newQuantity,
              amount: newQuantity * row.price
            };
          }
          return row;
        });

        // Remove the focused row
        const finalRows = newRows.filter(row => row.id !== focusedRowId);

        toast({
          title: "Product already in list",
          description: `Merged "${product.name}" quantity.`,
        });

        return finalRows.length > 0 ? finalRows : [{
          id: Date.now().toString(),
          productId: '',
          productName: '',
          quantity: 0,
          price: 0,
          amount: 0,
          searchTerm: ''
        }];
      }

      // Standard update if no duplicate found
      return prev.map(row => {
        if (row.id === focusedRowId) {
          return {
            ...row,
            productId: product.id,
            productName: product.name,
            searchTerm: product.name,
            price: product.costPrice,
            amount: row.quantity * product.costPrice
          };
        }
        return row;
      });
    });

    setFocusedRowId(null);
  }, [focusedRowId, toast]);
  const handleInputFocus = useCallback((rowId: string) => {
    setFocusedRowId(rowId);
  }, []);

  const [rowValidationErrors, setRowValidationErrors] = useState<string[]>([]);

  // 🚀 PERFORMANCE: Asynchronous validation using local database lookups
  useEffect(() => {
    const validate = async () => {
      const errors: string[] = [];
      const { localDb } = await import('@/lib/dexie');

      for (let index = 0; index < stockRows.length; index++) {
        const row = stockRows[index];
        if (!row.productId) {
          errors.push(`Row ${index + 1}: Please select a product`);
          continue;
        }
        if (row.quantity <= 0) {
          errors.push(`Row ${index + 1}: Quantity must be greater than 0`);
        }
        if (row.price < 0) {
          errors.push(`Row ${index + 1}: Price cannot be negative`);
        }

        // Check if product existed before the selected date
        const product = await localDb.products.get(row.productId);
        if (product) {
          const productCreationDate = new Date(product.createdAt);
          const selectedDate = new Date(stockEntryDate);

          // Compare at date level (ignore time)
          const productDate = new Date(productCreationDate.getFullYear(), productCreationDate.getMonth(), productCreationDate.getDate());
          const entryDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
          if (productDate.getTime() > entryDate.getTime()) {
            errors.push(`Row ${index + 1}: Product "${product.name}" was created on ${format(productCreationDate, 'PPP')} which is after the selected stock date`);
          }
        }
      }
      setRowValidationErrors(errors);
    };

    validate();
  }, [stockRows, stockEntryDate]);

  const handleBulkSave = useCallback(async () => {
    const errors = [...rowValidationErrors];

    // Add date validation
    const dateError = validateStockDate(stockEntryDate);
    if (dateError) {
      errors.push(dateError);
    }
    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors.join(', '),
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      let successCount = 0;
      const failureCount = 0;

      // Create a unique purchase session ID
      const purchaseSessionId = Date.now().toString();
      const changeReason = `Purchase: ${supplierName || 'Unknown Supplier'} | Invoice: ${invoiceNumber || 'N/A'} | Session: ${purchaseSessionId}`;

      const adjustments = stockRows.map((row, index) => ({
        productId: row.productId,
        quantity: row.quantity,
        type: 'RESTOCK',
        price: row.price,
        reason: `${changeReason} | Seq: ${index + 1}`,
        createdAt: stockEntryDate.toISOString()
      }));

      const businessId = currentBusiness?.id;
      if (!businessId) throw new Error("Business ID not found");

      const result = await bulkAdjustStockAction(adjustments, businessId, user?.id || '');

      if (result.success) {
        successCount = stockRows.length;
      } else {
        throw new Error(result.error);
      }
      if (successCount > 0) {
        toast({
          title: "Stock Added Successfully",
          description: `Added stock for ${successCount} product${successCount > 1 ? 's' : ''}`
        });

        // Clear the form and localStorage
        const newEmptyRow = {
          id: Date.now().toString(),
          productId: '',
          productName: '',
          quantity: 0,
          price: 0,
          amount: 0,
          searchTerm: ''
        };
        setStockRows([newEmptyRow]);
        setSupplierName('');
        setInvoiceNumber('');
        clearStoredData();

        // Refresh products and stock history immediately
        await Promise.all([loadProducts(), loadStockHistory()]);

        // Small delay to ensure UI updates
        setTimeout(() => {
          // Force re-render of any cached components
          window.dispatchEvent(new CustomEvent('inventory-updated'));
          window.dispatchEvent(new CustomEvent('stock-history-updated'));
        }, 100);
      }
      if (failureCount > 0) {
        toast({
          title: "Some Updates Failed",
          description: `${failureCount} product${failureCount > 1 ? 's' : ''} could not be updated`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error in bulk stock addition:', error);
      toast({
        title: "Error",
        description: "Failed to add stock. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [stockRows, currentBusiness?.id, user?.id, loadProducts, loadStockHistory, toast, rowValidationErrors, validateStockDate, clearStoredData, stockEntryDate, supplierName, invoiceNumber]);
  const totalAmount = stockRows.reduce((sum, row) => sum + row.amount, 0);
  const totalQuantity = stockRows.reduce((sum, row) => sum + row.quantity, 0);
  return <div className="space-y-4 md:space-y-6">
    <Card className="shadow-sm">
      <CardHeader className="pb-3 md:pb-6">
        <div className="space-y-3 md:space-y-0 md:flex md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base md:text-lg">Restock in Bulk</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Add stock for multiple products at once
            </p>
          </div>

          {/* Purchase Details Section */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Date Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 justify-start text-left font-normal w-full">
                    <CalendarIcon size={16} />
                    {format(stockEntryDate, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[100] bg-white shadow-lg" align="start">
                  <Calendar mode="single" selected={stockEntryDate} onSelect={date => date && setStockEntryDate(date)} disabled={date => {
                    // Find the earliest product creation date from selected products
                    const selectedProducts = stockRows.filter(row => row.productId).map(row => products.find(p => p.id === row.productId)).filter(Boolean);
                    if (selectedProducts.length === 0) return date < new Date('2000-01-01') || date > new Date();
                    const earliestCreationDate = selectedProducts.reduce((earliest, product) => {
                      const productDate = new Date(product!.createdAt);
                      return !earliest || productDate < earliest ? productDate : earliest;
                    }, null as Date | null);
                    return date < (earliestCreationDate || new Date('2000-01-01')) || date > new Date();
                  }} className={cn("p-3 pointer-events-auto", validateStockDate(stockEntryDate) && "border-destructive")} initialFocus />
                  {validateStockDate(stockEntryDate) && <div className="p-3 border-t bg-destructive/5">
                    <p className="text-sm text-destructive">{validateStockDate(stockEntryDate)}</p>
                  </div>}
                </PopoverContent>
              </Popover>

              {/* Supplier Name */}
              <Input placeholder="Supplier name" value={supplierName} onChange={e => setSupplierName(e.target.value)} className="w-full" />

              {/* Invoice Number */}
              <Input placeholder="Invoice number" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className="w-full" />
            </div>

            {/* Action buttons */}
            <div className="flex space-x-2">
              <Button onClick={addNewRow} variant="outline" className="gap-2 flex-1 md:flex-none">
                <Plus size={16} /> Add Row
              </Button>
              <Button onClick={handleBulkSave} disabled={isLoading || stockRows.length === 0} className="gap-2 flex-1 md:flex-none">
                <Save size={16} />
                {isLoading ? 'Saving...' : `Save All (${stockRows.length})`}
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 md:p-6">
        {isMobile ?
          // Mobile Card Layout
          <div className="p-4 space-y-4">
            {stockRows.map((row, index) => <MobileStockRow key={row.id} row={row} index={index} onUpdateRow={updateRow} onRemoveRow={removeRow} onInputFocus={handleInputFocus} onAddRowAfter={addRowAfter} onKeyDown={handleKeyDown} onMoveRow={moveRow} settings={settings} canRemove={stockRows.length > 1} products={products} stockEntryDate={stockEntryDate} isLastRow={index === stockRows.length - 1} totalRows={stockRows.length} />)}

            {/* Mobile Total */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Quantity:</span>
                    <span className="text-lg font-bold text-primary">
                      {formatNumber(totalQuantity)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Amount:</span>
                    <span className="text-lg font-bold text-primary">
                      {settings.currency} {formatNumber(totalAmount)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div> :
          // Desktop Table Layout
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Item</TableHead>
                  <TableHead className="w-[120px]">Qty</TableHead>
                  <TableHead className="w-[120px]">Price</TableHead>
                  <TableHead className="w-[120px]">Amount</TableHead>
                  <TableHead className="w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockRows.map((row, index) => {
                  // Check if product has date conflict
                  const hasDateConflict = row.productId ? (() => {
                    const product = products.find(p => p.id === row.productId);
                    if (product) {
                      const productCreationDate = new Date(product.createdAt);
                      const selectedDate = new Date(stockEntryDate);
                      const productDate = new Date(productCreationDate.getFullYear(), productCreationDate.getMonth(), productCreationDate.getDate());
                      const entryDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                      return productDate.getTime() > entryDate.getTime();
                    }
                    return false;
                  })() : false;
                  const conflictProduct = hasDateConflict ? products.find(p => p.id === row.productId) : null;
                  return <TableRow key={row.id} className={hasDateConflict ? "border-destructive border-2 bg-destructive/5" : ""}>
                    <TableCell>
                      <div className="relative">
                        <Input placeholder="Type to search products..." value={row.searchTerm} onChange={e => updateRow(row.id, 'searchTerm', e.target.value)} onFocus={() => handleInputFocus(row.id)} onKeyDown={e => handleKeyDown(e, row.id)} className={cn("w-full", hasDateConflict && "border-destructive")} />
                        {hasDateConflict && conflictProduct && <p className="text-xs text-destructive mt-1">
                          Product was created on {format(new Date(conflictProduct.createdAt), 'PPP')} - after selected date
                        </p>}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Input type="number" min="0" step="0.01" value={row.quantity || ''} onChange={e => updateRow(row.id, 'quantity', parseFloat(e.target.value) || 0)} onKeyDown={e => handleKeyDown(e, row.id)} placeholder="0" />
                    </TableCell>

                    <TableCell>
                      <Input type="number" min="0" step="0.01" value={row.price || ''} onChange={e => updateRow(row.id, 'price', parseFloat(e.target.value) || 0)} onKeyDown={e => handleKeyDown(e, row.id)} placeholder="0.00" />
                    </TableCell>

                    <TableCell>
                      <div className="font-medium">
                        {settings.currency} {formatNumber(row.amount)}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="icon" onClick={() => moveRow(row.id, 'up')} disabled={index === 0} className="h-8 w-8">
                          <ChevronUp size={14} />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => moveRow(row.id, 'down')} disabled={index === stockRows.length - 1} className="h-8 w-8">
                          <ChevronDown size={14} />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => removeRow(row.id)} disabled={stockRows.length === 1} className="h-8 w-8">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>;
                })}

                {/* Add Row Below button - only on the last row */}
                <TableRow className="border-none">
                  <TableCell colSpan={5} className="py-1 text-center">
                    <Button variant="ghost" size="sm" onClick={() => addRowAfter(stockRows[stockRows.length - 1].id)} className="gap-2 text-muted-foreground hover:text-foreground text-xs">
                      <Plus size={12} />
                      Add row below
                    </Button>
                  </TableCell>
                </TableRow>

                {/* Total Row */}
                <TableRow className="border-t-2">
                  <TableCell className="text-right font-medium">
                    Total Quantity:
                  </TableCell>
                  <TableCell className="font-bold text-lg">
                    {formatNumber(totalQuantity)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    Total Amount:
                  </TableCell>
                  <TableCell className="font-bold text-lg">
                    {settings.currency} {formatNumber(totalAmount)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>}

        {stockRows.length === 0 && <div className="text-center py-8 text-muted-foreground">
          No stock entries. Click &quot;Add Row&quot; to start adding stock.
        </div>}
      </CardContent>
    </Card>

    {/* Product Suggestions Panel - positioned here to appear above Stock Input History */}
    <ProductSuggestionsPanel suggestions={suggestions} isOpen={panelOpen} onClose={closePanel} onSelectProduct={handleProductSelect} searchTerm={focusedRow?.searchTerm || ''} />

    <StockInputHistory />
  </div>;
};
export default BulkStockAddTab;