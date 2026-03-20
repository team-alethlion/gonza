
import React from "react";
import { formatNumber } from "@/lib/utils";

interface SaleTotalsProps {
  totalAmount: number;
  taxAmount: number;
  grandTotal: number;
  taxRate: number;
  currency: string;
}

const SaleTotals: React.FC<SaleTotalsProps> = ({
  totalAmount,
  taxAmount,
  grandTotal,
  taxRate,
  currency,
}) => {
  // Check if we should show the tax row
  const showTaxRow = taxRate > 0;

  return (
    <div className="bg-slate-50 p-4 rounded-md border">
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-center bg-gray-100 px-2 py-1 rounded-sm">
          <h3 className="font-medium">Subtotal</h3>
          <span className="font-medium">
            {currency} {formatNumber(totalAmount)}
          </span>
        </div>
        {showTaxRow && (
          <div className="flex justify-between items-center bg-gray-100 px-2 py-1 rounded-sm">
            <h3 className="font-medium">Tax ({taxRate}%)</h3>
            <span className="font-medium">
              {currency} {formatNumber(taxAmount)}
            </span>
          </div>
        )}
        <div className="h-px bg-gray-300 my-1"></div>
        <div className="flex justify-between items-center bg-gray-100 px-2 py-1 rounded-sm">
          <h3 className="font-semibold">Grand Total</h3>
          <span className="text-xl font-bold">
            {currency} {formatNumber(grandTotal)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SaleTotals;
