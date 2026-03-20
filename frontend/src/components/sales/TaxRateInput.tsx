"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TaxRateInputProps {
  taxRateInput: string;
  onTaxRateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  errors: {
    taxRate?: string;
  };
}

const TaxRateInput: React.FC<TaxRateInputProps> = ({
  taxRateInput,
  onTaxRateChange,
  errors,
}) => {
  return (
    <div className="grid gap-3">
      <Label htmlFor="taxRate">Tax Rate (%)</Label>
      <Input
        id="taxRate"
        name="taxRate"
        type="text"
        inputMode="decimal"
        value={taxRateInput}
        onChange={onTaxRateChange}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            // Focus the payment status selector
            const paymentStatusSelect = document.querySelector('[data-payment-status-select="true"]') as HTMLElement;
            if (paymentStatusSelect) {
              paymentStatusSelect.focus();
            } else {
              // Fallback to submit button
              const submitButton = document.querySelector('button[type="submit"]') as HTMLElement;
              submitButton?.focus();
            }
          }
        }}
        className={errors.taxRate ? 'border-red-500' : ''}
      />
      {errors.taxRate && (
        <p className="text-red-500 text-xs">{errors.taxRate}</p>
      )}
    </div>
  );
};

export default TaxRateInput;
