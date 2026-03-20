"use client";

import React from 'react';
import { Sale } from '@/types';
import ReceiptDialog from './ReceiptDialog';

interface SalesReceiptDialogProps {
  selectedSale: Sale | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
}

const SalesReceiptDialog: React.FC<SalesReceiptDialogProps> = ({
  selectedSale,
  isOpen,
  onOpenChange,
  currency
}) => {
  if (!selectedSale) return null;

  return (
    <ReceiptDialog
      sale={selectedSale}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      currency={currency}
    />
  );
};

export default SalesReceiptDialog;