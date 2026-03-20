"use client";
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import SaleItems from '@/components/sales/SaleItems';
import TaxRateInput from '@/components/sales/TaxRateInput';
import SaleTotals from '@/components/sales/SaleTotals';
import { SaleItem, FormErrors } from '@/types';

interface SaleItemsManagerProps {
  items: SaleItem[];
  onAddItem: () => void;
  onUpdateItem: (index: number, updatedItem: SaleItem) => void;
  onRemoveItem: (index: number) => void;
  taxRateInput: string;
  onTaxRateChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  errors: FormErrors;
  totalAmount: number;
  taxAmount: number;
  grandTotal: number;
  taxRate: number;
  currency: string;
  saleDate?: string;
}

const SaleItemsManager: React.FC<SaleItemsManagerProps> = ({
  items,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  taxRateInput,
  onTaxRateChange,
  errors,
  totalAmount,
  taxAmount,
  grandTotal,
  taxRate,
  currency,
  saleDate,
}) => {
  // Track previous items to detect changes
  const prevItemsRef = React.useRef<SaleItem[]>(items);

  // Auto-scroll to the SPECIFIC item that was added or updated
  React.useEffect(() => {
    const prevItems = prevItemsRef.current;

    // Find the index of the item that changed
    let changedIndex = -1;

    // Case 1: Item added (new array is longer)
    if (items.length > prevItems.length) {
      changedIndex = items.length - 1;
    }
    // Case 2: Item updated (length same, check quantities)
    else if (items.length === prevItems.length) {
      changedIndex = items.findIndex((item, index) => {
        const prevItem = prevItems[index];
        return prevItem && item.quantity !== prevItem.quantity;
      });
    }

    // Update previous ref for next render
    prevItemsRef.current = items;

    // Perform scroll if a change was detected
    if (changedIndex !== -1) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        const element = document.getElementById(`sale-item-${changedIndex}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
    }
  }, [items]);

  return (
    <Card className="mb-6">
      <CardContent className="pt-6 space-y-6">
        <SaleItems
          items={items}
          onAddItem={onAddItem}
          onUpdateItem={onUpdateItem}
          onRemoveItem={onRemoveItem}
          saleDate={saleDate}
        />

        <TaxRateInput
          taxRateInput={taxRateInput}
          onTaxRateChange={onTaxRateChange}
          errors={errors}
        />

        <SaleTotals
          totalAmount={totalAmount}
          taxAmount={taxAmount}
          grandTotal={grandTotal}
          taxRate={taxRate}
          currency={currency}
        />
      </CardContent>
    </Card>
  );
};

export default SaleItemsManager;