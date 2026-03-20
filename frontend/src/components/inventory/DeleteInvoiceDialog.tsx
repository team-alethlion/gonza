"use client";
import React from 'react';
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

interface DeleteInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: {
    supplier: string;
    invoice: string;
    entries: StockHistoryEntry[];
  } | null;
  onConfirm: (entryIds: string[]) => Promise<boolean>;
}

export const DeleteInvoiceDialog: React.FC<DeleteInvoiceDialogProps> = ({
  open,
  onOpenChange,
  group,
  onConfirm
}) => {
  const handleConfirm = async () => {
    if (!group) return;
    
    const entryIds = group.entries.map(entry => entry.id);
    const success = await onConfirm(entryIds);
    if (success) {
      onOpenChange(false);
    }
  };

  if (!group) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Entire Invoice</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete all stock entries for this invoice?
            </p>
            <div className="bg-muted p-3 rounded-lg">
              <p><strong>Supplier:</strong> {group.supplier}</p>
              <p><strong>Invoice:</strong> {group.invoice}</p>
              <p><strong>Items:</strong> {group.entries.length} products will be affected</p>
            </div>
            <p className="text-destructive text-sm">
              This will permanently remove all stock history entries for this purchase and recalculate stock levels. This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive hover:bg-destructive/90"
          >
            Delete Invoice
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};