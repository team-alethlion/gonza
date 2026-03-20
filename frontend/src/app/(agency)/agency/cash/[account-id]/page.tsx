"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  RotateCw,
  ChevronLeft,
  Eye,
  Pencil,
  Trash2,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  MoreVertical,
  Edit,
  RefreshCw,
  Upload,
  Download,
  ArrowLeft,
  RefreshCcw,
  ArrowDownRight,
  ArrowRightLeft,
  LayoutGrid,
  Zap,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCashAccounts } from "@/hooks/useCashAccounts";
import { useCashTransactions } from "@/hooks/useCashTransactions";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useIsMobile } from "@/hooks/use-mobile";
import CashTransactionDialog from "@/components/cash/CashTransactionDialog";
import EditCashTransactionDialog from "@/components/cash/EditCashTransactionDialog";
import ViewCashTransactionDialog from "@/components/cash/ViewCashTransactionDialog";
import CashAccountDialog from "@/components/cash/CashAccountDialog";
import CashTransactionsList from "@/components/cash/CashTransactionsList";
import DailyCashSummary from "@/components/cash/DailyCashSummary";
import BulkTransactionAddTab from "@/components/cash/BulkTransactionAddTab";
import CashCSVUploadDialog from "@/components/cash/CashCSVUploadDialog";
import { generateTransactionCSVTemplate } from "@/utils/csvTemplate";
import {
  CashTransactionFormData,
  CashAccountFormData,
  CashTransaction,
} from "@/types/cash";
import { formatCashAmount, cn } from "@/lib/utils";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useProfiles } from "@/contexts/ProfileContext";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle as AlertCircleIcon } from "lucide-react";
import { useFinancialVisibility } from "@/hooks/useFinancialVisibility";
import { Skeleton } from "@/components/ui/skeleton";

