"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PaymentStatusSelector from '@/components/sales/PaymentStatusSelector';
import InstallmentPaymentInput from '@/components/sales/InstallmentPaymentInput';
import InstallmentPaymentHistory from '@/components/sales/InstallmentPaymentHistory';
import CashAccountSelection from '@/components/sales/CashAccountSelection';
import SaleCategorySelector from '@/components/sales/SaleCategorySelector';
import { PaymentChange } from '@/hooks/useLocalPaymentChanges';

interface SalePaymentSectionProps {
  paymentStatus: string;
  onPaymentStatusChange: (value: string) => void;
  isInstallmentSale: boolean;
  amountPaid: number;
  amountDue: number;
  grandTotal: number;
  currency: string;
  onAmountPaidChange: (amount: number) => void;
  onPaymentDateChange?: (date: Date) => void;
  paymentDate?: Date;
  saleId?: string;
  onPaymentStatusChangeFromInstallment: (newStatus: string, saleId?: string) => Promise<void>;
  isEditing: boolean;
  payments: any[];
  pendingChanges: any[];
  onStagePaymentChange?: (change: PaymentChange) => void;
  linkToCash: boolean;
  onLinkToCashChange: (value: boolean) => void;
  selectedCashAccountId: string;
  onCashAccountChange: (value: string) => void;
  cashAccounts: any[];
  hasPaidWithHistory: boolean;
  onLinkPaymentToCash?: (paymentId: string, accountId: string) => Promise<void>;
  onUpdatePayment?: (paymentId: string, updates: { amount?: number; notes?: string; paymentDate?: Date }) => Promise<void>;
  notes?: string;
  onNotesChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  categoryId?: string;
  onCategoryChange?: (value: string) => void;
}

const SalePaymentSection: React.FC<SalePaymentSectionProps> = ({
  paymentStatus,
  onPaymentStatusChange,
  isInstallmentSale,
  amountPaid,
  amountDue,
  grandTotal,
  currency,
  onAmountPaidChange,
  onPaymentDateChange,
  paymentDate,
  saleId,
  onPaymentStatusChangeFromInstallment,
  isEditing,
  payments,
  pendingChanges,
  onStagePaymentChange,
  linkToCash,
  onLinkToCashChange,
  selectedCashAccountId,
  onCashAccountChange,
  cashAccounts,
  hasPaidWithHistory,
  onLinkPaymentToCash,
  onUpdatePayment,
  notes = '',
  onNotesChange,
  categoryId = '',
  onCategoryChange,
}) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Payment Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <PaymentStatusSelector
          paymentStatus={paymentStatus}
          onPaymentStatusChange={onPaymentStatusChange}
        />

        {isInstallmentSale && (
          <InstallmentPaymentInput
            amountPaid={amountPaid}
            amountDue={amountDue}
            grandTotal={grandTotal}
            currency={currency}
            onAmountPaidChange={onAmountPaidChange}
            onPaymentDateChange={onPaymentDateChange}
            paymentDate={paymentDate}
            maxAmount={grandTotal}
            saleId={saleId}
            onPaymentStatusChange={onPaymentStatusChangeFromInstallment}
            isEditing={isEditing}
            payments={payments}
            pendingChanges={pendingChanges}
            onStagePaymentChange={isEditing ? onStagePaymentChange : undefined}
            cashAccounts={cashAccounts}
            onLinkToCash={onLinkPaymentToCash}
            onUpdatePayment={onUpdatePayment}
          />
        )}

        {hasPaidWithHistory && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-green-800">Payment History (Sale Completed)</CardTitle>
            </CardHeader>
            <CardContent>
              <InstallmentPaymentHistory
                payments={payments}
                currency={currency}
                isLoading={false}
                pendingChanges={pendingChanges}
                isLocalMode={isEditing}
                onStageChange={isEditing ? onStagePaymentChange : undefined}
                cashAccounts={cashAccounts}
                onLinkToCash={onLinkPaymentToCash}
                onUpdatePayment={onUpdatePayment}
              />
            </CardContent>
          </Card>
        )}

        <CashAccountSelection
          linkToCash={linkToCash}
          onLinkToCashChange={onLinkToCashChange}
          selectedCashAccountId={selectedCashAccountId}
          onCashAccountChange={onCashAccountChange}
          cashAccounts={cashAccounts}
          paymentStatus={paymentStatus}
        />

        {onCategoryChange && (
          <SaleCategorySelector
            value={categoryId}
            onChange={onCategoryChange}
          />
        )}

        <div className="grid gap-3">
          <Label htmlFor="saleNotes">Notes</Label>
          <Input
            id="saleNotes"
            name="notes"
            value={notes}
            onChange={onNotesChange}
            placeholder="Order notes (will appear on receipt)"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default SalePaymentSection;