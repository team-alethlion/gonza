"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Product } from '@/types';
import { BulkOperationProgress } from './BulkOperationProgress';

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProducts: Product[];
  onConfirm: () => void;
  isDeleting: boolean;
  deletionProgress?: {
    current: number;
    total: number;
  };
}

const BulkDeleteDialog: React.FC<BulkDeleteDialogProps> = ({
  open,
  onOpenChange,
  selectedProducts,
  onConfirm,
  isDeleting,
  deletionProgress
}) => {
  const progressPercentage = deletionProgress
    ? Math.round((deletionProgress.current / deletionProgress.total) * 100)
    : 0;

  // Prevent dialog from closing during deletion process
  const handleOpenChange = (newOpen: boolean) => {
    if (!isDeleting) {
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="pointer-events-auto">
        <DialogHeader>
          <DialogTitle>Delete Selected Products</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''}?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-40 overflow-y-auto">
          <div className="space-y-1">
            {selectedProducts.map((product) => (
              <div key={product.id} className="text-sm text-muted-foreground">
                • {product.name}
              </div>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        {isDeleting && deletionProgress && (
          <BulkOperationProgress
            title="Deleting Products..."
            currentCount={deletionProgress.current}
            totalCount={deletionProgress.total}
            status="processing"
          />
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? `Deleting... (${progressPercentage}%)` : `Delete ${selectedProducts.length} Product${selectedProducts.length > 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkDeleteDialog;
