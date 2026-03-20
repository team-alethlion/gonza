
import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CashAccount {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
}

interface CashAccountSelectionProps {
  linkToCash: boolean;
  onLinkToCashChange: (checked: boolean) => void;
  selectedCashAccountId: string;
  onCashAccountChange: (accountId: string) => void;
  cashAccounts: CashAccount[];
  paymentStatus: string;
}

const CashAccountSelection: React.FC<CashAccountSelectionProps> = ({
  linkToCash,
  onLinkToCashChange,
  selectedCashAccountId,
  onCashAccountChange,
  cashAccounts,
  paymentStatus
}) => {
  // Only show cash account selection for Paid and Installment Sale statuses
  const shouldShowCashSelection = paymentStatus === 'Paid' || paymentStatus === 'Installment Sale';
  
  if (!shouldShowCashSelection) {
    return null;
  }

  const getCardTitle = () => {
    if (paymentStatus === 'Installment Sale') {
      return 'Link Partial Payment to Cash Account';
    }
    return 'Link to Cash Account';
  };

  const getDescription = () => {
    if (paymentStatus === 'Installment Sale') {
      return 'Record the partial payment in a cash account';
    }
    return 'Record this payment in a cash account';
  };

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-green-800">{getCardTitle()}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="link-to-cash">Link to Cash Account</Label>
            <div className="text-sm text-muted-foreground">
              {getDescription()}
            </div>
          </div>
          <Switch
            id="link-to-cash"
            checked={linkToCash}
            onCheckedChange={onLinkToCashChange}
            data-cash-account-switch="true"
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (linkToCash) {
                  // Focus the cash account select if enabled
                  const cashAccountSelect = document.querySelector('[data-cash-account-select="true"]') as HTMLElement;
                  cashAccountSelect?.focus();
                } else {
                  // Go to submit button if not enabled
                  const submitButton = document.querySelector('button[type="submit"]') as HTMLElement;
                  submitButton?.focus();
                }
              }
            }}
          />
        </div>
        
        {linkToCash && (
          <div className="grid gap-3">
            <Label htmlFor="cash-account">Select Cash Account</Label>
            <Select
              value={selectedCashAccountId}
              onValueChange={onCashAccountChange}
            >
              <SelectTrigger 
                className="w-full"
                data-cash-account-select="true"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    // Focus the create sale button
                    const submitButton = document.querySelector('button[type="submit"]') as HTMLElement;
                    submitButton?.focus();
                  }
                }}
              >
                <SelectValue placeholder="Select a cash account" />
              </SelectTrigger>
              <SelectContent>
                {cashAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center">
                      <span>{account.name}</span>
                      {account.isDefault && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCashAccountId && (
              <div className="text-sm text-muted-foreground">
                {paymentStatus === 'Installment Sale' 
                  ? 'The partial payment amount will be recorded in this account'
                  : 'The full payment amount will be recorded in this account'
                }
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CashAccountSelection;
