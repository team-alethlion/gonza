"use client";
import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Download, ChevronUp, ChevronDown, AlertTriangle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useProducts } from '@/hooks/useProducts';
import { useToast } from '@/hooks/use-toast';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBusiness } from '@/contexts/BusinessContext';
import { Product } from '@/types';
import ProductSuggestionsPanel from './ProductSuggestionsPanel';
import { useProductSuggestions } from '@/hooks/useProductSuggestions';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useRequisitions } from '@/hooks/useRequisitions';
import { getLowStockItemsAction, downloadRequisitionPDFAction } from '@/app/actions/inventory';
import SavedRequisitions from './SavedRequisitions';

interface RequisitionItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  searchTerm: string;
  urgentItem?: boolean;
}

interface MobileRequisitionRowProps {
  row: RequisitionItem;
  index: number;
  onUpdateRow: (id: string, field: keyof RequisitionItem, value: string | number | boolean) => void;
  onRemoveRow: (id: string) => void;
  onProductSelect: (product: Product, rowId: string) => void;
  onInputFocus: (rowId: string) => void;
  onAddRowAfter: (rowId: string) => void;
  onKeyDown: (e: React.KeyboardEvent, rowId: string) => void;
  onMoveRow: (rowId: string, direction: 'up' | 'down') => void;
  canRemove: boolean;
  isLastRow: boolean;
  totalRows: number;
}

