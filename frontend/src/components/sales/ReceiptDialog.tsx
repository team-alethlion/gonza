"use client";

import React from 'react';
import { Sale } from '@/types';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerClose,
  DrawerTrigger,
  DrawerTitle
} from '@/components/ui/drawer';
import PrintableReceipt from '@/components/PrintableReceipt';
import { useIsMobile } from '@/hooks/use-mobile';
import { X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ReceiptDialogProps {
  isOpen: boolean;
  sale: Sale | null;
  currency: string;
  onOpenChange: (open: boolean) => void;
  includePaymentInfo?: boolean;
}

const ReceiptDialog: React.FC<ReceiptDialogProps> = ({
  isOpen,
  sale,
  currency,
  onOpenChange,
  includePaymentInfo = true
}) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerTitle className="sr-only">Sale Receipt</DrawerTitle>
          <div className="relative px-4 py-6 pb-8">
            <DrawerClose className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DrawerClose>
            <ScrollArea className="h-[75vh] pr-4 pb-4">
              {sale && <PrintableReceipt sale={sale} currency={currency} isMobile={true} includePaymentInfo={includePaymentInfo} />}
            </ScrollArea>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogTitle className="sr-only">Sale Receipt</DialogTitle>
        <ScrollArea className="h-[80vh] pr-4">
          {sale && <PrintableReceipt sale={sale} currency={currency} includePaymentInfo={includePaymentInfo} />}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptDialog;
