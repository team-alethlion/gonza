"use client";
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CashAccountsHeader from '@/components/cash/CashAccountsHeader';
import CashAccountsList from '@/components/cash/CashAccountsList';
import CashAccountDialog from '@/components/cash/CashAccountDialog';
import ProfitLossTab from '@/components/cash/ProfitLossTab';
import { CashAccount, CashAccountFormData } from '@/types/cash';

interface CashContentProps {
  accounts: CashAccount[];
  isLoading: boolean;
  isDialogOpen: boolean;
  onDialogOpenChange: (open: boolean) => void;
  onCreateAccount: (data: CashAccountFormData) => Promise<void>;
  onAccountDeleted: () => Promise<void>;
  canCreate?: boolean;
}

const CashContent: React.FC<CashContentProps> = ({
  accounts,
  isLoading,
  isDialogOpen,
  onDialogOpenChange,
  onCreateAccount,
  onAccountDeleted,
  canCreate = true
}) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleOpenDialog = () => onDialogOpenChange(true);

  const handleCreateAccount = async (data: CashAccountFormData) => {
    setIsSubmitting(true);
    try {
      await onCreateAccount(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Tabs defaultValue="cash-accounts" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="cash-accounts">Cash Accounts</TabsTrigger>
        <TabsTrigger value="profit-loss">Profit & Loss</TabsTrigger>
      </TabsList>

      <TabsContent value="cash-accounts" className="space-y-6">
        <CashAccountsHeader onCreateAccount={handleOpenDialog} canCreate={canCreate} />

        <CashAccountsList
          accounts={accounts}
          isLoading={isLoading}
          onCreateAccount={handleOpenDialog}
          onAccountDeleted={onAccountDeleted}
          canCreate={canCreate}
        />

        <CashAccountDialog
          open={isDialogOpen}
          onOpenChange={onDialogOpenChange}
          onSubmit={handleCreateAccount}
          title="Create New Cash Account"
          isSubmitting={isSubmitting}
        />
      </TabsContent>

      <TabsContent value="profit-loss">
        <ProfitLossTab />
      </TabsContent>
    </Tabs>
  );
};

export default CashContent;