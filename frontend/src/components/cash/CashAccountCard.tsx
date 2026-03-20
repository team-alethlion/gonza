"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, ArrowUpRight, ArrowDownRight, Wallet, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CashAccount, DailyCashSummary } from '@/types/cash';
import { useCashAccounts } from '@/hooks/useCashAccounts';
import { useCashTransactions } from '@/hooks/useCashTransactions';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useIsMobile } from '@/hooks/use-mobile';
import DeleteCashAccountDialog from './DeleteCashAccountDialog';
import { formatCashAmount } from '@/lib/utils';
import { useProfiles } from '@/contexts/ProfileContext';
import { useFinancialVisibility } from '@/hooks/useFinancialVisibility';

interface CashAccountCardProps {
  account: CashAccount;
  onAccountDeleted?: () => void;
}

const CashAccountCard: React.FC<CashAccountCardProps> = ({ account, onAccountDeleted }) => {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { deleteAccount, deleteAccountWithTransactions } = useCashAccounts();
  const { getDailySummary } = useCashTransactions(account.id);
  const { settings } = useBusinessSettings();
  const { hasPermission } = useProfiles();
  const { canManageFinanceAccounts } = useFinancialVisibility();
  const canDelete = hasPermission('finance', 'delete');
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionCount, setTransactionCount] = useState(0);
  const [deleteDetails, setDeleteDetails] = useState<string>('');
  const [todaysSummary, setTodaysSummary] = useState<DailyCashSummary>({
    date: new Date(),
    openingBalance: 0,
    cashIn: 0,
    cashOut: 0,
    transfersIn: 0,
    transfersOut: 0,
    closingBalance: 0
  });

  // Memoize currency formatter
  const formatCurrency = useMemo(() => {
    return (amount: number) => {
      return formatCashAmount(amount, settings.currency || 'USD');
    };
  }, [settings.currency]);

  // Load today's summary to get opening, closing, and current balance
  const loadTodaysSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      const summary = await getDailySummary(new Date(), account.id);
      setTodaysSummary(summary);
    } catch (error) {
      console.error('Error loading today\'s summary:', error);
    } finally {
      setIsLoadingSummary(false);
    }
  }, [getDailySummary, account.id]);

  useEffect(() => {
    loadTodaysSummary();
  }, [loadTodaysSummary]);

  // Memoized handlers
  const handleDelete = useCallback(async () => {
    console.log('Delete button clicked for account:', account.id);

    try {
      const result = await deleteAccount(account.id, onAccountDeleted);
      console.log('Delete result:', result);

      if (result && typeof result === 'object' && 'hasTransactions' in result) {
        if (result.hasTransactions) {
          console.log('Account has transactions, showing dialog');
          // Show dialog with transaction count and details
          setTransactionCount(result.transactionCount || 0);
          setDeleteDetails(result.details || '');
          setDeleteDialogOpen(true);
        } else if (result.success) {
          console.log('Account deleted successfully without dialog');
          // Account was deleted successfully
        } else {
          console.log('Account deletion failed');
          // Deletion failed, error was already shown in toast
        }
      }
    } catch (error) {
      console.error('Unexpected error during deletion:', error);
    }
  }, [deleteAccount, account.id, onAccountDeleted]);

  const handleConfirmDelete = useCallback(async (deleteTransactions: boolean) => {
    console.log('Confirm delete called with deleteTransactions:', deleteTransactions);

    try {
      const success = await deleteAccountWithTransactions(account.id, deleteTransactions, onAccountDeleted);
      console.log('Delete with transactions result:', success);

      if (success) {
        setDeleteDialogOpen(false);
        console.log('Deletion successful, dialog closed');
      } else {
        console.log('Deletion failed');
      }
    } catch (error) {
      console.error('Error in handleConfirmDelete:', error);
    }
  }, [deleteAccountWithTransactions, account.id, onAccountDeleted]);

  const handleCardClick = useCallback(() => {
    router.push(`/cash/${account.id}`);
  }, [router, account.id]);

  return (
    <>
      <Card className={`hover:shadow-lg transition-all duration-200 cursor-pointer ${isMobile ? 'shadow-sm border-gray-200' : 'hover:shadow-md'}`}>
        <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${isMobile ? 'pb-3' : 'pb-2'}`}>
          <CardTitle className={`${isMobile ? 'text-base' : 'text-sm'} font-semibold flex items-center gap-2 text-gray-900`}>
            <Wallet className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'} text-primary`} />
            <span className="truncate">{account.name}</span>
            {account.isDefault && (
              <Badge variant="secondary" className={`${isMobile ? 'text-xs px-2 py-0.5' : 'text-xs'} bg-primary/10 text-primary border-primary/20`}>
                Default
              </Badge>
            )}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={`${isMobile ? 'h-8 w-8' : 'h-8 w-8'} p-0 hover:bg-gray-100`}>
                <MoreHorizontal className="h-4 w-4 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border border-gray-200 shadow-lg">
              <DropdownMenuItem
                onClick={handleCardClick}
                className="hover:bg-gray-50"
              >
                View Details
              </DropdownMenuItem>
              {canDelete && (
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-red-600 hover:bg-red-50"
                >
                  Delete Account
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent
          onClick={handleCardClick}
          className={isMobile ? 'px-4 pb-4' : ''}
        >
          <div className={`space-y-${isMobile ? '4' : '3'}`}>
            <div className={isMobile ? 'space-y-1' : ''}>
              <div className={`${isMobile ? 'text-2xl' : 'text-2xl'} font-bold text-gray-900 flex items-center`}>
                {isLoadingSummary ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  canManageFinanceAccounts ? formatCurrency(todaysSummary.closingBalance) : '•••'
                )}
              </div>
              <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-gray-500 font-medium`}>
                Current Balance
              </p>
            </div>

            {account.description && (
              <p className={`${isMobile ? 'text-sm leading-relaxed' : 'text-sm'} text-gray-600 line-clamp-2`}>
                {account.description}
              </p>
            )}

            <div className={`grid grid-cols-1 ${isMobile ? 'gap-3' : 'gap-2'} ${isMobile ? 'text-sm' : 'text-sm'}`}>
              <div className="flex items-center justify-between p-2 bg-green-50 rounded-md">
                <div className="flex items-center gap-2 text-green-700">
                  <ArrowUpRight className="h-4 w-4" />
                  <span className="font-medium">Opening</span>
                </div>
                <span className="font-semibold text-green-800 flex items-center">
                  {isLoadingSummary ? (
                    <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                  ) : (
                    canManageFinanceAccounts ? formatCurrency(todaysSummary.openingBalance) : '•••'
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded-md">
                <div className="flex items-center gap-2 text-blue-700">
                  <ArrowDownRight className="h-4 w-4" />
                  <span className="font-medium">Today's Close</span>
                </div>
                <span className="font-semibold text-blue-800 flex items-center">
                  {isLoadingSummary ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  ) : (
                    canManageFinanceAccounts ? formatCurrency(todaysSummary.closingBalance) : '•••'
                  )}
                </span>
              </div>
            </div>

            <div className={`${isMobile ? 'pt-2' : 'pt-2'}`}>
              <Button
                variant="outline"
                size={isMobile ? "default" : "sm"}
                className={`w-full font-medium hover:bg-primary hover:text-white transition-colors ${isMobile ? 'h-10' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCardClick();
                }}
              >
                Manage Account
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <DeleteCashAccountDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        account={account}
        transactionCount={transactionCount}
        details={deleteDetails}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};

export default CashAccountCard;
