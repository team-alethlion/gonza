"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react';
import { useCashTransactions } from '@/hooks/useCashTransactions';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useIsMobile } from '@/hooks/use-mobile';
import { DailyCashSummary as DailyCashSummaryType, CashTransaction, CashTransactionFormData } from '@/types/cash';
import CashTransactionsList from './CashTransactionsList';
import ViewCashTransactionDialog from './ViewCashTransactionDialog';
import EditCashTransactionDialog from './EditCashTransactionDialog';
import { useCashAccounts } from '@/hooks/useCashAccounts';
import { formatCashAmount } from '@/lib/utils';
import { useFinancialVisibility } from '@/hooks/useFinancialVisibility';

interface DailyCashSummaryProps {
  accountId?: string;
}

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'custom';

const DailyCashSummary: React.FC<DailyCashSummaryProps> = ({ accountId }) => {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Initialize filters from URL params with fallbacks
  const [periodType, setPeriodType] = useState<PeriodType>(() => {
    const paramPeriod = searchParams?.get('summaryPeriod') as PeriodType;
    return paramPeriod && ['daily', 'weekly', 'monthly', 'custom'].includes(paramPeriod) ? paramPeriod : 'daily';
  });

  const [selectedDate, setSelectedDate] = useState(() => {
    const paramDate = searchParams?.get('summaryDate');
    return paramDate ? new Date(paramDate) : new Date();
  });

  const [customStartDate, setCustomStartDate] = useState(() => {
    const paramStartDate = searchParams?.get('summaryStartDate');
    return paramStartDate ? new Date(paramStartDate) : new Date();
  });

  const [customEndDate, setCustomEndDate] = useState(() => {
    const paramEndDate = searchParams?.get('summaryEndDate');
    return paramEndDate ? new Date(paramEndDate) : new Date();
  });

  // Update filters when URL changes (navigation back/forward)
  useEffect(() => {
    const timer = setTimeout(() => {
      const paramPeriod = searchParams?.get('summaryPeriod') as PeriodType;
      const paramDate = searchParams?.get('summaryDate');
      const paramStartDate = searchParams?.get('summaryStartDate');
      const paramEndDate = searchParams?.get('summaryEndDate');

      const nextPeriodType = paramPeriod && ['daily', 'weekly', 'monthly', 'custom'].includes(paramPeriod) ? paramPeriod : 'daily';
      if (periodType !== nextPeriodType) {
        setPeriodType(nextPeriodType);
      }

      if (paramDate) {
        const nextDate = new Date(paramDate);
        if (selectedDate.getTime() !== nextDate.getTime()) {
          setSelectedDate(nextDate);
        }
      }

      if (paramStartDate) {
        const nextStartDate = new Date(paramStartDate);
        if (customStartDate.getTime() !== nextStartDate.getTime()) {
          setCustomStartDate(nextStartDate);
        }
      }

      if (paramEndDate) {
        const nextEndDate = new Date(paramEndDate);
        if (customEndDate.getTime() !== nextEndDate.getTime()) {
          setCustomEndDate(nextEndDate);
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams, periodType, selectedDate, customStartDate, customEndDate]);
  const [isViewTransactionDialogOpen, setIsViewTransactionDialogOpen] = useState(false);
  const [isEditTransactionDialogOpen, setIsEditTransactionDialogOpen] = useState(false);
  const [viewingTransaction, setViewingTransaction] = useState<CashTransaction | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<CashTransaction | null>(null);
  const [summary, setSummary] = useState<DailyCashSummaryType>({
    date: new Date(),
    openingBalance: 0,
    cashIn: 0,
    cashOut: 0,
    transfersIn: 0,
    transfersOut: 0,
    closingBalance: 0
  });

  // Use optimized hooks with better caching
  const { getDailySummary, getDateRangeSummary, transactions, updateTransaction, refreshTransactions } = useCashTransactions(accountId);
  const { accounts, refreshAccounts } = useCashAccounts();
  const { settings } = useBusinessSettings();
  const { canManageFinanceAccounts } = useFinancialVisibility();

  // Memoize currency formatter
  const formatCurrency = useCallback((amount: number) => {
    return formatCashAmount(amount, settings.currency || 'USD');
  }, [settings.currency]);


  // Functions to update both state and URL
  const updatePeriodType = useCallback((value: PeriodType) => {
    setPeriodType(value);
    const newParams = new URLSearchParams(searchParams?.toString());
    if (value !== 'daily') {
      newParams.set('summaryPeriod', value);
    } else {
      newParams.delete('summaryPeriod');
    }
    router.push(`?${newParams.toString()}`);
  }, [router, searchParams]);

  const updateSelectedDate = useCallback((date: Date) => {
    setSelectedDate(date);
    const newParams = new URLSearchParams(searchParams?.toString());
    const dateStr = format(date, 'yyyy-MM-dd');
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (dateStr !== todayStr) {
      newParams.set('summaryDate', dateStr);
    } else {
      newParams.delete('summaryDate');
    }
    router.push(`?${newParams.toString()}`);
  }, [router, searchParams]);

  const updateCustomStartDate = useCallback((date: Date) => {
    setCustomStartDate(date);
    const newParams = new URLSearchParams(searchParams?.toString());
    newParams.set('summaryPeriod', 'custom');
    newParams.set('summaryStartDate', format(date, 'yyyy-MM-dd'));
    router.push(`?${newParams.toString()}`);
  }, [router, searchParams]);

  const updateCustomEndDate = useCallback((date: Date) => {
    setCustomEndDate(date);
    const newParams = new URLSearchParams(searchParams?.toString());
    newParams.set('summaryPeriod', 'custom');
    newParams.set('summaryEndDate', format(date, 'yyyy-MM-dd'));
    router.push(`?${newParams.toString()}`);
  }, [router, searchParams]);

  // Memoized handlers for better performance
  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateSelectedDate(new Date(e.target.value));
  }, [updateSelectedDate]);

  const handleCustomStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateCustomStartDate(new Date(e.target.value));
  }, [updateCustomStartDate]);

  const handleCustomEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateCustomEndDate(new Date(e.target.value));
  }, [updateCustomEndDate]);

  const goToToday = useCallback(() => {
    const today = new Date();
    updateSelectedDate(today);
    updateCustomStartDate(today);
    updateCustomEndDate(today);
  }, [updateSelectedDate, updateCustomStartDate, updateCustomEndDate]);

  // Memoize date range calculation
  const getDateRange = useMemo(() => {
    switch (periodType) {
      case 'weekly':
        return {
          start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
          end: endOfWeek(selectedDate, { weekStartsOn: 1 })
        };
      case 'monthly':
        return {
          start: startOfMonth(selectedDate),
          end: endOfMonth(selectedDate)
        };
      case 'custom':
        return {
          start: customStartDate,
          end: customEndDate
        };
      default:
        return {
          start: selectedDate,
          end: selectedDate
        };
    }
  }, [periodType, selectedDate, customStartDate, customEndDate]);

  // Function to reload summary data
  const reloadSummary = useCallback(async () => {
    try {
      let summaryData: DailyCashSummaryType;

      if (periodType === 'daily') {
        summaryData = await getDailySummary(selectedDate, accountId);
      } else {
        const { start, end } = getDateRange;
        summaryData = await getDateRangeSummary(start, end, accountId);
      }

      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  }, [periodType, selectedDate, getDateRange, accountId, getDailySummary, getDateRangeSummary]);

  // Optimized summary loading with debouncing to prevent excessive calls
  useEffect(() => {
    const loadSummary = async () => {
      await reloadSummary();
    };

    // Debounce the summary loading to prevent excessive calls
    const timeoutId = setTimeout(loadSummary, 100);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [reloadSummary, transactions]);

  // Memoize filtered transactions for better performance
  const getFilteredTransactions = useMemo(() => {
    const { start, end } = getDateRange;
    const startDateStr = start.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];

    let filteredTransactions = transactions.filter(t => {
      const transactionDateStr = t.date.toISOString().split('T')[0];
      return transactionDateStr >= startDateStr && transactionDateStr <= endDateStr;
    });

    if (accountId) {
      filteredTransactions = filteredTransactions.filter(t => t.accountId === accountId);
    }

    return filteredTransactions;
  }, [transactions, getDateRange, accountId]);

  const handleViewTransaction = useCallback((transaction: CashTransaction) => {
    setViewingTransaction(transaction);
    setIsViewTransactionDialogOpen(true);
  }, []);

  const handleEditTransaction = useCallback((transaction: CashTransaction) => {
    setEditingTransaction(transaction);
    setIsEditTransactionDialogOpen(true);
  }, []);

  const handleUpdateTransaction = useCallback(async (id: string, data: Partial<CashTransactionFormData>) => {
    try {
      await updateTransaction(id, data);
      setIsEditTransactionDialogOpen(false);
      setEditingTransaction(null);

      // Auto-refresh data after updating transaction
      await Promise.all([
        refreshTransactions(),
        refreshAccounts()
      ]);

      // Reload summary to reflect changes
      await reloadSummary();
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  }, [updateTransaction, refreshTransactions, refreshAccounts, reloadSummary]);

  // Enhanced transaction deleted handler with automatic refresh
  const handleTransactionDeleted = useCallback(async () => {
    try {
      // Refresh both transactions and accounts data
      await Promise.all([
        refreshTransactions(),
        refreshAccounts()
      ]);

      // Reload summary to reflect changes instantly
      await reloadSummary();

      console.log('Successfully refreshed data after transaction deletion');
    } catch (error) {
      console.error('Error refreshing data after transaction deletion:', error);
    }
  }, [refreshTransactions, refreshAccounts, reloadSummary]);

  const periodTransactions = getFilteredTransactions;

  // Memoize period label
  const getPeriodLabel = useMemo(() => {
    const { start, end } = getDateRange;
    switch (periodType) {
      case 'weekly':
        return `Week of ${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
      case 'monthly':
        return format(selectedDate, 'MMMM yyyy');
      case 'custom':
        return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
      default:
        return format(selectedDate, 'MMMM d, yyyy');
    }
  }, [getDateRange, periodType, selectedDate]);

  return (
    <div className="space-y-4 md:space-y-6">
      <Card>
        <CardHeader className="pb-3 md:pb-6">
          <div className="space-y-4">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <CalendarDays className="h-5 w-5" />
              <span className="break-words">Cash Summary</span>
            </CardTitle>

            {/* Mobile-optimized period label */}
            <div className="text-sm md:text-base font-medium text-muted-foreground">
              {getPeriodLabel}
            </div>

            {/* Controls */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="period" className="text-xs font-medium">Period</Label>
                  <Select value={periodType} onValueChange={updatePeriodType}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {periodType === 'custom' ? (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="startDate" className="text-xs font-medium">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={format(customStartDate, 'yyyy-MM-dd')}
                        onChange={handleCustomStartDateChange}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="endDate" className="text-xs font-medium">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={format(customEndDate, 'yyyy-MM-dd')}
                        onChange={handleCustomEndDateChange}
                        className="h-9 text-sm"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-1">
                    <Label htmlFor="date" className="text-xs font-medium">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={format(selectedDate, 'yyyy-MM-dd')}
                      onChange={handleDateChange}
                      className="h-9 text-sm"
                    />
                  </div>
                )}

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToToday}
                    className="h-9 text-sm"
                  >
                    Today
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Grid - Changed to single column on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
            <div className="space-y-3 p-5 md:p-6 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
                <span className="font-medium">Opening</span>
              </div>
              <div className="text-lg md:text-xl font-semibold break-all leading-tight">
                {canManageFinanceAccounts ? formatCurrency(summary.openingBalance) : '•••'}
              </div>
            </div>

            <div className="space-y-3 p-5 md:p-6 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 text-xs md:text-sm text-green-600">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
                <span className="font-medium">Cash In</span>
              </div>
              <div className="text-lg md:text-xl font-semibold text-green-600 break-all leading-tight">
                {canManageFinanceAccounts ? formatCurrency(summary.cashIn) : '•••'}
              </div>
            </div>

            <div className="space-y-3 p-5 md:p-6 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2 text-xs md:text-sm text-red-600">
                <TrendingDown className="h-4 w-4 md:h-5 md:w-5" />
                <span className="font-medium">Cash Out</span>
              </div>
              <div className="text-lg md:text-xl font-semibold text-red-600 break-all leading-tight">
                {canManageFinanceAccounts ? formatCurrency(summary.cashOut) : '•••'}
              </div>
            </div>

            <div className="space-y-3 p-5 md:p-6 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-xs md:text-sm text-blue-600">
                <ArrowRightLeft className="h-4 w-4 md:h-5 md:w-5" />
                <span className="font-medium">Transfer In</span>
              </div>
              <div className="text-lg md:text-xl font-semibold text-blue-600 break-all leading-tight">
                {canManageFinanceAccounts ? formatCurrency(summary.transfersIn) : '•••'}
              </div>
            </div>

            <div className="space-y-3 p-5 md:p-6 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-2 text-xs md:text-sm text-orange-600">
                <ArrowRightLeft className="h-4 w-4 md:h-5 md:w-5" />
                <span className="font-medium">Transfer Out</span>
              </div>
              <div className="text-lg md:text-xl font-semibold text-orange-600 break-all leading-tight">
                {canManageFinanceAccounts ? formatCurrency(summary.transfersOut) : '•••'}
              </div>
            </div>

            <div className="space-y-3 p-5 md:p-6 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
                <span className="font-medium">Closing</span>
              </div>
              <div className="text-lg md:text-xl font-semibold break-all leading-tight">
                {canManageFinanceAccounts ? formatCurrency(summary.closingBalance) : '•••'}
              </div>
            </div>
          </div>

          {/* Net Change */}
          <div className="pt-3 md:pt-4 border-t">
            <div className="text-sm md:text-base text-muted-foreground">
              Net Change:
              <span className={`ml-1 font-semibold break-all ${summary.closingBalance - summary.openingBalance >= 0
                ? 'text-green-600'
                : 'text-red-600'
                }`}>
                {canManageFinanceAccounts ? formatCurrency(summary.closingBalance - summary.openingBalance) : '•••'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table for Selected Period with Pagination */}
      <Card>
        <CardHeader className="pb-3 md:pb-6">
          <CardTitle className="text-lg md:text-xl">
            <span className="break-words">Transactions</span>
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({periodTransactions.length} transaction{periodTransactions.length !== 1 ? 's' : ''})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 md:px-6">
          <CashTransactionsList
            transactions={periodTransactions}
            accountId={accountId}
            showAccountColumn={!accountId}
            onViewTransaction={handleViewTransaction}
            onEditTransaction={handleEditTransaction}
            onTransactionDeleted={handleTransactionDeleted}
          />
        </CardContent>
      </Card>

      <ViewCashTransactionDialog
        open={isViewTransactionDialogOpen}
        onOpenChange={setIsViewTransactionDialogOpen}
        transaction={viewingTransaction}
      />

      <EditCashTransactionDialog
        open={isEditTransactionDialogOpen}
        onOpenChange={setIsEditTransactionDialogOpen}
        onSubmit={handleUpdateTransaction}
        transaction={editingTransaction}
        accounts={accounts}
      />
    </div>
  );
};

export default DailyCashSummary;
