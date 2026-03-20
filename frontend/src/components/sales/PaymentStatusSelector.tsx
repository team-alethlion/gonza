
import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PaymentStatusSelectorProps {
  paymentStatus: string;
  onPaymentStatusChange: (value: string) => void;
}

const PaymentStatusSelector: React.FC<PaymentStatusSelectorProps> = ({
  paymentStatus,
  onPaymentStatusChange,
}) => {
  return (
    <div className="grid gap-3">
      <Label htmlFor="paymentStatus">Payment Status</Label>
      <Select
        value={paymentStatus}
        onValueChange={onPaymentStatusChange}
      >
        <SelectTrigger 
          className="w-full"
          data-payment-status-select="true"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              // Focus the cash account switch
              const cashAccountSwitch = document.querySelector('[data-cash-account-switch="true"]') as HTMLElement;
              if (cashAccountSwitch) {
                cashAccountSwitch.focus();
              } else {
                // Fallback to submit button if no cash account section
                const submitButton = document.querySelector('button[type="submit"]') as HTMLElement;
                submitButton?.focus();
              }
            }
          }}
        >
          <SelectValue placeholder="Select payment status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Paid">Paid</SelectItem>
          <SelectItem value="NOT PAID">NOT PAID</SelectItem>
          <SelectItem value="Quote">Quote</SelectItem>
          <SelectItem value="Installment Sale">Installment Sale</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default PaymentStatusSelector;
