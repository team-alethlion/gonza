"use client";
import React, { useState } from 'react';
// @ts-ignore - react-barcode may not have types installed
import Barcode from 'react-barcode';
import { useBusiness } from '@/contexts/BusinessContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Product, StockHistoryEntry } from '@/types';
import { useRouter } from 'next/navigation';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { formatNumber } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Edit, Package, AlertCircle, ArrowLeft, Trash2, Copy, RefreshCw, Printer, Download, FileImage, Plus, Minus } from 'lucide-react';
import { exportBarcodeToJPEG } from '@/utils/exportBarcodeToJPEG';
import { exportSingleBarcodeToPDF } from '@/utils/exportBarcodeToPDF';
import { useFinancialVisibility } from '@/hooks/useFinancialVisibility';
import { format, isValid } from 'date-fns';
import DeleteProductDialog from './DeleteProductDialog';
import { useProducts } from '@/hooks/useProducts';
import { useStockHistory } from '@/hooks/useStockHistory';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { useProfiles } from '@/contexts/ProfileContext';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from '@/components/ui/label';

interface ProductDetailsProps {
  product: Product;
  stockHistory: StockHistoryEntry[];
  isLoadingHistory: boolean;
  onStockUpdate?: () => void;
}

const ProductDetails: React.FC<ProductDetailsProps> = ({
  product,
  stockHistory,
  isLoadingHistory,
  onStockUpdate
}) => {
  const router = useRouter();

  // Safe date formatting helper
  const formatDate = (date: any, formatStr: string) => {
    try {
      if (!date) return 'N/A';
      const dateObj = date instanceof Date ? date : new Date(date);
      if (!isValid(dateObj)) return 'N/A';
      return format(dateObj, formatStr);
    } catch (e) {
      return 'N/A';
    }
  };

  const { user } = useAuth();
  const { currentBusiness } = useBusiness();
  const { settings } = useBusinessSettings();
  const { updateProduct, deleteProduct } = useProducts(user?.id);
  const { createStockHistoryEntry, stockHistory: allStockHistory } = useStockHistory(user?.id, product.id);
  const { hasPermission } = useProfiles();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'Stock In' | 'Stock Out'>('Stock In');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  const [adjustmentDate, setAdjustmentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [adjustmentTime, setAdjustmentTime] = useState<string>(new Date().toTimeString().split(' ')[0]);
  const [isApplying, setIsApplying] = useState(false);
  const [barcodeDialogOpen, setBarcodeDialogOpen] = useState(false);
  const [showPriceOnBarcode, setShowPriceOnBarcode] = useState(true);
  const [printQuantity, setPrintQuantity] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const { formatFinancial, canViewCostPrice, canViewProfit, canViewSellingPrice } = useFinancialVisibility();

  const handleDeleteProduct = async () => {
    const result = await deleteProduct(product.id);
    if (result) {
      toast.success("Product deleted successfully");
      router.push('/agency/inventory');
      return true;
    }
    return false;
  };

  const handleDuplicateProduct = () => {
    toast.success("Duplicating product...");
    // Navigate to new product page with product id for duplication (Next.js query param)
    router.push(`/agency/inventory/new?duplicateId=${product.id}`);
  };

  const getStockStatusBadge = () => {
    if (product.quantity === 0) {
      return <Badge variant="destructive" className="text-sm">Out of stock</Badge>;
    }

    if (product.quantity <= product.minimumStock) {
      return <Badge variant="warning" className="bg-amber-500 text-sm">Low stock</Badge>;
    }

    return <Badge variant="success" className="bg-green-600 text-sm">In stock</Badge>;
  };

  // Get the initial stock date (chronologically first entry)
  const getInitialStockDate = (): Date | null => {
    const historyToCheck = stockHistory.length > 0 ? stockHistory : allStockHistory;
    if (historyToCheck.length === 0) return null;
    const sortedHistory = [...historyToCheck].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return sortedHistory[0]?.createdAt || null;
  };

  const validateAdjustmentDateTime = (dateStr: string, timeStr: string): string => {
    if (!dateStr) return '';

    const initialStockDate = getInitialStockDate();
    if (!initialStockDate) return '';

    // Create the proposed datetime with selected date and time
    const [year, month, day] = dateStr.split('-').map(Number);
    const timeParts = timeStr.split(':').map(Number);
    const [hours, minutes, seconds = 0] = timeParts;
    const proposedDateTime = new Date(year, month - 1, day, hours, minutes, seconds);

    if (proposedDateTime < initialStockDate) {
      return `Date and time cannot be before the initial stock date and time (${formatDate(initialStockDate, 'PPP p')})`;
    }

    return '';
  };

  const handleStockAdjustment = async () => {
    if (!adjustmentQuantity || adjustmentQuantity <= 0) {
      toast.error("Please enter a valid quantity greater than zero");
      return;
    }

    // Validate adjustment date and time
    const dateTimeError = validateAdjustmentDateTime(adjustmentDate, adjustmentTime);
    if (dateTimeError) {
      toast.error(dateTimeError);
      return;
    }

    setIsApplying(true);

    try {
      const previousQuantity = product.quantity;
      let newQuantity = previousQuantity;
      // Use standardized reason format
      const changeReason = adjustmentReason.trim()
        ? `${adjustmentType}: ${adjustmentReason}`
        : adjustmentType;

      if (adjustmentType === 'Stock In') {
        newQuantity = previousQuantity + adjustmentQuantity;
      } else if (adjustmentType === 'Stock Out') {
        newQuantity = Math.max(0, previousQuantity - adjustmentQuantity);
        if (newQuantity === 0 && previousQuantity < adjustmentQuantity) {
          toast.warning(`Attempted to remove ${adjustmentQuantity} items but only ${previousQuantity} were available. Stock is now 0.`);
        }
      }

      // Create proper datetime for the adjustment using selected date and time
      const [year, month, day] = adjustmentDate.split('-').map(Number);
      const timeParts = adjustmentTime.split(':').map(Number);
      const [hours, minutes, seconds = 0] = timeParts;
      const adjustmentDateTime = new Date(year, month - 1, day, hours, minutes, seconds);

      // Create the stock history entry which will automatically recalculate the stock chain
      const success = await createStockHistoryEntry(
        product.id,
        previousQuantity,
        newQuantity,
        changeReason,
        undefined,
        adjustmentDateTime,
        undefined,
        product.name
      );

      if (success) {
        // IMPORTANT: Also update the product record directly to ensure consistency
        const updated = await updateProduct(
          product.id,
          { quantity: newQuantity },
          undefined,
          false,
          'skip-history'
        );

        if (updated) {
          toast.success("Stock updated successfully");
          if (onStockUpdate) {
            onStockUpdate();
          }
          setAdjustmentQuantity(0);
          setAdjustmentReason('');
          setAdjustmentDate(new Date().toISOString().split('T')[0]);
          setAdjustmentTime(new Date().toTimeString().split(' ')[0]);
        } else {
          toast.error("History logged, but failed to update product quantity.");
        }
      } else {
        toast.error("Failed to update stock history");
      }
    } catch (error) {
      console.error('Error applying stock adjustment:', error);
      toast.error("Failed to apply stock adjustment. Please try again.");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Navigation and Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4 shadow-sm">
        <div className="flex flex-col space-y-3 lg:flex-row lg:justify-between lg:items-center lg:space-y-0 lg:gap-4">
          {/* Navigation and Refresh - Same Line */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/agency/inventory/products')}
              className="flex items-center gap-2 hover:bg-gray-50 text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Products
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onStockUpdate}
              className="flex items-center gap-1 text-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Data
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col space-y-2 lg:flex-row lg:items-center lg:space-y-0 lg:gap-2">
            {/* Duplicate Button */}
            {hasPermission('inventory', 'create') && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDuplicateProduct}
                className="flex items-center justify-center gap-2 w-full lg:w-auto hover:bg-blue-50 hover:border-blue-300 text-sm"
              >
                <Copy className="h-4 w-4" />
                Duplicate
              </Button>
            )}

            {/* Primary Action - Edit Button with Secondary Color */}
            {hasPermission('inventory', 'edit') && (
              <Button
                onClick={() => router.push(`/agency/inventory/edit/${product.id}`)}
                className="flex items-center justify-center gap-2 w-full lg:w-auto bg-secondary hover:bg-secondary/90 text-sm"
                size="sm"
              >
                <Edit className="h-4 w-4" />
                Edit Product
              </Button>
            )}

            {/* Barcode Label Dialog Button */}
            <Dialog open={barcodeDialogOpen} onOpenChange={setBarcodeDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center justify-center gap-2 w-full lg:w-auto hover:bg-green-50 hover:border-green-300 text-sm"
                >
                  <Printer className="h-4 w-4" />
                  Barcode Label
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Barcode Label Preview</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center py-6 bg-gray-50 rounded-lg border border-dashed">
                  {product.barcode ? (
                    <div className="bg-white p-6 shadow-sm rounded-md flex flex-col items-center">
                      <span className="text-lg font-bold mb-2 truncate max-w-[280px]">{product.name}</span>
                      <Barcode
                        value={product.barcode}
                        width={2}
                        height={80}
                        fontSize={16}
                      />
                      {showPriceOnBarcode && (
                        <span className="text-lg font-bold mt-2">
                          {settings.currency} {formatNumber(product.sellingPrice)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-center p-6 text-muted-foreground">
                      <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>No barcode available for this selection.</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Show Price</Label>
                      <p className="text-xs text-muted-foreground">Include price on the printed label</p>
                    </div>
                    <Switch
                      checked={showPriceOnBarcode}
                      onCheckedChange={setShowPriceOnBarcode}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Quantity to Print</Label>
                      <p className="text-xs text-muted-foreground">Number of labels to print</p>
                    </div>
                    <Input
                      type="number"
                      min="1"
                      className="w-20"
                      value={printQuantity}
                      onChange={(e) => setPrintQuantity(parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    {/* Print Button */}
                    <Button
                      className="w-full gap-2"
                      disabled={!product.barcode}
                      onClick={() => {
                        const priceText = showPriceOnBarcode
                          ? `TEXT 15,180,"3",0,1,1,"${settings.currency} ${formatNumber(product.sellingPrice)}"\n`
                          : '';

                        fetch('http://localhost:5000/print/label', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          mode: 'cors',
                          body: JSON.stringify({
                            PrinterName: settings.defaultPrinterName || 'Label Printer',
                            Content: `SIZE 50 mm, 30 mm\nGAP 3 mm, 0 mm\nCLS\nTEXT 15,20,"3",0,1,1,"${product.name}"\nBARCODE 15,70,"128",60,1,0,2,2,"${product.barcode}"\n${priceText}PRINT ${printQuantity}\n`
                          })
                        }).then(() => {
                          toast.success(`${printQuantity} label${printQuantity > 1 ? 's' : ''} sent to printer`);
                        }).catch(err => {
                          console.error('Failed to print label:', err);
                          toast.error('Printing failed. Make sure Printer Bridge is running.');
                        });
                      }}
                    >
                      <Printer className="h-4 w-4" />
                      Print {printQuantity} Label{printQuantity > 1 ? 's' : ''}
                    </Button>

                    {/* Divider */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or Download</span>
                      </div>
                    </div>

                    {/* Export Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="gap-2"
                        disabled={!product.barcode || isExporting}
                        onClick={async () => {
                          setIsExporting(true);
                          try {
                            await exportBarcodeToJPEG({
                              productName: product.name,
                              barcodeValue: product.barcode || '',
                              price: product.sellingPrice,
                              currency: settings.currency,
                              showPrice: showPriceOnBarcode,
                            });
                            toast.success('Barcode exported as JPEG');
                          } catch (error) {
                            console.error('Export failed:', error);
                            toast.error('Failed to export barcode');
                          } finally {
                            setIsExporting(false);
                          }
                        }}
                      >
                        <FileImage className="h-4 w-4" />
                        JPEG
                      </Button>
                      <Button
                        variant="outline"
                        className="gap-2"
                        disabled={!product.barcode || isExporting}
                        onClick={async () => {
                          setIsExporting(true);
                          try {
                            await exportSingleBarcodeToPDF({
                              productName: product.name,
                              barcodeValue: product.barcode || '',
                              price: product.sellingPrice,
                              currency: settings.currency,
                              showPrice: showPriceOnBarcode,
                            });
                            toast.success('Barcode exported as PDF');
                          } catch (error) {
                            console.error('Export failed:', error);
                            toast.error('Failed to export barcode');
                          } finally {
                            setIsExporting(false);
                          }
                        }}
                      >
                        <Download className="h-4 w-4" />
                        PDF
                      </Button>
                    </div>

                    <Button variant="outline" className="w-full" onClick={() => setBarcodeDialogOpen(false)}>
                      Close
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Delete Button - Below Edit */}
            {hasPermission('inventory', 'delete') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                className="flex items-center justify-center gap-2 w-full lg:w-auto text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 hover:bg-red-50 text-sm"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Product Details</span>
              {getStockStatusBadge()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
              {product.imageUrl && (
                <div className="md:w-1/3">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-auto object-contain border rounded-md"
                  />
                </div>
              )}

              <div className={product.imageUrl ? 'md:w-2/3' : 'w-full'}>
                <h2 className="text-2xl font-bold mb-2">{product.name}</h2>

                <div className="mb-4 flex flex-wrap gap-2">
                  <Badge variant="outline">{product.category}</Badge>
                  <Badge variant="secondary">#{product.itemNumber}</Badge>
                </div>

                {product.description && (
                  <p className="text-gray-700 mb-4">{product.description}</p>
                )}

                <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <dt className="text-gray-500">Item Number:</dt>
                  <dd className="font-semibold">#{product.itemNumber}</dd>

                  {product.manufacturerBarcode && (
                    <>
                      <dt className="text-gray-500">Manufacturer Barcode:</dt>
                      <dd className="font-semibold">{product.manufacturerBarcode}</dd>
                    </>
                  )}

                  <dt className="text-gray-500">Quantity in Stock:</dt>
                  <dd className="font-semibold">{product.quantity % 1 === 0 ? product.quantity : product.quantity.toFixed(2)}</dd>

                  <dt className="text-gray-500">Minimum Stock Level:</dt>
                  <dd>{product.minimumStock}</dd>

                  <dt className="text-gray-500">Cost Price:</dt>
                  <dd>{canViewCostPrice ? `${settings.currency} ${formatFinancial(product.costPrice, 'cost')}` : '•••'}</dd>

                  <dt className="text-gray-500">Selling Price:</dt>
                  <dd>{canViewSellingPrice ? `${settings.currency} ${formatFinancial(product.sellingPrice, 'selling')}` : '•••'}</dd>

                  <dt className="text-gray-500">Total Cost:</dt>
                  <dd className="font-semibold">{canViewCostPrice ? `${settings.currency} ${formatNumber(product.quantity * product.costPrice)}` : '•••'}</dd>

                  <dt className="text-gray-500">Profit Margin:</dt>
                  <dd>
                    {canViewProfit ?
                      `${((product.sellingPrice - product.costPrice) / product.sellingPrice * 100).toFixed(2)}%`
                      : '•••'}
                  </dd>

                  {product.supplier && (
                    <>
                      <dt className="text-gray-500">Supplier:</dt>
                      <dd>{product.supplier}</dd>
                    </>
                  )}

                  <dt className="text-gray-500">Created:</dt>
                  <dd>{formatDate(product.createdAt, 'MMM d, yyyy')}</dd>

                  <dt className="text-gray-500">Last Updated:</dt>
                  <dd>{formatDate(product.updatedAt, 'MMM d, yyyy')}</dd>
                </dl>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              {product.quantity <= product.minimumStock && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-4 w-full flex items-center gap-3">
                  <AlertCircle className="text-amber-600 h-6 w-6 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-amber-800">Low Stock Alert</h4>
                    <p className="text-sm text-amber-700">
                      Current stock ({product.quantity}) is below or equal to the minimum threshold ({product.minimumStock}).
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Stock Management</CardTitle>
            </CardHeader>
            <CardContent>
              {hasPermission('inventory', 'stock_adjustment') ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Adjustment Type</label>
                    <div className="grid grid-cols-2 gap-4 mb-2">
                      <Button
                        type="button"
                        variant={adjustmentType === 'Stock In' ? 'default' : 'outline'}
                        onClick={() => setAdjustmentType('Stock In')}
                        className={`w-full ${adjustmentType === 'Stock In' ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Stock In
                      </Button>
                      <Button
                        type="button"
                        variant={adjustmentType === 'Stock Out' ? 'default' : 'outline'}
                        onClick={() => setAdjustmentType('Stock Out')}
                        className={`w-full ${adjustmentType === 'Stock Out' ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
                      >
                        <Minus className="mr-2 h-4 w-4" />
                        Stock Out
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Quantity</label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={adjustmentQuantity || ''}
                      onChange={(e) => setAdjustmentQuantity(parseFloat(e.target.value) || 0)}
                      placeholder="Enter quantity"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Reason (Optional)</label>
                    <Input
                      type="text"
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      placeholder="e.g., Weekly restock, Damaged goods"
                      maxLength={100}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium mb-1">Date</label>
                      <Input
                        type="date"
                        value={adjustmentDate}
                        onChange={(e) => setAdjustmentDate(e.target.value)}
                        min={product.createdAt ? new Date(product.createdAt).toISOString().split('T')[0] : undefined}
                        max={new Date().toISOString().split('T')[0]}
                        className={validateAdjustmentDateTime(adjustmentDate, adjustmentTime) ? 'border-destructive border-2 bg-destructive/5' : ''}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Time</label>
                      <Input
                        type="time"
                        step="1"
                        value={adjustmentTime}
                        onChange={(e) => setAdjustmentTime(e.target.value)}
                        className={validateAdjustmentDateTime(adjustmentDate, adjustmentTime) ? 'border-destructive border-2 bg-destructive/5' : ''}
                      />
                    </div>
                  </div>
                  {validateAdjustmentDateTime(adjustmentDate, adjustmentTime) && (
                    <p className="text-sm text-destructive mt-1">{validateAdjustmentDateTime(adjustmentDate, adjustmentTime)}</p>
                  )}

                  <Button
                    onClick={handleStockAdjustment}
                    disabled={isApplying || adjustmentQuantity <= 0 || !!validateAdjustmentDateTime(adjustmentDate, adjustmentTime)}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    <Package className="mr-2 h-4 w-4" />
                    {isApplying ? 'Applying...' : `Apply ${adjustmentType}`}
                  </Button>
                </div>
              ) : (
                <div className="py-4 text-center space-y-2">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    You do not have permission to perform stock adjustments.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <DeleteProductDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        product={product}
        onConfirm={handleDeleteProduct}
      />
    </div >
  );
};

export default ProductDetails;
