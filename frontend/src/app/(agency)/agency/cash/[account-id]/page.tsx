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
import { useNavigationStore } from "@/store/useNavigationStore";
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
  const goBack = useNavigationStore((state) => state.goBack);
  const { currentBusiness, isLoading: businessLoading } = useBusiness();
  const { accounts, isLoading, updateAccount, refreshAccounts } =
    useCashAccounts();
  const { createTransaction } = useCashTransactions(accountId);

  // 🚀 REFACTORED: DailyCashSummary component below handles primary list fetching.
  // We use createTransaction here only for the quick-action header buttons.

  const { settings } = useBusinessSettings();
  const { hasPermission, isLoading: profilesLoading } = useProfiles();
  const { canManageFinanceAccounts } = useFinancialVisibility();
  const [isEditAccountDialogOpen, setIsEditAccountDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [presetTransactionType, setPresetTransactionType] = useState<"cash_in" | "cash_out" | "transfer">("cash_in");
  const [todaysClosingBalance, setTodaysClosingBalance] = useState(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);

  const account = accounts.find((acc) => acc.id === accountId);

  // 🚀 FIX: Fetch and display the live balance for the header
  useEffect(() => {
    if (accountId && currentBusiness?.id) {
      const fetchBalance = async () => {
        setIsLoadingBalance(true);
        try {
          const { getCashAccountBalanceAction } = await import(
            "@/app/actions/finance"
          );
          const result = await getCashAccountBalanceAction(
            accountId,
            currentBusiness.id,
          );
          if (result.success && typeof result.data === 'number') {
            setTodaysClosingBalance(result.data);
          }
        } finally {
          setIsLoadingBalance(false);
        }
      };
      fetchBalance();
    }
  }, [accountId, currentBusiness?.id, refreshKey]);

  useEffect(() => {
    if (accountId) {
      const currentUrl = window.location.pathname + window.location.search;
      localStorage.setItem("lastVisitedCashAccount", accountId);
      localStorage.setItem("lastVisitedCashAccountUrl", currentUrl);
    }
  }, [accountId, searchParams]);

  const handleEditAccount = async (data: CashAccountFormData) => {
    setIsSubmittingAccount(true);
    try {
      if (accountId) {
        await updateAccount(accountId, data);
        setIsEditAccountDialogOpen(false);
        // 🚀 REFRESH: Incrementing refreshKey will trigger balance re-fetch and summary reload
        setRefreshKey(prev => prev + 1);
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

  const handleTransactionSuccess = () => {
    setRefreshKey((prev) => prev + 1);
    setIsTransactionDialogOpen(false);
  };

  const handleCreateTransaction = async (data: CashTransactionFormData) => {
    await createTransaction(data);
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
          <Button onClick={() => router.push("/agency/cash")}>
            Back to Cash Accounts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-0">
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
              goBack(router);
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
          {canCreate && (
            <>
              <Button
                onClick={() => handleQuickTransaction("cash_in")}
                className="gap-2 bg-green-600 hover:bg-green-700 text-sm"
                size={isMobile ? "sm" : "default"}>
                <Plus className="h-4 w-4" />
                Cash In
              </Button>
              <Button
                onClick={() => handleQuickTransaction("cash_out")}
                className="gap-2 bg-red-600 hover:bg-red-700 text-sm"
                size={isMobile ? "sm" : "default"}>
                <Plus className="h-4 w-4" />
                Cash Out
              </Button>
              <Button
                onClick={() => handleQuickTransaction("transfer")}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-sm"
                size={isMobile ? "sm" : "default"}>
                <ArrowRightLeft className="h-4 w-4" />
                Transfer
              </Button>
            </>
          )}

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

      <CashTransactionDialog
        open={isTransactionDialogOpen}
        onOpenChange={setIsTransactionDialogOpen}
        onSuccess={handleTransactionSuccess}
        onSubmit={handleCreateTransaction}
        accountId={accountId}
        presetType={presetTransactionType}
        accounts={accounts}
      />

      {/* Daily Summary (The New Unified Engine) */}
      <DailyCashSummary key={refreshKey} accountId={accountId} />
    </div>
  );
};

export default CashAccount;