const CashAccount = () => {
  const params = useParams();
  const accountId = params?.["account-id"] as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const { currentBusiness, isLoading: businessLoading } = useBusiness();
  const { accounts, isLoading, updateAccount, refreshAccounts } =
    useCashAccounts();
  const {
    transactions,
    createTransaction,
    updateTransaction,
    refreshTransactions,
    deleteTransaction,
    getDailySummary,
  } = useCashTransactions(accountId);
  const { settings } = useBusinessSettings();
  const { hasPermission, isLoading: profilesLoading } = useProfiles();
  const { canManageFinanceAccounts } = useFinancialVisibility();
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isEditTransactionDialogOpen, setIsEditTransactionDialogOpen] =
    useState(false);
  const [isBulkTransactionDialogOpen, setIsBulkTransactionDialogOpen] =
    useState(false);
  const [isCSVUploadDialogOpen, setIsCSVUploadDialogOpen] = useState(false);
  const [isViewTransactionDialogOpen, setIsViewTransactionDialogOpen] =
    useState(false);
  const [isEditAccountDialogOpen, setIsEditAccountDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<CashTransaction | null>(null);
  const [viewingTransaction, setViewingTransaction] =
    useState<CashTransaction | null>(null);
  const [todaysClosingBalance, setTodaysClosingBalance] = useState(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [presetTransactionType, setPresetTransactionType] = useState<
    "cash_in" | "cash_out" | "transfer"
  >("cash_in");

  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);

  const account = accounts.find((acc) => acc.id === accountId);

  // Store the current account ID and URL state in localStorage for navigation persistence
  useEffect(() => {
    if (accountId) {
      const currentUrl = window.location.pathname + window.location.search;
      localStorage.setItem("lastVisitedCashAccount", accountId);
      localStorage.setItem("lastVisitedCashAccountUrl", currentUrl);
    }
  }, [accountId, searchParams]);

  useEffect(() => {
    if (accountId) {
      const loadTodaysBalance = async () => {
        setIsLoadingBalance(true);
        try {
          const summary = await getDailySummary(new Date(), accountId);
          setTodaysClosingBalance(summary.closingBalance);
        } finally {
          setIsLoadingBalance(false);
        }
      };
      loadTodaysBalance();
    }
  }, [accountId, getDailySummary, transactions]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refreshAccounts(), refreshTransactions()]);
      if (accountId) {
        setIsLoadingBalance(true);
        const summary = await getDailySummary(new Date(), accountId);
        setTodaysClosingBalance(summary.closingBalance);
        setIsLoadingBalance(false);
      }
      // Force refresh of the DailyCashSummary component
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTransactionDeleted = async () => {
    // Auto-refresh data after deletion
    await Promise.all([refreshTransactions(), refreshAccounts()]);

    // Refresh balance
    if (accountId) {
      setIsLoadingBalance(true);
      const summary = await getDailySummary(new Date(), accountId);
      setTodaysClosingBalance(summary.closingBalance);
      setIsLoadingBalance(false);
    }

    // Force refresh of the DailyCashSummary component
    setRefreshKey((prev) => prev + 1);
  };

  const handleCreateTransaction = async (data: CashTransactionFormData) => {
    try {
      await createTransaction(data);
      setIsTransactionDialogOpen(false);

      // Auto-refresh data after creating transaction
      await Promise.all([refreshTransactions(), refreshAccounts()]);

      // Refresh balance
      if (accountId) {
        setIsLoadingBalance(true);
        const summary = await getDailySummary(new Date(), accountId);
        setTodaysClosingBalance(summary.closingBalance);
        setIsLoadingBalance(false);
      }

      // Force refresh of the DailyCashSummary component
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("Error creating transaction:", error);
    }
  };

  const handleEditTransaction = (transaction: CashTransaction) => {
    setEditingTransaction(transaction);
    setIsEditTransactionDialogOpen(true);
  };

  const handleViewTransaction = (transaction: CashTransaction) => {
    setViewingTransaction(transaction);
    setIsViewTransactionDialogOpen(true);
  };

  const handleUpdateTransaction = async (
    id: string,
    data: Partial<CashTransactionFormData>,
  ) => {
    try {
      await updateTransaction(id, data);
      setIsEditTransactionDialogOpen(false);
      setEditingTransaction(null);

      // Auto-refresh data after updating transaction
      await Promise.all([refreshTransactions(), refreshAccounts()]);

      // Refresh balance
      if (accountId) {
        setIsLoadingBalance(true);
        const summary = await getDailySummary(new Date(), accountId);
        setTodaysClosingBalance(summary.closingBalance);
        setIsLoadingBalance(false);
      }

      // Force refresh of the DailyCashSummary component
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("Error updating transaction:", error);
    }
  };

  const handleEditAccount = async (data: CashAccountFormData) => {
    setIsSubmittingAccount(true);
    try {
      if (accountId) {
        await updateAccount(accountId, data);
        setIsEditAccountDialogOpen(false);
        // Refresh balance in case opening balance was changed
        setIsLoadingBalance(true);
        const summary = await getDailySummary(new Date(), accountId);
        setTodaysClosingBalance(summary.closingBalance);
        setIsLoadingBalance(false);
      }
    } catch (error) {
      console.error("Error updating account:", error);
    } finally {
      setIsSubmittingAccount(false);
    }
  };

  const handleQuickTransaction = (
    type: "cash_in" | "cash_out" | "transfer",
  ) => {
    setPresetTransactionType(type);
    setIsTransactionDialogOpen(true);
  };

  if (businessLoading || !currentBusiness || isLoading || profilesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner message="Loading cash account details..." />
      </div>
    );
  }

  if (!hasPermission("finance", "view")) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to view cash accounts. Please contact
            your administrator if you believe this is an error.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => router.push("/")} variant="outline">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const canCreate = hasPermission("finance", "create");
  const canEdit = hasPermission("finance", "edit");

  if (!account) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Account not found</h2>
          <Button onClick={() => router.push("/cash")}>
            Back to Cash Accounts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-0">
      <CashTransactionDialog
        open={isTransactionDialogOpen}
        onOpenChange={setIsTransactionDialogOpen}
        onSubmit={handleCreateTransaction}
        accounts={accounts}
        defaultAccountId={accountId}
        presetTransactionType={presetTransactionType}
      />

      <EditCashTransactionDialog
        open={isEditTransactionDialogOpen}
        onOpenChange={setIsEditTransactionDialogOpen}
        onSubmit={handleUpdateTransaction}
        transaction={editingTransaction}
        accounts={accounts}
      />

      <ViewCashTransactionDialog
        open={isViewTransactionDialogOpen}
        onOpenChange={setIsViewTransactionDialogOpen}
        transaction={viewingTransaction}
      />

      <CashAccountDialog
        open={isEditAccountDialogOpen}
        onOpenChange={setIsEditAccountDialogOpen}
        onSubmit={handleEditAccount}
        title="Edit Cash Account"
        initialData={{
          name: account.name,
          description: account.description || "",
          openingBalance: account.openingBalance,
          isDefault: account.isDefault,
        }}
        isSubmitting={isSubmittingAccount}
      />

      <CashCSVUploadDialog
        open={isCSVUploadDialogOpen}
        onOpenChange={setIsCSVUploadDialogOpen}
        accountId={accountId || ""}
        onUploadComplete={() => {
          setIsCSVUploadDialogOpen(false);
          handleRefresh();
        }}
      />

      <BulkTransactionAddTab
        open={isBulkTransactionDialogOpen}
        onOpenChange={setIsBulkTransactionDialogOpen}
        accountId={accountId || ""}
        onSuccess={() => {
          setIsBulkTransactionDialogOpen(false);
          handleRefresh();
        }}
      />

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size={isMobile ? "sm" : "sm"}
            type="button"
            onClick={() => {
              // Clear the stored account when explicitly navigating back
              localStorage.removeItem("lastVisitedCashAccount");
              localStorage.removeItem("lastVisitedCashAccountUrl");
              router.push("/cash");
            }}
            className="gap-2 px-2 md:px-3">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Cash</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold break-words">
            {account.name}
          </h1>
          {account.description && (
            <p className="text-sm md:text-base text-muted-foreground">
              {account.description}
            </p>
          )}
          <div className="text-lg md:text-xl font-semibold">
            {isLoadingBalance ? (
              <div className="flex items-center gap-2">
                <span>Current Balance:</span>
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <span>
                Current Balance:{" "}
                {canManageFinanceAccounts
                  ? formatCashAmount(
                      todaysClosingBalance,
                      settings.currency || "USD",
                    )
                  : "•••"}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {canEdit && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditAccountDialogOpen(true)}
              className="gap-2 text-sm"
              size={isMobile ? "sm" : "default"}>
              <Edit className="h-4 w-4" />
              Edit Account
            </Button>
          )}
        </div>
      </div>

      {/* Transaction Center */}
      <Card className="border-none shadow-md overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <h3 className="text-lg font-bold tracking-tight">
                Transaction Center
              </h3>
              <p className="text-xs text-muted-foreground">
                Manage your account entries efficiently
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full hover:bg-white dark:hover:bg-slate-800 shadow-sm border"
                title="Refresh Data">
                <RefreshCcw
                  className={cn("h-4 w-4", isRefreshing && "animate-spin")}
                />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={generateTransactionCSVTemplate}
                className="h-9 w-9 rounded-full hover:bg-white dark:hover:bg-slate-800 shadow-sm border"
                title="Download CSV Template">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Primary Action */}
            <Button
              type="button"
              onClick={() => setIsTransactionDialogOpen(true)}
              disabled={!canCreate}
              className={cn(
                "h-auto py-4 flex flex-col items-center justify-center gap-2 text-white shadow-lg border-none active:scale-[0.98] transition-all",
                canCreate
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-slate-400 cursor-not-allowed opacity-60",
              )}>
              <div className="bg-white/20 p-2 rounded-lg">
                <Plus className="h-5 w-5" />
              </div>
              <div className="text-center">
                <span className="block font-bold">New Entry</span>
                <span className="block text-[10px] opacity-80 font-medium">
                  Single Transaction
                </span>
              </div>
            </Button>

            {/* Bulk Entry */}
            <Button
              type="button"
              onClick={() => setIsBulkTransactionDialogOpen(true)}
              variant="outline"
              disabled={!canCreate}
              className={cn(
                "h-auto py-4 flex flex-col items-center justify-center gap-2 border-slate-200 dark:border-slate-800 shadow-sm active:scale-[0.98] transition-all",
                canCreate
                  ? "hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 hover:border-indigo-200"
                  : "opacity-60 cursor-not-allowed",
              )}>
              <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <div className="text-center">
                <span className="block font-bold">Bulk Entry</span>
                <span className="block text-[10px] text-muted-foreground font-medium">
                  Manual Batch
                </span>
              </div>
            </Button>

            {/* CSV Import */}
            <Button
              type="button"
              onClick={() => setIsCSVUploadDialogOpen(true)}
              variant="outline"
              disabled={!canCreate}
              className={cn(
                "h-auto py-4 flex flex-col items-center justify-center gap-2 border-slate-200 dark:border-slate-800 shadow-sm col-span-1 sm:col-span-2 lg:col-span-1 active:scale-[0.98] transition-all",
                canCreate
                  ? "hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 hover:border-emerald-200"
                  : "opacity-60 cursor-not-allowed",
              )}>
              <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
                <Upload className="h-5 w-5" />
              </div>
              <div className="text-center">
                <span className="block font-bold">Import CSV</span>
                <span className="block text-[10px] text-muted-foreground font-medium">
                  Process Legacy Logs
                </span>
              </div>
            </Button>
          </div>
        </div>
      </Card>

      {/* Quick Access Shortcuts */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Quick Shortcuts
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleQuickTransaction("cash_in")}
            disabled={!canCreate}
            className={cn(
              "group justify-between h-12 border-green-100 dark:border-green-900/30 transition-all font-semibold",
              canCreate
                ? "hover:bg-green-50 dark:hover:bg-green-900/10 hover:border-green-300"
                : "opacity-60 cursor-not-allowed",
            )}>
            <div className="flex items-center gap-2">
              <div className="bg-green-100 dark:bg-green-900/30 p-1.5 rounded-md text-green-600">
                <ArrowUpRight className="h-4 w-4" />
              </div>
              <span className="text-green-700 dark:text-green-400">
                Cash In
              </span>
            </div>
            {canCreate && (
              <Plus className="h-3 w-3 text-green-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleQuickTransaction("cash_out")}
            disabled={!canCreate}
            className={cn(
              "group justify-between h-12 border-red-100 dark:border-red-900/30 transition-all font-semibold",
              canCreate
                ? "hover:bg-red-50 dark:hover:bg-red-900/10 hover:border-red-300"
                : "opacity-60 cursor-not-allowed",
            )}>
            <div className="flex items-center gap-2">
              <div className="bg-red-100 dark:bg-red-900/30 p-1.5 rounded-md text-red-600">
                <ArrowDownRight className="h-4 w-4" />
              </div>
              <span className="text-red-700 dark:text-red-400">Cash Out</span>
            </div>
            {canCreate && (
              <Plus className="h-3 w-3 text-red-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleQuickTransaction("transfer")}
            disabled={!canCreate}
            className={cn(
              "group justify-between h-12 border-blue-100 dark:border-blue-900/30 transition-all font-semibold",
              canCreate
                ? "hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:border-blue-300"
                : "opacity-60 cursor-not-allowed",
            )}>
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-1.5 rounded-md text-blue-600">
                <ArrowRightLeft className="h-4 w-4" />
              </div>
              <span className="text-blue-700 dark:text-blue-400">Transfer</span>
            </div>
            {canCreate && (
              <Plus className="h-3 w-3 text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </Button>
        </div>
      </div>

      {/* Daily Summary */}
      <DailyCashSummary key={refreshKey} accountId={accountId} />

      {/* Transactions List */}
      <Card>
        <CardHeader className="pb-3 md:pb-6">
          <CardTitle className="text-lg md:text-xl">
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 md:px-6">
          <CashTransactionsList
            transactions={transactions}
            accountId={accountId}
            showAccountColumn={false}
            onEditTransaction={handleEditTransaction}
            onViewTransaction={handleViewTransaction}
            onTransactionDeleted={handleTransactionDeleted}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default CashAccount;
