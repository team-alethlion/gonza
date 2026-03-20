"use client";
import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import CashAccountCard from '@/components/cash/CashAccountCard';
import { CashAccount } from '@/types/cash';

interface CashAccountsListProps {
  accounts: CashAccount[];
  isLoading: boolean;
  onCreateAccount: () => void;
  onAccountDeleted: () => Promise<void>;
  canCreate?: boolean;
}

const CashAccountsList: React.FC<CashAccountsListProps> = ({
  accounts,
  isLoading,
  onCreateAccount,
  onAccountDeleted,
  canCreate = true
}) => {
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No cash accounts</h3>
        <p className="text-gray-500 mb-4">Get started by creating your first cash account.</p>
        {canCreate && (
          <Button onClick={onCreateAccount} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Cash Account
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {accounts.map((account) => (
        <CashAccountCard
          key={account.id}
          account={account}
          onAccountDeleted={onAccountDeleted}
        />
      ))}
    </div>
  );
};

export default CashAccountsList;