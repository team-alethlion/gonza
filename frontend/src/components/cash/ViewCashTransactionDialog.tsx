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
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { X, Eye } from 'lucide-react';
import { CashTransaction } from '@/types/cash';
import ImageViewer from '@/components/ui/ImageViewer';

interface ViewCashTransactionDialogProps {
  transaction: CashTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ViewCashTransactionDialog: React.FC<ViewCashTransactionDialogProps> = ({
  transaction,
  open,
  onOpenChange
}) => {
  const isMobile = useIsMobile();
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const { settings } = useBusinessSettings();

  if (!transaction) return null;

  const formatCurrency = (amount: number) => {
    const currency = settings?.currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'cash_in': return 'Cash In';
      case 'cash_out': return 'Cash Out';
      case 'transfer_in': return 'Transfer In';
      case 'transfer_out': return 'Transfer Out';
      default: return type;
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'cash_in':
      case 'transfer_in':
        return 'bg-green-100 text-green-800';
      case 'cash_out':
      case 'transfer_out':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const content = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Date</label>
          <p className="text-sm">{transaction.date.toLocaleDateString()}</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Amount</label>
          <p className={`text-lg font-semibold ${
            transaction.transactionType === 'cash_in' || transaction.transactionType === 'transfer_in' 
              ? 'text-green-600' 
              : 'text-red-600'
          }`}>
            {formatCurrency(transaction.amount)}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Transaction Type</label>
        <Badge className={getTransactionTypeColor(transaction.transactionType)}>
          {getTransactionTypeLabel(transaction.transactionType)}
        </Badge>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Description</label>
        <p className="text-sm">{transaction.description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Category</label>
          <p className="text-sm">{transaction.category || 'Not specified'}</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Payment Method</label>
          <p className="text-sm">{transaction.paymentMethod || 'Not specified'}</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Person in Charge</label>
        <p className="text-sm">{transaction.personInCharge || 'Not specified'}</p>
      </div>

      {transaction.tags && transaction.tags.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Tags</label>
          <div className="flex flex-wrap gap-1">
            {transaction.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {transaction.receiptImage && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Receipt</label>
          <div className="relative">
            <img 
              src={transaction.receiptImage} 
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
                <DrawerTitle className="text-lg">Transaction Details</DrawerTitle>
              </DrawerHeader>
              <ScrollArea className="h-[calc(85vh-120px)] pr-4">
                {content}
              </ScrollArea>
            </div>
          </DrawerContent>
        </Drawer>

        {transaction.receiptImage && (
          <ImageViewer
            isOpen={imageViewerOpen}
            onOpenChange={setImageViewerOpen}
            imageUrl={transaction.receiptImage}
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
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            {content}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {transaction.receiptImage && (
        <ImageViewer
          isOpen={imageViewerOpen}
          onOpenChange={setImageViewerOpen}
          imageUrl={transaction.receiptImage}
          imageAlt="Receipt image"
        />
      )}
    </>
  );
};

export default ViewCashTransactionDialog;
