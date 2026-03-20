"use client";
import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { StockHistoryEntry } from '@/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react';

interface DeleteStockHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: StockHistoryEntry | null;
  onConfirm: (entryId: string) => Promise<boolean>;
}

const DeleteStockHistoryDialog: React.FC<DeleteStockHistoryDialogProps> = ({
  open,
  onOpenChange,
  entry,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!entry) return;

    setIsDeleting(true);

    try {
      const success = await onConfirm(entry.id);

      if (success) {
        toast({
          title: "Stock history deleted",
          description: "The stock history entry has been deleted and stock recalculated."
        });
        onOpenChange(false);
      } else {
        toast({
          title: "Delete failed",
          description: "Failed to delete stock history entry. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting stock history:', error);
      toast({
        title: "Error",
        description: "An error occurred while deleting the stock history.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
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

  // If this is a sale-related entry, show a restricted message
  if (isSaleRelatedEntry(entry)) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-blue-600" />
              Cannot Delete Sale-Related Entry
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This stock history entry was created by a sales operation and cannot be deleted directly.
              </p>

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
                  <strong>Note:</strong> To remove this entry, please edit or delete the corresponding sale in the Sales section.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  const stockChange = entry.newQuantity - entry.oldQuantity;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Stock History Entry
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Are you sure you want to delete this stock history entry? This action cannot be undone.
            </p>

            <div className="bg-muted p-3 rounded-lg space-y-2">
              <div className="font-medium">Entry Details:</div>
              <div className="text-sm space-y-1">
                <div><strong>Date:</strong> {format(entry.createdAt, 'PPP p')}</div>
                <div><strong>Change:</strong> {entry.oldQuantity} → {entry.newQuantity}</div>
                <div className={`${stockChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <strong>Impact:</strong> {stockChange >= 0 ? '+' : ''}{stockChange} units
                </div>
                <div><strong>Reason:</strong> {formatChangeReason(entry.changeReason)}</div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
              <div className="text-amber-800 text-sm">
                <strong>Warning:</strong> After deletion, the product's current stock will be automatically recalculated based on the remaining stock history entries.
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete Entry'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteStockHistoryDialog;