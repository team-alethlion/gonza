"use client";
import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface CashAccountsHeaderProps {
  onCreateAccount: () => void;
  canCreate?: boolean;
}

const CashAccountsHeader: React.FC<CashAccountsHeaderProps> = ({ onCreateAccount, canCreate = true }) => {
  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <h2 className="text-xl font-semibold">Cash Accounts</h2>
      {canCreate && (
        <Button
          onClick={onCreateAccount}
          className="gap-2"
          size={isMobile ? "default" : "default"}
        >
          <Plus className="h-4 w-4" />
          New Cash Account
        </Button>
      )}
    </div>
  );
};

export default CashAccountsHeader;