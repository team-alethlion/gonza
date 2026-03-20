"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Drawer, 
  DrawerContent,
  DrawerClose,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { X, Eye } from 'lucide-react';
import { Expense } from '@/hooks/useExpenses';
import { CashAccount } from '@/types/cash';
import ImageViewer from '@/components/ui/ImageViewer';

interface ViewExpenseDialogProps {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formatCurrency: (amount: number) => string;
  accounts: CashAccount[];
}

const ViewExpenseDialog: React.FC<ViewExpenseDialogProps> = ({
  expense,
  open,
  onOpenChange,
  formatCurrency,
  accounts
}) => {
  const isMobile = useIsMobile();
  const [imageViewerOpen, setImageViewerOpen] = useState(false);

  if (!expense) return null;

  const getCashAccountName = (accountId: string | null) => {
    if (!accountId) return null;
    const account = accounts.find(acc => acc.id === accountId);
    return account?.name || 'Unknown Account';
  };

  const content = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Date</label>
          <p className="text-sm">{expense.date.toLocaleDateString()}</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Amount</label>
          <p className="text-lg font-semibold text-red-600">{formatCurrency(expense.amount)}</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Description</label>
        <p className="text-sm">{expense.description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Category</label>
          {expense.category ? (
            <Badge variant="secondary">{expense.category}</Badge>
          ) : (
            <p className="text-sm text-muted-foreground">Not specified</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Payment Method</label>
          <p className="text-sm">{expense.paymentMethod || 'Not specified'}</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Person in Charge</label>
        <p className="text-sm">{expense.personInCharge || 'Not specified'}</p>
      </div>

      {expense.cashAccountId && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Cash Account</label>
          <Badge variant="outline">{getCashAccountName(expense.cashAccountId)}</Badge>
        </div>
      )}

      {expense.receiptImage && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Receipt</label>
          <div className="relative">
            <img 
              src={expense.receiptImage} 
              alt="Receipt" 
              className="max-w-full h-32 object-contain border rounded cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setImageViewerOpen(true)}
            />
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-2 right-2 opacity-80 hover:opacity-100"
              onClick={() => setImageViewerOpen(true)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="max-h-[85vh]">
            <div className="relative px-4 py-6 pb-8">
              <DrawerClose className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DrawerClose>
              <DrawerHeader className="px-0 pb-4">
                <DrawerTitle className="text-lg">Expense Details</DrawerTitle>
              </DrawerHeader>
              <ScrollArea className="h-[calc(85vh-120px)] pr-4">
                {content}
              </ScrollArea>
            </div>
          </DrawerContent>
        </Drawer>

        {expense.receiptImage && (
          <ImageViewer
            isOpen={imageViewerOpen}
            onOpenChange={setImageViewerOpen}
            imageUrl={expense.receiptImage}
            imageAlt="Receipt image"
          />
        )}
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Expense Details</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            {content}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {expense.receiptImage && (
        <ImageViewer
          isOpen={imageViewerOpen}
          onOpenChange={setImageViewerOpen}
          imageUrl={expense.receiptImage}
          imageAlt="Receipt image"
        />
      )}
    </>
  );
};

export default ViewExpenseDialog;
