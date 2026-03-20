"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TaxCalculatorProps {
  taxPercentage: number;
  onTaxChange: (percentage: number) => void;
  netProfitLoss: number;
  formatCurrency: (amount: number) => string;
}

const TaxCalculator: React.FC<TaxCalculatorProps> = ({
  taxPercentage,
  onTaxChange,
  netProfitLoss,
  formatCurrency
}) => {
  const handleTaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    onTaxChange(Math.max(0, Math.min(100, value))); // Clamp between 0-100
  };

  const taxAmount = netProfitLoss > 0 ? (netProfitLoss * taxPercentage) / 100 : 0;

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2">
        <Label htmlFor="tax-percentage" className="text-sm font-medium">
          Tax %:
        </Label>
        <Input
          id="tax-percentage"
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={taxPercentage}
          onChange={handleTaxChange}
          className="w-20 h-8 text-center"
        />
      </div>
      <div className="text-sm">
        <span className="text-muted-foreground">Tax Amount: </span>
        <span className="font-medium">{formatCurrency(taxAmount)}</span>
      </div>
    </div>
  );
};

export default TaxCalculator;