const MobileRequisitionRow = ({
  row,
  index,
  onUpdateRow,
  onRemoveRow,
  onProductSelect,
  onInputFocus,
  onAddRowAfter,
  onKeyDown,
  onMoveRow,
  canRemove,
  isLastRow,
  totalRows
}: MobileRequisitionRowProps) => {
  return (
    <Card className={cn("mb-4 shadow-sm", row.urgentItem && "border-destructive")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">Item #{index + 1}</CardTitle>
            {row.urgentItem && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle size={10} className="mr-1" />
                Urgent
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onMoveRow(row.id, 'up')}
              disabled={index === 0}
              className="h-8 w-8"
            >
              <ChevronUp size={14} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onMoveRow(row.id, 'down')}
              disabled={index === totalRows - 1}
              className="h-8 w-8"
            >
              <ChevronDown size={14} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onRemoveRow(row.id)}
              disabled={!canRemove}
              className="h-8 w-8"
            >
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
          <Input
            placeholder="Type to search products..."
            value={row.searchTerm}
            onChange={(e) => onUpdateRow(row.id, 'searchTerm', e.target.value)}
            onFocus={() => onInputFocus(row.id)}
            onKeyDown={(e) => onKeyDown(e, row.id)}
            className="w-full"
          />
        </div>

        {/* Quantity and Urgent Flag */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Quantity
            </label>
            <Input
              type="number"
              min="0"
              step="1"
              value={row.quantity || ''}
              onChange={(e) => onUpdateRow(row.id, 'quantity', parseInt(e.target.value) || 0)}
              onKeyDown={(e) => onKeyDown(e, row.id)}
              placeholder="0"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={row.urgentItem || false}
                onChange={(e) => onUpdateRow(row.id, 'urgentItem', e.target.checked)}
                className="rounded"
              />
              Mark as urgent
            </label>
          </div>
        </div>

        {/* Add Row Button - only show on last row */}
        {isLastRow && (
          <div className="flex justify-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddRowAfter(row.id)}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <Plus size={14} />
              Add row below
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const RequisitionTab = () => {
  const { user } = useAuth();
  const { products } = useProducts(user?.id, 10000); 
  const { settings } = useBusinessSettings();
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [requisitionItems, setRequisitionItems] = useState<RequisitionItem[]>([
    {
      id: '1',
      productId: '',
      productName: '',
      quantity: 0,
      searchTerm: '',
      urgentItem: false
    }
  ]);

  const [requisitionTitle, setRequisitionTitle] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [isLowStockLoading, setIsLowStockLoading] = useState(false);

  // 🚀 PERFORMANCE: Fetch low stock items from backend instead of filtering 10,000 products in frontend
  useEffect(() => {
    const fetchLowStock = async () => {
      if (!currentBusiness?.id) return;
      setIsLowStockLoading(true);
      try {
        const result = await getLowStockItemsAction(currentBusiness.id);
        if (result.success) {
          setLowStockItems(result.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch low stock alerts:", err);
      } finally {
        setIsLowStockLoading(false);
      }
    };
    fetchLowStock();
  }, [currentBusiness?.id]);

  // Product suggestions hook
  const focusedRow = requisitionItems.find(row => row.id === focusedRowId);
  const {
    suggestions,
    isOpen: panelOpen,
    closePanel
  } = useProductSuggestions(products, focusedRow?.searchTerm || '');

  // Low stock pagination
  const [lowStockExpanded, setLowStockExpanded] = useState(false);
  const [lowStockPage, setLowStockPage] = useState(1);
  const lowStockItemsPerPage = 15;

  const paginatedLowStockItems = lowStockItems.slice(
    (lowStockPage - 1) * lowStockItemsPerPage,
    lowStockPage * lowStockItemsPerPage
  );

  const totalLowStockPages = Math.ceil(lowStockItems.length / lowStockItemsPerPage);

  // Initialize requisitions hook
  const {
    requisitions,
    isLoading: requisitionsLoading,
    loadRequisitions,
    createRequisition,
    deleteRequisition
  } = useRequisitions(user?.id, currentBusiness?.id);

  const formatNumber = (num: number) => {
    return Math.round(num).toLocaleString();
  };

  // Calculate total amount for requisition items
  const calculateTotalAmount = () => {
    return requisitionItems.reduce((total, item) => {
      if (!item.productId || !item.quantity) return total;
      const product = products.find(p => p.id === item.productId);
      if (!product) return total;
      return total + (product.costPrice * item.quantity);
    }, 0);
  };

  const totalAmount = calculateTotalAmount();

  const addNewRow = useCallback(() => {
    const newRow: RequisitionItem = {
      id: Date.now().toString(),
      productId: '',
      productName: '',
      quantity: 0,
      searchTerm: '',
      urgentItem: false
    };
    setRequisitionItems(prev => [...prev, newRow]);
  }, []);

  const addRowAfter = useCallback((afterRowId: string) => {
    const newRow: RequisitionItem = {
      id: Date.now().toString(),
      productId: '',
      productName: '',
      quantity: 0,
      searchTerm: '',
      urgentItem: false
    };
    setRequisitionItems(prev => {
      const index = prev.findIndex(row => row.id === afterRowId);
      const newRows = [...prev];
      newRows.splice(index + 1, 0, newRow);
      return newRows;
    });
  }, []);

  const moveRow = useCallback((rowId: string, direction: 'up' | 'down') => {
    setRequisitionItems(prev => {
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
    if (requisitionItems.length > 1) {
      setRequisitionItems(prev => prev.filter(row => row.id !== id));
      if (focusedRowId === id) {
        setFocusedRowId(null);
      }
    }
  }, [requisitionItems.length, focusedRowId]);

  const updateRow = useCallback((id: string, field: keyof RequisitionItem, value: string | number | boolean) => {
    setRequisitionItems(prev => prev.map(row => {
      if (row.id === id) {
        const updatedRow = { ...row, [field]: value };

        // If searchTerm is updated, clear product selection if it doesn't match
        if (field === 'searchTerm' && typeof value === 'string') {
          const matchingProduct = products.find(p => p.name.toLowerCase() === value.toLowerCase());
          if (!matchingProduct) {
            updatedRow.productId = '';
            updatedRow.productName = '';
          }
        }

        return updatedRow;
      }
      return row;
    }));
  }, [products]);

  const handleProductSelect = useCallback((product: Product) => {
    if (!focusedRowId) return;
    setRequisitionItems(prev => prev.map(row => {
      if (row.id === focusedRowId) {
        return {
          ...row,
          productId: product.id,
          productName: product.name,
          searchTerm: product.name
        };
      }
      return row;
    }));
    setFocusedRowId(null);
  }, [focusedRowId]);

  const handleInputFocus = useCallback((rowId: string) => {
    setFocusedRowId(rowId);
  }, []);

  const addLowStockItem = useCallback((product: any) => {
    const existingRow = requisitionItems.find(row => row.productId === product.id);
    if (existingRow) {
      toast({
        title: "Item already added",
        description: `${product.name} is already in the requisition list.`,
        variant: "destructive"
      });
      return;
    }

    const newRow: RequisitionItem = {
      id: Date.now().toString(),
      productId: product.id,
      productName: product.name,
      quantity: Math.max(1, product.min_stock - product.stock),
      searchTerm: product.name,
      urgentItem: product.stock === 0 
    };
    setRequisitionItems(prev => [...prev, newRow]);
  }, [requisitionItems, toast]);

  // 🚀 PERFORMANCE: Use backend-generated PDF for consistency and reliability
  const handleDownloadSavedPDF = useCallback(async (requisitionId: string) => {
    try {
      const result = await downloadRequisitionPDFAction(requisitionId);
      if (result.success && result.data) {
        const blob = new Blob([result.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Requisition_${requisitionId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast({
        title: "Download failed",
        description: err.message || "Could not generate PDF from server.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const saveRequisition = useCallback(async () => {
    if (!user || !currentBusiness) return;

    const validItems = requisitionItems.filter(item => item.productId && item.quantity > 0);

    if (validItems.length === 0) {
      toast({
        title: "No items to save",
        description: "Please add at least one item with a quantity greater than 0.",
        variant: "destructive"
      });
      return;
    }

    if (!requisitionTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for this requisition.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const requisitionData = validItems.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        urgentItem: item.urgentItem || false
      }));

      await createRequisition(requisitionTitle, requisitionData, notes);

      // Reset form but keep it visible
      setRequisitionItems([{
        id: Date.now().toString(),
        productId: '',
        productName: '',
        quantity: 0,
        searchTerm: '',
        urgentItem: false
      }]);
      setRequisitionTitle('');
      setNotes('');

    } catch (error) {
      console.error('Error saving requisition:', error);
      toast({
        title: "Error",
        description: "Failed to save requisition. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, currentBusiness, requisitionItems, requisitionTitle, notes, toast, createRequisition]);

  const totalQuantity = requisitionItems.reduce((sum, row) => sum + row.quantity, 0);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-orange-800 flex items-center gap-2">
                <AlertTriangle size={20} />
                Low Stock Items ({lowStockItems.length})
              </CardTitle>
              {isLowStockLoading && <Loader2 className="h-4 w-4 animate-spin text-orange-500" />}
              {!lowStockExpanded && lowStockItems.length > lowStockItemsPerPage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLowStockExpanded(true)}
                  className="text-orange-700 hover:text-orange-800"
                >
                  View All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-700 mb-3">
              The following items are running low or out of stock. Click to add them to your requisition:
            </p>
            <div className="flex flex-wrap gap-2">
              {(lowStockExpanded ? paginatedLowStockItems : lowStockItems.slice(0, 5)).map(product => (
                <Button
                  key={product.id}
                  variant="outline"
                  size="sm"
                  onClick={() => addLowStockItem(product)}
                  className="text-xs border-orange-300 hover:bg-orange-100"
                >
                  {product.name} ({product.stock}/{product.min_stock})
                </Button>
              ))}
              {!lowStockExpanded && lowStockItems.length > 5 && (
                <span className="text-xs text-orange-600 self-center">
                  +{lowStockItems.length - 5} more items
                </span>
              )}
            </div>

            {lowStockExpanded && (
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLowStockPage(prev => Math.max(1, prev - 1))}
                    disabled={lowStockPage === 1}
                  >
                    <ChevronLeft size={14} />
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Page {lowStockPage} of {totalLowStockPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLowStockPage(prev => Math.min(totalLowStockPages, prev + 1))}
                    disabled={lowStockPage === totalLowStockPages}
                  >
                    Next
                    <ChevronRight size={14} />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLowStockExpanded(false);
                    setLowStockPage(1);
                  }}
                  className="text-orange-700 hover:text-orange-800"
                >
                  Show Less
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Requisition Form */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 md:pb-6">
          <div className="space-y-3 md:space-y-0 md:flex md:items-start md:justify-between">
            <div className="space-y-3 flex-1">
              <CardTitle className="text-base md:text-lg">Purchase Requisition</CardTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">
                    Requisition Title *
                  </label>
                  <Input
                    placeholder="Enter requisition title"
                    value={requisitionTitle}
                    onChange={(e) => setRequisitionTitle(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">
                    Notes
                  </label>
                  <Textarea
                    placeholder="Additional notes or requirements"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full min-h-[60px]"
                  />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                onClick={addNewRow}
                variant="outline"
                className="gap-2 flex-1 md:flex-none"
              >
                <Plus size={16} /> Add Item
              </Button>
              <Button
                onClick={saveRequisition}
                disabled={isLoading}
                variant="secondary"
                className="gap-2 flex-1 md:flex-none"
              >
                Save
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 md:p-6">
          {isMobile ? (
            // Mobile Card Layout
            <div className="p-4 space-y-4">
              {requisitionItems.map((row, index) => (
                <MobileRequisitionRow
                  key={row.id}
                  row={row}
                  index={index}
                  onUpdateRow={updateRow}
                  onRemoveRow={removeRow}
                  onProductSelect={handleProductSelect}
                  onInputFocus={handleInputFocus}
                  onAddRowAfter={addRowAfter}
                  onKeyDown={handleKeyDown}
                  onMoveRow={moveRow}
                  canRemove={requisitionItems.length > 1}
                  isLastRow={index === requisitionItems.length - 1}
                  totalRows={requisitionItems.length}
                />
              ))}

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
            </div>
          ) : (
            // Desktop Table Layout
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Item</TableHead>
                    <TableHead className="w-[80px]">Qty</TableHead>
                    <TableHead className="w-[100px]">Unit Cost</TableHead>
                    <TableHead className="w-[100px]">Amount</TableHead>
                    <TableHead className="w-[80px]">Urgent</TableHead>
                    <TableHead className="w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requisitionItems.map((row, index) => {
                    const product = products.find(p => p.id === row.productId);
                    const itemAmount = product && row.quantity ? product.costPrice * row.quantity : 0;

                    return (
                      <TableRow key={row.id} className={row.urgentItem ? "bg-destructive/5" : ""}>
                        <TableCell>
                          <div className="relative">
                            <Input
                              placeholder="Type to search products..."
                              value={row.searchTerm}
                              onChange={(e) => updateRow(row.id, 'searchTerm', e.target.value)}
                              onFocus={() => handleInputFocus(row.id)}
                              onKeyDown={(e) => handleKeyDown(e, row.id)}
                              className="w-full"
                            />
                          </div>
                        </TableCell>

                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={row.quantity || ''}
                            onChange={(e) => updateRow(row.id, 'quantity', parseInt(e.target.value) || 0)}
                            onKeyDown={(e) => handleKeyDown(e, row.id)}
                            placeholder="0"
                          />
                        </TableCell>

                        <TableCell className="text-sm">
                          {product ? `${settings.currency} ${formatNumber(product.costPrice)}` : '-'}
                        </TableCell>

                        <TableCell className="text-sm font-medium">
                          {itemAmount > 0 ? `${settings.currency} ${formatNumber(itemAmount)}` : '-'}
                        </TableCell>

                        <TableCell>
                          <input
                            type="checkbox"
                            checked={row.urgentItem || false}
                            onChange={(e) => updateRow(row.id, 'urgentItem', e.target.checked)}
                            className="rounded"
                          />
                        </TableCell>

                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => moveRow(row.id, 'up')}
                              disabled={index === 0}
                              className="h-8 w-8"
                            >
                              <ChevronUp size={14} />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => moveRow(row.id, 'down')}
                              disabled={index === requisitionItems.length - 1}
                              className="h-8 w-8"
                            >
                              <ChevronDown size={14} />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => removeRow(row.id)}
                              disabled={requisitionItems.length === 1}
                              className="h-8 w-8"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Add Row Below button */}
                  <TableRow className="border-none">
                    <TableCell colSpan={6} className="py-1 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addRowAfter(requisitionItems[requisitionItems.length - 1].id)}
                        className="gap-2 text-muted-foreground hover:text-foreground text-xs"
                      >
                        <Plus size={12} />
                        Add row below
                      </Button>
                    </TableCell>
                  </TableRow>

                  {/* Total Row */}
                  <TableRow className="border-t-2">
                    <TableCell className="text-right font-medium">
                      Totals:
                    </TableCell>
                    <TableCell className="font-bold text-lg">
                      {formatNumber(totalQuantity)}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell className="font-bold text-lg">
                      {settings.currency} {formatNumber(totalAmount)}
                    </TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}

          {requisitionItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No items added. Click "Add Item" to start creating your requisition.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Suggestions Panel */}
      <ProductSuggestionsPanel
        suggestions={suggestions}
        isOpen={panelOpen}
        onClose={closePanel}
        onSelectProduct={handleProductSelect}
        searchTerm={focusedRow?.searchTerm || ''}
      />

      {/* Saved Requisitions */}
      <SavedRequisitions
        requisitions={requisitions}
        isLoading={requisitionsLoading}
        onRefresh={loadRequisitions}
        onDelete={deleteRequisition}
        onDownloadPDF={handleDownloadSavedPDF}
        businessName={settings.businessName}
      />
    </div>
  );
};

export default RequisitionTab;