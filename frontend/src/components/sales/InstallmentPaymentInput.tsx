"use client";

import React, { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatNumber, formatNumberInput, parseNumberInput, cn } from '@/lib/utils';
import { InstallmentPayment } from '@/hooks/useInstallmentPayments';
import { PaymentChange } from '@/hooks/useLocalPaymentChanges';
import InstallmentPaymentHistory from './InstallmentPaymentHistory';

interface InstallmentPaymentInputProps {
  amountPaid: number;
  amountDue: number;
  grandTotal: number;
  currency: string;
  onAmountPaidChange: (amount: number) => void;
  onPaymentDateChange?: (date: Date) => void;
  paymentDate?: Date;
  maxAmount: number;
  saleId?: string;
  onPaymentStatusChange?: (status: 'Paid' | 'Installment Sale') => void;
  isEditing?: boolean;
  payments?: InstallmentPayment[];
  pendingChanges?: PaymentChange[];
  onStagePaymentChange?: (change: PaymentChange) => void;
  cashAccounts?: any[];
  onLinkToCash?: (paymentId: string, accountId: string) => Promise<void>;
  onUpdatePayment?: (paymentId: string, updates: { amount?: number; notes?: string; paymentDate?: Date }) => Promise<void>;
}

const InstallmentPaymentInput: React.FC<InstallmentPaymentInputProps> = ({
  amountPaid,
  amountDue,
  grandTotal,
  currency,
  onAmountPaidChange,
  onPaymentDateChange,
  paymentDate,
  maxAmount,
  saleId,
  onPaymentStatusChange,
  isEditing = false,
  payments = [],
  pendingChanges = [],
  onStagePaymentChange,
  cashAccounts = [],
  onLinkToCash,
  onUpdatePayment,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(paymentDate || new Date());

  // Local string state for amount input with smart formatting (commas + decimals)
  const [amountPaidInput, setAmountPaidInput] = useState(formatNumberInput(amountPaid?.toString() || '0'));

  // Sync local state when prop changes externally
  React.useEffect(() => {
    // Only update if the numeric deviation is significant to avoid fighting with the user's typing
    const currentVal = parseNumberInput(amountPaidInput);
    if (Math.abs(currentVal - amountPaid) > 0.001) {
      setAmountPaidInput(formatNumberInput(amountPaid.toString()));
    }
  }, [amountPaid]);


  // Calculate total from payment history, considering pending changes
  const getModifiedPayments = () => {
    return payments
      .filter(payment => {
        // Filter out deleted payments
        const deleteChange = pendingChanges.find(c => c.id === payment.id && c.type === 'delete');
        return !deleteChange;
      })
      .map(payment => {
        // Apply updates to payments
        const updateChange = pendingChanges.find(c => c.id === payment.id && c.type === 'update');
        if (updateChange && updateChange.updatedData) {
          return {
            ...payment,
            amount: updateChange.updatedData.amount ?? payment.amount,
            notes: updateChange.updatedData.notes ?? payment.notes,
          };
        }
        return payment;
      });
  };

  const modifiedPayments = getModifiedPayments();
  const totalPaidFromHistory = modifiedPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingAmount = Math.max(0, grandTotal - totalPaidFromHistory);
  const isFullyPaid = totalPaidFromHistory >= grandTotal;

  const handleAmountPaidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;

    // Apply smart formatting (commas + decimals preserved)
    const formatted = formatNumberInput(rawInput);
    setAmountPaidInput(formatted);

    const value = parseNumberInput(rawInput);

    // Ensure amount paid doesn't exceed remaining amount
    const validAmount = Math.min(value, remainingAmount);

    onAmountPaidChange(validAmount);
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      onPaymentDateChange?.(date);
    }
  };

  // Force current payment to 0 if fully paid
  const displayAmountPaid = isFullyPaid ? 0 : (amountPaid || 0);

  console.log('InstallmentPaymentInput - isEditing:', isEditing, 'has onStagePaymentChange:', !!onStagePaymentChange);

  return (
    <div className="space-y-4">
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-blue-800">Installment Payment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <Label htmlFor="amountPaid" className="text-sm font-medium">Amount Paid (Current Payment)</Label>
            <Input
              id="amountPaid"
              type="text"
              inputMode="decimal"
              value={amountPaidInput}
              onChange={handleAmountPaidChange}
              placeholder="Enter amount paid"
              disabled={isFullyPaid}
              className="text-base"
            />
          </div>

          <div className="grid gap-3">
            <Label className="text-sm font-medium">Payment Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                  disabled={isFullyPaid}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateChange}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Mobile-first responsive grid */}
          <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
            <div className="flex justify-between sm:block">
              <span className="text-sm text-muted-foreground">Total Amount:</span>
              <span className="text-sm font-semibold sm:block">{currency} {formatNumber(grandTotal)}</span>
            </div>
            <div className="flex justify-between sm:block">
              <span className="text-sm text-muted-foreground">Total Paid (History):</span>
              <span className="text-sm font-semibold text-green-600 sm:block">{currency} {formatNumber(totalPaidFromHistory)}</span>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
            <div className="flex justify-between sm:block">
              <span className="text-sm text-muted-foreground">Current Payment:</span>
              <span className="text-sm font-semibold text-blue-600 sm:block">{currency} {formatNumber(displayAmountPaid)}</span>
            </div>
            <div className="flex justify-between sm:block">
              <span className="text-sm text-muted-foreground">Amount Due:</span>
              <span className="text-sm font-semibold text-red-600 sm:block">{currency} {formatNumber(Math.max(0, remainingAmount - displayAmountPaid))}</span>
            </div>
          </div>

          {(totalPaidFromHistory + displayAmountPaid) >= grandTotal && displayAmountPaid > 0 && (
            <div className="text-sm text-green-600 font-medium bg-green-50 p-3 rounded border border-green-200">
              ✓ Full payment received - you can manually change status to Paid if needed
            </div>
          )}

          {isFullyPaid && (
            <div className="text-sm text-green-600 font-medium bg-green-50 p-3 rounded border border-green-200">
              ✓ Sale fully paid - you can manually change status to Paid if needed
            </div>
          )}

          {/* Show notice when editing with pending changes */}
          {isEditing && pendingChanges.length > 0 && (
            <div className="text-sm text-amber-600 font-medium bg-amber-50 p-3 rounded border border-amber-200">
              ℹ️ {pendingChanges.length} payment change(s) staged. Changes will be saved when you click "Update Sale".
            </div>
          )}

          {/* Show notice when editing without pending changes */}
          {isEditing && pendingChanges.length === 0 && payments.length > 0 && (
            <div className="text-sm text-blue-600 font-medium bg-blue-50 p-3 rounded border border-blue-200">
              ℹ️ You can edit payment history. Changes will be saved when you click "Update Sale".
            </div>
          )}
        </CardContent>
      </Card>

      {saleId && (
        <InstallmentPaymentHistory
          payments={payments}
          currency={currency}
          isLoading={false}
          pendingChanges={pendingChanges}
          isLocalMode={isEditing}
          onStageChange={onStagePaymentChange}
          cashAccounts={cashAccounts}
          onLinkToCash={onLinkToCash}
          onUpdatePayment={onUpdatePayment}
        />
      )}
    </div>
  );
};

export default InstallmentPaymentInput;
