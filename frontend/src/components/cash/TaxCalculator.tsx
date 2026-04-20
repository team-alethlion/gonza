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
  // 🚀 FIX: Use local string state to allow free typing of decimals/multi-digits
  const [inputValue, setInputValue] = React.useState(taxPercentage.toString());

  // Sync local state if prop changes externally (e.g. on mount or reset)
  React.useEffect(() => {
    if (parseFloat(inputValue) !== taxPercentage) {
        setInputValue(taxPercentage.toString());
    }
  }, [taxPercentage]);

  // Debounce the parent update to avoid jittery refreshes
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const val = parseFloat(inputValue);
      if (!isNaN(val) && val !== taxPercentage) {
        onTaxChange(Math.max(0, Math.min(100, val)));
      }
    }, 600); // 600ms wait after typing stops

    return () => clearTimeout(timer);
  }, [inputValue, onTaxChange, taxPercentage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
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
          type="text" // Change to text to avoid browser step-fighting with decimals while typing
          inputMode="decimal"
          value={inputValue}
          onChange={handleInputChange}
          className="w-24 h-8 text-center font-bold"
          placeholder="0.0"
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
