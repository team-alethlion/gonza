"use client";
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StockHistoryEntry } from '@/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useProfiles } from '@/contexts/ProfileContext';

interface EditStockHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: StockHistoryEntry | null;
  onConfirm: (entryId: string, newQuantity: number, newReason: string, newDate?: Date) => Promise<boolean>;
  isInitialStock?: boolean;
  stockHistory?: StockHistoryEntry[];
  productCreatedAt?: Date;
}

const EditStockHistoryDialog: React.FC<EditStockHistoryDialogProps> = ({
  open,
  onOpenChange,
  entry,
  onConfirm,
  isInitialStock = false,
  stockHistory = [],
  productCreatedAt,
}) => {
  const [quantityChange, setQuantityChange] = useState<number | ''>(0);
  const [newReason, setNewReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const { toast } = useToast();
  const { hasPermission } = useProfiles();

  // Get the initial stock date (chronologically first entry)
  const getInitialStockDate = (): Date | null => {
    if (stockHistory.length === 0) return null;
    const sortedHistory = [...stockHistory].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return sortedHistory[0]?.createdAt || null;
  };

  useEffect(() => {
    if (entry) {
      setQuantityChange(entry.newQuantity - entry.oldQuantity);
      setNewReason(entry.changeReason);
      setValidationError(''); // Clear validation error when entry changes
    }
  }, [entry]);

  const validateQuantityChange = (newChange: number, currentChange: number): string => {
    // If current change is negative, don't allow changing to positive
    if (currentChange < 0 && newChange > 0) {
      return 'Cannot change from negative to positive value.';
    }
    // If current change is positive, don't allow changing to negative
    if (currentChange > 0 && newChange < 0) {
      return 'Cannot change from positive to negative value.';
    }
    return '';
  };

  const handleQuantityChange = (value: string) => {
    // Always allow empty string so users can clear the field
    if (value === '') {
      setQuantityChange('');
      setValidationError('');
      return;
    }

    const numericValue = parseInt(value) || 0;
    const currentChange = quantityChange === '' ? 0 : quantityChange;

    const error = validateQuantityChange(numericValue, currentChange);

    // Only update the input if validation passes
    if (!error) {
      setQuantityChange(numericValue);
      setValidationError('');
    } else {
      // Show validation error but don't update the input
      setValidationError(error);
    }
  };

  const handleReasonChange = (value: string) => {
    setNewReason(value);
  };

  const handleSubmit = async (skipDateUpdate = false) => {
    if (!entry) return;

    const changeAmount = quantityChange === '' ? 0 : quantityChange;

    // Validate quantity change before submitting
    const originalChange = entry.newQuantity - entry.oldQuantity;
    const error = validateQuantityChange(changeAmount, originalChange);
    if (error) {
      toast({
        title: "Invalid quantity change",
        description: error,
        variant: "destructive"
      });
      return;
    }

    const newQuantity = entry.oldQuantity + changeAmount;

    if (!newReason.trim()) {
      toast({
        title: "Invalid reason",
        description: "Please provide a reason for this stock change",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await onConfirm(
        entry.id,
        newQuantity,
        newReason.trim()
      );

      if (success) {
        toast({
          title: "Stock history updated",
          description: "The stock history entry has been updated successfully."
        });
        onOpenChange(false);
      } else {
        toast({
          title: "Update failed",
          description: "Failed to update stock history entry. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating stock history:', error);
      toast({
        title: "Error",
        description: "An error occurred while updating the stock history.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (!entry) return null;

  // Check if this entry was created by a sale operation
  const isSaleRelatedEntry = (entry: StockHistoryEntry): boolean => {
    const saleReasons = ['Sale', 'Delete sale', 'Deleted Sale', 'Sale qty edit'];
    return saleReasons.some(reason => entry.changeReason.toLowerCase().includes(reason.toLowerCase()));
  };

  const formatChangeReason = (reason: string): string => {
    return reason
      .replace('Deleted sale', 'Deleted Sale');
  };

  // If this is initial stock, show form with date editing enabled but with validation
  if (isInitialStock) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Initial Stock Entry</DialogTitle>
            <DialogDescription>
              This is the initial stock entry. You can modify quantity, reason, and date, but the date must be earlier than all other stock transactions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity Change</Label>
              <Input
                id="quantity"
                type="number"
                value={quantityChange}
                onChange={(e) => handleQuantityChange(e.target.value)}
                className={validationError ? 'border-destructive border-2 bg-destructive/5 focus:border-destructive focus:ring-destructive' : ''}
              />
              {validationError && (
                <p className="text-sm text-destructive">{validationError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Change Reason</Label>
              <Input
                id="reason"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="Enter reason for stock change"
              />
            </div>

          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={() => handleSubmit()}
              disabled={isSubmitting || !hasPermission('inventory', 'stock_adjustment')}
            >
              {isSubmitting ? 'Updating...' : 'Update Entry'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // If this is a sale-related entry, show a restricted message
  if (isSaleRelatedEntry(entry)) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cannot Edit Sale-Related Entry</DialogTitle>
            <DialogDescription>
              This stock history entry was created by a sales operation and can only be modified through the Edit Sale form.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted p-3 rounded-lg space-y-2">
              <div className="font-medium">Entry Details:</div>
              <div className="text-sm space-y-1">
                <div><strong>Date:</strong> {format(entry.createdAt, 'PPP p')}</div>
                <div><strong>Change:</strong> {entry.oldQuantity} → {entry.newQuantity}</div>
                <div><strong>Reason:</strong> {formatChangeReason(entry.changeReason)}</div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <div className="text-blue-800 text-sm">
                <strong>Note:</strong> To modify this entry, please use the Edit Sale form in the Sales section.
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const originalChange = entry.newQuantity - entry.oldQuantity;
  const changeAmount = quantityChange === '' ? 0 : quantityChange;
  const newQuantity = entry.oldQuantity + changeAmount;
  const newChange = changeAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Stock History Entry</DialogTitle>
          <DialogDescription>
            Modify the details of this stock history entry. The product's current stock will be recalculated after saving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Original</Label>
              <div className="font-medium">
                {entry.oldQuantity} → {entry.newQuantity}
              </div>
              <div className={`text-xs ${originalChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {originalChange >= 0 ? '+' : ''}{originalChange}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">New</Label>
              <div className="font-medium">
                {entry.oldQuantity} → {newQuantity}
              </div>
              <div className={`text-xs ${newChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {newChange >= 0 ? '+' : ''}{newChange}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity Change</Label>
            <Input
              id="quantity"
              type="number"
              value={quantityChange}
              onChange={(e) => handleQuantityChange(e.target.value)}
              className={validationError ? 'border-destructive border-2 bg-destructive/5 focus:border-destructive focus:ring-destructive' : ''}
            />
            {entry && (
              <p className="text-xs text-muted-foreground">
                ⚠️ {(quantityChange === '' ? 0 : quantityChange) < 0
                  ? "Current change is negative - you cannot change to positive values"
                  : "Current change is positive - you cannot change to negative values"
                }
              </p>
            )}
            {validationError && (
              <p className="text-sm text-destructive">{validationError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Change Reason</Label>
            <Input
              id="reason"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="Enter reason for stock change"
            />
          </div>

        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={() => handleSubmit()}
            disabled={isSubmitting || !hasPermission('inventory', 'stock_adjustment')}
          >
            {isSubmitting ? 'Updating...' : 'Update Entry'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditStockHistoryDialog;