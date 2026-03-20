"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useExpenses } from "@/hooks/useExpenses";
import { useExpenseData } from "@/hooks/useExpenseData";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import ExpenseHeader from "@/components/expenses/ExpenseHeader";
import ExpenseContent from "@/components/expenses/ExpenseContent";
import ExpensesDateFilter from "@/components/expenses/ExpensesDateFilter";
import EditExpenseDialog from "@/components/expenses/EditExpenseDialog"; // Use existing EditExpenseDialog or ViewExpenseDialog for single entry?
import ExpenseForm from "@/components/expenses/ExpenseForm"; // Use ExpenseForm directly or in a Dialog
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExpenseBulkAddDialog from "@/components/expenses/ExpenseBulkAddDialog";
import ExpenseCSVUploadDialog from "@/components/expenses/ExpenseCSVUploadDialog";
import ExpenseCenter from "@/components/expenses/ExpenseCenter";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatCashCurrency } from "@/lib/utils";
import {
  LayoutGrid,
  List,
  PieChart,
  Plus,
  Upload,
  AlertCircle,
} from "lucide-react";
import { useProfiles } from "@/contexts/ProfileContext";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import { exportExpensesToCSV } from "@/utils/exportExpensesToCSV";
import { exportExpensesToPDF } from "@/utils/exportExpensesToPDF";
import { generateExpenseTemplate } from "@/utils/generateExpenseTemplate";

import { Expense } from "@/hooks/useExpenses";

const ExpensesClient = ({
  initialExpenses,
}: {
  initialExpenses?: Expense[];
}) => {
  const { user } = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { hasPermission, isLoading: profilesLoading } = useProfiles();
  const { settings } = useBusinessSettings();
  const {
    expenses,
    isLoading,
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
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  const { filteredExpenses, expenseStats, formatCurrency } = useExpenseData(
    expenses || [],
    dateFilter,
    customDateRange,
  );

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
    exportExpensesToCSV(filteredExpenses, formatCurrency, currency);
  }, [filteredExpenses, formatCurrency, settings?.currency]);

  const handleExportPDF = useCallback(() => {
    const currency = settings?.currency || "USD";
    exportExpensesToPDF(
      filteredExpenses,
      formatCurrency,
      currency,
      settings?.businessName,
      settings?.businessLogo,
      dateFilter,
      customDateRange,
    );
  }, [filteredExpenses, formatCurrency, settings, dateFilter, customDateRange]);

  if (profilesLoading || isLoading) {
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

  return (
    <div className="space-y-6">
      <ExpenseHeader
        onAddExpense={() => setIsFormDialogOpen(true)}
        isRefreshing={isLoading}
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
              dateRange={customDateRange}
              onDateFilterChange={setDateFilter}
              onDateRangeChange={setCustomDateRange}
            />

            <ExpenseContent
              filteredExpenses={filteredExpenses}
              expenseStats={expenseStats}
              formatCurrency={formatCurrency}
              dateFilter={dateFilter}
              onUpdateExpense={updateExpense}
              onDeleteExpense={deleteExpense}
              showOnlyOverview={true}
            />
          </TabsContent>

          <TabsContent
            value="expenses-list"
            className="space-y-6 animate-in fade-in-50 duration-300">
            <ExpensesDateFilter
              dateFilter={dateFilter}
              dateRange={customDateRange}
              onDateFilterChange={setDateFilter}
              onDateRangeChange={setCustomDateRange}
            />

            <ExpenseContent
              filteredExpenses={filteredExpenses}
              expenseStats={expenseStats}
              formatCurrency={formatCurrency}
              dateFilter={dateFilter}
              onUpdateExpense={updateExpense}
              onDeleteExpense={deleteExpense}
              showOnlyList={true}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ExpensesClient;
