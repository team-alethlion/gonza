"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useExpenses, useExpenseSummary, Expense } from "@/hooks/useExpenses";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import ExpenseHeader from "@/components/expenses/ExpenseHeader";
import ExpenseContent from "@/components/expenses/ExpenseContent";
import ExpensesDateFilter from "@/components/expenses/ExpensesDateFilter";
import ExpenseForm from "@/components/expenses/ExpenseForm";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExpenseBulkAddDialog from "@/components/expenses/ExpenseBulkAddDialog";
import ExpenseCSVUploadDialog from "@/components/expenses/ExpenseCSVUploadDialog";
import ExpenseCenter from "@/components/expenses/ExpenseCenter";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  List,
  PieChart,
  AlertCircle,
} from "lucide-react";
import { useProfiles } from "@/contexts/ProfileContext";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import { exportExpensesToCSV } from "@/utils/exportExpensesToCSV";
import { exportExpensesToPDF } from "@/utils/exportExpensesToPDF";
import { generateExpenseTemplate } from "@/utils/generateExpenseTemplate";
import { formatCashCurrency } from "@/lib/utils";
import { getDateRangeFromFilter } from "@/utils/dateFilters";

const ExpensesClient = ({
  initialExpenses,
  initialStats,
}: {
  initialExpenses?: Expense[];
  initialStats?: any;
}) => {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { hasPermission, isLoading: profilesLoading } = useProfiles();
  const { settings } = useBusinessSettings();

  // 1. Separate Hooks for Summary and List
  const { 
    stats, 
    isLoading: isStatsLoading, 
    filters: summaryFilters, 
    setFilters: setSummaryFilters 
  } = useExpenseSummary(initialStats);

  const {
    expenses,
    isLoading: isListLoading,
    searchTerm,
    setSearchTerm,
    filters: listFilters,
    setFilters: setListFilters,
    createExpense,
    updateExpense,
    deleteExpense,
    refreshExpenses,
  } = useExpenses(initialExpenses);

  const [activeTab, setActiveTab] = useState("overview");
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isBulkEntryOpen, setIsBulkEntryOpen] = useState(false);
  const [isCSVUploadOpen, setIsCSVUploadOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState("all");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  const formatCurrency = useCallback((amount: number | null) => {
    if (amount === null) return '•••';
    const currency = settings?.currency || "USD";
    return formatCashCurrency(amount, currency);
  }, [settings?.currency]);

  const handleCreateExpense = async (data: any) => {
    try {
      await createExpense(data);
      setIsFormDialogOpen(false);
    } catch (error) {
      console.error("Error creating expense:", error);
    }
  };

  const handleExportCSV = useCallback(() => {
    const currency = settings?.currency || "USD";
    exportExpensesToCSV(expenses, formatCurrency as any, currency);
  }, [expenses, formatCurrency, settings?.currency]);

  const handleExportPDF = useCallback(() => {
    const currency = settings?.currency || "USD";
    exportExpensesToPDF(
      expenses,
      formatCurrency as any,
      currency,
      settings?.businessName,
      settings?.businessLogo,
      'custom',
      { from: undefined, to: undefined } // Simplify for now or pass actual dates
    );
  }, [expenses, formatCurrency, settings]);

  if (profilesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasPermission("expenses", "view")) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to view expenses. Please contact your
            administrator if you believe this is an error.
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

  const canCreate = hasPermission("expenses", "create");

  // Sync date filters from local state to hooks
  const handleDateFilterChange = (val: string, range?: { from: Date | undefined; to: Date | undefined }) => {
    setDateFilter(val);
    const newFilters: any = {};
    if (val !== "all") {
      if (val === "custom" && range) {
        if (range.from) newFilters.date_from = range.from.toISOString();
        if (range.to) newFilters.date_to = range.to.toISOString();
      } else {
        const r = getDateRangeFromFilter(val);
        if (r.from) newFilters.date_from = r.from.toISOString();
        if (r.to) newFilters.date_to = r.to.toISOString();
      }
    }
    
    // Update both hooks if needed, or only the active one
    if (activeTab === "overview") {
      setSummaryFilters(newFilters);
    } else {
      setListFilters(newFilters);
    }
  };

  const handleDateRangeChange = (range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range);
    handleDateFilterChange("custom", range);
  };

  return (
    <div className="space-y-6">
      <ExpenseHeader
        onAddExpense={() => setIsFormDialogOpen(true)}
        isRefreshing={isListLoading || isStatsLoading}
        onRefresh={refreshExpenses}
        onAddBulkExpense={() => setIsBulkEntryOpen(true)}
        onImportExpenses={() => setIsCSVUploadOpen(true)}
        onExportCSV={handleExportCSV}
        onExportPDF={handleExportPDF}
        onDownloadTemplate={() => generateExpenseTemplate()}
        canCreate={canCreate}
      />

      <ExpenseForm
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        onSubmit={handleCreateExpense}
      />

      <ExpenseBulkAddDialog
        open={isBulkEntryOpen}
        onOpenChange={setIsBulkEntryOpen}
        onSuccess={() => {
          setIsBulkEntryOpen(false);
          refreshExpenses();
        }}
      />

      <ExpenseCSVUploadDialog
        open={isCSVUploadOpen}
        onOpenChange={setIsCSVUploadOpen}
        onUploadComplete={() => {
          setIsCSVUploadOpen(false);
          refreshExpenses();
        }}
      />

      <div className="px-4 md:px-0">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full space-y-6">
          <TabsList
            className={`grid w-full ${
              isMobile ? "grid-cols-2 gap-1 h-auto py-1" : "grid-cols-2"
            } bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl`}>
            <TabsTrigger
              value="overview"
              className="flex items-center gap-2 py-2.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
              <PieChart className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger
              value="expenses-list"
              className="flex items-center gap-2 py-2.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
              <List className="h-4 w-4" />
              <span>List</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="overview"
            className="space-y-6 animate-in fade-in-50 duration-300">
            <ExpenseCenter
              onNewEntry={() => setIsFormDialogOpen(true)}
              onBulkEntry={() => setIsBulkEntryOpen(true)}
              onImportCSV={() => setIsCSVUploadOpen(true)}
              canCreate={canCreate}
            />

            <ExpensesDateFilter
              dateFilter={dateFilter}
              dateRange={dateRange}
              onDateFilterChange={handleDateFilterChange}
              onDateRangeChange={handleDateRangeChange}
            />

            <ExpenseContent
              filteredExpenses={stats?.recent_expenses || []}
              expenseStats={{
                totalExpenses: stats?.total_expenses,
                thisMonthExpenses: stats?.this_month_expenses,
                transactionCount: stats?.transaction_count || 0
              }}
              formatCurrency={formatCurrency as any}
              dateFilter={"all"}
              onUpdateExpense={updateExpense}
              onDeleteExpense={deleteExpense}
              showOnlyOverview={true}
              backendStats={stats}
            />
          </TabsContent>

          <TabsContent
            value="expenses-list"
            className="space-y-6 animate-in fade-in-50 duration-300">
            <ExpensesDateFilter
              dateFilter={dateFilter}
              dateRange={dateRange}
              onDateFilterChange={handleDateFilterChange}
              onDateRangeChange={handleDateRangeChange}
            />

            <ExpenseContent
              filteredExpenses={expenses}
              expenseStats={{
                totalExpenses: stats?.total_expenses,
                thisMonthExpenses: stats?.this_month_expenses,
                transactionCount: stats?.transaction_count || 0
              }}
              formatCurrency={formatCurrency as any}
              dateFilter={"all"}
              onUpdateExpense={updateExpense}
              onDeleteExpense={deleteExpense}
              showOnlyList={true}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ExpensesClient;
