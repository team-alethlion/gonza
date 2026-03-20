"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Product } from '@/types';
import { useStockHistory } from '@/hooks/useStockHistory';
import { useAuth } from '@/components/auth/AuthProvider';
import { Plus, Minus, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useProfiles } from '@/contexts/ProfileContext';
import { AlertCircle } from 'lucide-react';
import { useBusiness } from '@/contexts/BusinessContext';
import { bulkAdjustStockAction } from '@/app/actions/inventory';

interface StockManagementProps {
  product: Product;
  onStockUpdate: () => void;
}

const StockManagement: React.FC<StockManagementProps> = ({ product, onStockUpdate }) => {
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();
  const { stockHistory } = useStockHistory(user?.id, product.id);
  const { toast } = useToast();
  const { hasPermission } = useProfiles();
  const canAdjust = hasPermission('inventory', 'stock_adjustment');

  const [stockInQuantity, setStockInQuantity] = useState('');
  const [stockOutQuantity, setStockOutQuantity] = useState('');
  const [stockInReason, setStockInReason] = useState('');
  const [stockOutReason, setStockOutReason] = useState('');
  const [stockInDate, setStockInDate] = useState('');
  const [stockInTime, setStockInTime] = useState('');
  const [stockOutDate, setStockOutDate] = useState('');
  const [stockOutTime, setStockOutTime] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Initialize date/time to current values
  useEffect(() => {
    const now = new Date();
    const currentDate = format(now, 'yyyy-MM-dd');
    const currentTime = format(now, 'HH:mm:ss');

    setStockInDate(currentDate);
    setStockInTime(currentTime);
    setStockOutDate(currentDate);
    setStockOutTime(currentTime);
  }, []);

  // Get the initial stock date (chronologically first entry)
  const getInitialStockDate = (): Date | null => {
    if (stockHistory.length === 0) return null;
    const sortedHistory = [...stockHistory].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return sortedHistory[0]?.createdAt || null;
  };

  // Validate date/time against initial stock and product creation
  const validateDateTime = (dateStr: string, timeStr: string): string => {
    if (!dateStr || !timeStr) return 'Date and time are required.';

    // Create the proposed date
    const [year, month, day] = dateStr.split('-').map(Number);
    const timeParts = timeStr.split(':').map(Number);
    const [hours, minutes, seconds = 0] = timeParts;
    const proposedDate = new Date(year, month - 1, day, hours, minutes, seconds);

    // Check against product creation date first
    const productCreatedAt = new Date(product.createdAt);
    if (proposedDate.getTime() < productCreatedAt.getTime()) {
      return `Date cannot be earlier than product creation date (${format(productCreatedAt, 'PPP p')})`;
    }

    // Check against initial stock date - new date must be after initial stock
    const initialStockDate = getInitialStockDate();
    if (initialStockDate) {
      const proposedDateOnly = new Date(year, month - 1, day);
      const initialStockDateOnly = new Date(initialStockDate.getFullYear(), initialStockDate.getMonth(), initialStockDate.getDate());

      // If same date, time must be at least 2 seconds after initial stock time
      if (proposedDateOnly.getTime() === initialStockDateOnly.getTime()) {
        const timeDifference = proposedDate.getTime() - initialStockDate.getTime();
        if (timeDifference < 2000) { // 2 seconds in milliseconds
          return `Time must be at least 2 seconds after initial stock time (${format(initialStockDate, 'HH:mm:ss')}) on the same date.`;
        }
      }

      // Check if the proposed date is before the initial stock date
      if (proposedDate.getTime() < initialStockDate.getTime()) {
        return `Date must be after the initial stock entry date (${format(initialStockDate, 'PPP p')})`;
      }
    }

    return '';
  };

  const handleStockIn = async () => {
    const quantity = parseFloat(stockInQuantity);
    if (!quantity || quantity <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid positive number for stock in quantity.",
        variant: "destructive"
      });
      return;
    }

    if (!stockInReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for the stock adjustment.",
        variant: "destructive"
      });
      return;
    }

    // Validate date/time
    const dateError = validateDateTime(stockInDate, stockInTime);
    if (dateError) {
      setValidationError(dateError);
      toast({
        title: "Invalid Date/Time",
        description: dateError,
        variant: "destructive"
      });
      return;
    }

    setValidationError('');
    setIsProcessing(true);
    try {
      // Create the selected date
      const [year, month, day] = stockInDate.split('-').map(Number);
      const timeParts = stockInTime.split(':').map(Number);
      const [hours, minutes, seconds = 0] = timeParts;
      const selectedDate = new Date(year, month - 1, day, hours, minutes, seconds);

      const adjustments = [{
        productId: product.id,
        quantity: quantity,
        type: 'RESTOCK',
        reason: `Stock In: ${stockInReason}`,
        createdAt: selectedDate.toISOString()
      }];

      const result = await bulkAdjustStockAction(adjustments, currentBusiness?.id || '', user?.id || '');

      if (result.success) {
        setStockInQuantity('');
        setStockInReason('');
        // Reset to current date/time
        const now = new Date();
        setStockInDate(format(now, 'yyyy-MM-dd'));
        setStockInTime(format(now, 'HH:mm:ss'));
        onStockUpdate();

        toast({
          title: "Stock Updated",
          description: `Added ${quantity} units to ${product.name}. Stock updated atomically.`,
        });
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      toast({
        title: "Error",
        description: "Failed to update stock. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStockOut = async () => {
    const quantity = parseFloat(stockOutQuantity);
    if (!quantity || quantity <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid positive number for stock out quantity.",
        variant: "destructive"
      });
      return;
    }

    if (quantity > product.quantity) {
      toast({
        title: "Insufficient Stock",
        description: `Cannot remove ${quantity} units. Only ${product.quantity} units available.`,
        variant: "destructive"
      });
      return;
    }

    if (!stockOutReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for the stock adjustment.",
        variant: "destructive"
      });
      return;
    }

    // Validate date/time
    const dateError = validateDateTime(stockOutDate, stockOutTime);
    if (dateError) {
      setValidationError(dateError);
      toast({
        title: "Invalid Date/Time",
        description: dateError,
        variant: "destructive"
      });
      return;
    }

    setValidationError('');
    setIsProcessing(true);
    try {
      // Create the selected date
      const [year, month, day] = stockOutDate.split('-').map(Number);
      const timeParts = stockOutTime.split(':').map(Number);
      const [hours, minutes, seconds = 0] = timeParts;
      const selectedDate = new Date(year, month - 1, day, hours, minutes, seconds);

      const adjustments = [{
        productId: product.id,
        quantity: -quantity,
        type: 'ADJUSTMENT',
        reason: `Stock Out: ${stockOutReason}`,
        createdAt: selectedDate.toISOString()
      }];

      const result = await bulkAdjustStockAction(adjustments, currentBusiness?.id || '', user?.id || '');

      if (result.success) {
        setStockOutQuantity('');
        setStockOutReason('');
        // Reset to current date/time
        const now = new Date();
        setStockOutDate(format(now, 'yyyy-MM-dd'));
        setStockOutTime(format(now, 'HH:mm:ss'));
        onStockUpdate();

        toast({
          title: "Stock Updated",
          description: `Removed ${quantity} units from ${product.name}. Stock updated atomically.`,
        });
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      toast({
        title: "Error",
        description: "Failed to update stock. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const initialStockDate = getInitialStockDate();

  return (
    <div className="space-y-6">
      {/* Display initial stock date for reference */}
      {initialStockDate && (
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
          <div className="text-blue-800 text-sm">
            <strong>Initial Stock Date:</strong> {format(initialStockDate, 'PPP p')}
            <br />
            <span className="text-xs">New stock entries must be after this date/time</span>
          </div>
        </div>
      )}

      {/* Show validation error */}
      {validationError && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
          <div className="text-red-800 text-sm">{validationError}</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stock In */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <Plus className="h-5 w-5" />
              Stock In
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="stockInQuantity">Quantity to Add</Label>
              <Input
                id="stockInQuantity"
                type="number"
                min="0.01"
                step="0.01"
                value={stockInQuantity}
                onChange={(e) => setStockInQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="stockInDate" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Date
                </Label>
                <Input
                  id="stockInDate"
                  type="date"
                  value={stockInDate}
                  onChange={(e) => setStockInDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="stockInTime" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Time
                </Label>
                <Input
                  id="stockInTime"
                  type="time"
                  step="1"
                  value={stockInTime}
                  onChange={(e) => setStockInTime(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="stockInReason">Reason</Label>
              <Textarea
                id="stockInReason"
                value={stockInReason}
                onChange={(e) => setStockInReason(e.target.value)}
                placeholder="e.g., New purchase, Returns, etc."
              />
            </div>
            {canAdjust ? (
              <Button
                onClick={handleStockIn}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? 'Processing...' : 'Add Stock'}
              </Button>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-md text-muted-foreground text-sm italic">
                <AlertCircle className="h-4 w-4" />
                No permission to add stock
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock Out */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Minus className="h-5 w-5" />
              Stock Out
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="stockOutQuantity">Quantity to Remove</Label>
              <Input
                id="stockOutQuantity"
                type="number"
                min="0.01"
                step="0.01"
                max={product.quantity}
                value={stockOutQuantity}
                onChange={(e) => setStockOutQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Available: {product.quantity} units
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="stockOutDate" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Date
                </Label>
                <Input
                  id="stockOutDate"
                  type="date"
                  value={stockOutDate}
                  onChange={(e) => setStockOutDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="stockOutTime" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Time
                </Label>
                <Input
                  id="stockOutTime"
                  type="time"
                  step="1"
                  value={stockOutTime}
                  onChange={(e) => setStockOutTime(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="stockOutReason">Reason</Label>
              <Textarea
                id="stockOutReason"
                value={stockOutReason}
                onChange={(e) => setStockOutReason(e.target.value)}
                placeholder="e.g., Damaged, Lost, Expired, etc."
              />
            </div>
            {canAdjust ? (
              <Button
                onClick={handleStockOut}
                disabled={isProcessing}
                variant="destructive"
                className="w-full"
              >
                {isProcessing ? 'Processing...' : 'Remove Stock'}
              </Button>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-md text-muted-foreground text-sm italic">
                <AlertCircle className="h-4 w-4" />
                No permission to remove stock
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StockManagement;
