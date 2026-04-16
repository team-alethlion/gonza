"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  CalendarDays,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Plus,
  LayoutGrid,
} from "lucide-react";

import { useCashTransactions } from "@/hooks/useCashTransactions";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DailyCashSummary as DailyCashSummaryType,
  CashTransaction,
  CashTransactionFormData,
} from "@/types/cash";
import CashTransactionsList from "./CashTransactionsList";
import ViewCashTransactionDialog from "./ViewCashTransactionDialog";
import EditCashTransactionDialog from "./EditCashTransactionDialog";
import CashTransactionDialog from "./CashTransactionDialog";
import BulkTransactionAddTab from "./BulkTransactionAddTab";
import { useCashAccounts } from "@/hooks/useCashAccounts";
import { formatCashAmount } from "@/lib/utils";
import { useFinancialVisibility } from "@/hooks/useFinancialVisibility";

import AdvancedPeriodSelector, {
  DateRange,
} from "@/components/common/AdvancedPeriodSelector";
import { startOfDay, endOfDay } from "date-fns";

interface DailyCashSummaryProps {
  accountId?: string;
}

const DailyCashSummary: React.FC<DailyCashSummaryProps> = ({ accountId }) => {
  const router = useRouter();

  // 🚀 DECOUPLED STATE: No more fighting with the URL.
  // The state is clean, fast, and driven strictly by the UI.
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return { start: startOfDay(d), end: endOfDay(new Date()) };
  });

  const [isViewTransactionDialogOpen, setIsViewTransactionDialogOpen] =
    useState(false);
  const [isEditTransactionDialogOpen, setIsEditTransactionDialogOpen] =
    useState(false);
  const [viewingTransaction, setViewingTransaction] =
    useState<CashTransaction | null>(null);
  const [editingTransaction, setEditingTransaction] =
    useState<CashTransaction | null>(null);
  const [summary, setSummary] = useState<DailyCashSummaryType>({
    date: new Date(),
    openingBalance: 0,
    cashIn: 0,
    cashOut: 0,
    transfersIn: 0,
    transfersOut: 0,
    closingBalance: 0,
  });

  // Use optimized hooks with better caching
  const {
    getDateRangeSummary,
    transactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    refreshTransactions,
    isLoading,
  } = useCashTransactions(accountId, 50, undefined, {
    startDate: dateRange.start,
    endDate: dateRange.end,
  });
  const { accounts, refreshAccounts } = useCashAccounts();
  const { settings } = useBusinessSettings();
  const { canManageFinanceAccounts } = useFinancialVisibility();

  // 🚀 RESTORED: Transaction Dialog States
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isBulkTransactionDialogOpen, setIsBulkTransactionDialogOpen] =
    useState(false);
  const [presetTransactionType, setPresetTransactionType] = useState<
    "cash_in" | "cash_out" | "transfer"
  >("cash_in");

  // Memoize currency formatter
  const formatCurrency = useCallback(
    (amount: number) => {
      return formatCashAmount(amount, settings.currency || "USD");
    },
    [settings.currency],
  );

  // Function to reload summary data
  const reloadSummary = useCallback(async () => {
    try {
      const summaryData = await getDateRangeSummary(
        dateRange.start,
        dateRange.end,
        accountId,
      );
      setSummary(summaryData);
    } catch (error) {
      console.error("Error loading summary:", error);
    }
  }, [dateRange, accountId, getDateRangeSummary]);

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

  const handleViewTransaction = useCallback((transaction: CashTransaction) => {
    setViewingTransaction(transaction);
    setIsViewTransactionDialogOpen(true);
  }, []);

  const handleEditTransaction = useCallback((transaction: CashTransaction) => {
    setEditingTransaction(transaction);
    setIsEditTransactionDialogOpen(true);
  }, []);

  const handleCreateTransaction = async (data: CashTransactionFormData) => {
    try {
      await createTransaction(data);
      setIsTransactionDialogOpen(false);
      // Auto-refresh all relevant data
      await Promise.all([refreshTransactions(), refreshAccounts()]);
      await reloadSummary();
    } catch (error) {
      console.error("Error creating transaction:", error);
    }
  };

  const handleUpdateTransaction = useCallback(
    async (id: string, data: Partial<CashTransactionFormData>) => {
      try {
        await updateTransaction(id, data);
        setIsEditTransactionDialogOpen(false);
        setEditingTransaction(null);

        // Auto-refresh data after updating transaction
        await Promise.all([refreshTransactions(), refreshAccounts()]);

        // Reload summary to reflect changes
        await reloadSummary();
      } catch (error) {
        console.error("Error updating transaction:", error);
      }
    },
    [updateTransaction, refreshTransactions, refreshAccounts, reloadSummary],
  );

  // Enhanced transaction deleted handler with automatic refresh
  const handleTransactionDeleted = useCallback(async () => {
    try {
      // Refresh both transactions and accounts data
      await Promise.all([refreshTransactions(), refreshAccounts()]);

      // Reload summary to reflect changes instantly
      await reloadSummary();

      console.log("Successfully refreshed data after transaction deletion");
    } catch (error) {
      console.error("Error refreshing data after transaction deletion:", error);
    }
  }, [refreshTransactions, refreshAccounts, reloadSummary]);

  // 🚀 REFACTORED: Dynamic Period Label
  const getPeriodLabel = useMemo(() => {
    return `${format(dateRange.start, "MMM d, yyyy")} — ${format(
      dateRange.end,
      "MMM d, yyyy",
    )}`;
  }, [dateRange]);

  return (
    <div className="space-y-4 md:space-y-6">
      <Card>
        <CardHeader className="pb-3 md:pb-6">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl font-bold">
                <CalendarDays className="h-5 w-5 text-blue-600" />
                <span className="break-words">Financial Performance</span>
              </CardTitle>

              <div className="text-sm font-medium px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                {getPeriodLabel}
              </div>
            </div>

            {/* 🚀 NEW: Advanced Period Selector (Modular & Snapping-Free) */}
            <AdvancedPeriodSelector
              initialPeriod="custom"
              onRangeChange={(range) => {
                setDateRange({ start: range.startDate, end: range.endDate });
              }}
            />

            {/* 🚀 RESTORED: Integrated Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Button
                onClick={() => {
                  setPresetTransactionType("cash_in");
                  setIsTransactionDialogOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 font-bold shadow-md">
                <Plus size={18} /> New Entry
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsBulkTransactionDialogOpen(true)}
                className="gap-2 h-11 border-blue-200 hover:bg-blue-50 font-bold">
                <LayoutGrid size={18} /> Bulk Entry
              </Button>
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
                {canManageFinanceAccounts
                  ? formatCurrency(summary.openingBalance)
                  : "•••"}
              </div>
            </div>

            <div className="space-y-3 p-5 md:p-6 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 text-xs md:text-sm text-green-600">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
                <span className="font-medium">Cash In</span>
              </div>
              <div className="text-lg md:text-xl font-semibold text-green-600 break-all leading-tight">
                {canManageFinanceAccounts
                  ? formatCurrency(summary.cashIn)
                  : "•••"}
              </div>
            </div>

            <div className="space-y-3 p-5 md:p-6 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2 text-xs md:text-sm text-red-600">
                <TrendingDown className="h-4 w-4 md:h-5 md:w-5" />
                <span className="font-medium">Cash Out</span>
              </div>
              <div className="text-lg md:text-xl font-semibold text-red-600 break-all leading-tight">
                {canManageFinanceAccounts
                  ? formatCurrency(summary.cashOut)
                  : "•••"}
              </div>
            </div>

            <div className="space-y-3 p-5 md:p-6 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-xs md:text-sm text-blue-600">
                <ArrowRightLeft className="h-4 w-4 md:h-5 md:w-5" />
                <span className="font-medium">Transfer In</span>
              </div>
              <div className="text-lg md:text-xl font-semibold text-blue-600 break-all leading-tight">
                {canManageFinanceAccounts
                  ? formatCurrency(summary.transfersIn)
                  : "•••"}
              </div>
            </div>

            <div className="space-y-3 p-5 md:p-6 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-2 text-xs md:text-sm text-orange-600">
                <ArrowRightLeft className="h-4 w-4 md:h-5 md:w-5" />
                <span className="font-medium">Transfer Out</span>
              </div>
              <div className="text-lg md:text-xl font-semibold text-orange-600 break-all leading-tight">
                {canManageFinanceAccounts
                  ? formatCurrency(summary.transfersOut)
                  : "•••"}
              </div>
            </div>

            <div className="space-y-3 p-5 md:p-6 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
                <span className="font-medium">Closing</span>
              </div>
              <div className="text-lg md:text-xl font-semibold break-all leading-tight">
                {canManageFinanceAccounts
                  ? formatCurrency(summary.closingBalance)
                  : "•••"}
              </div>
            </div>
          </div>

          {/* Net Change */}
          <div className="pt-3 md:pt-4 border-t">
            <div className="text-sm md:text-base text-muted-foreground">
              Net Change:
              <span
                className={`ml-1 font-semibold break-all ${
                  summary.closingBalance - summary.openingBalance >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}>
                {canManageFinanceAccounts
                  ? formatCurrency(
                      summary.closingBalance - summary.openingBalance,
                    )
                  : "•••"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table for Selected Period with Pagination */}
      <Card>
        <CardHeader className="pb-3 md:pb-6">
          <CardTitle className="text-lg md:text-xl font-bold">
            <span className="break-words">Transactions Ledger</span>
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({transactions.length} transaction
              {transactions.length !== 1 ? "s" : ""})
            </span>
            <div>{JSON.stringify(transactions)}</div>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 md:px-6">
          <CashTransactionsList
            transactions={transactions}
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

      {/* 🚀 RESTORED: Integrated Creation Dialogs */}
      <CashTransactionDialog
        open={isTransactionDialogOpen}
        onOpenChange={setIsTransactionDialogOpen}
        onSubmit={handleCreateTransaction}
        accounts={accounts}
        defaultAccountId={accountId}
        presetTransactionType={presetTransactionType}
      />

      <BulkTransactionAddTab
        open={isBulkTransactionDialogOpen}
        onOpenChange={setIsBulkTransactionDialogOpen}
        accountId={accountId || ""}
        onSuccess={() => {
          setIsBulkTransactionDialogOpen(false);
          reloadSummary();
          refreshTransactions();
        }}
      />
    </div>
  );
};

export default DailyCashSummary;
