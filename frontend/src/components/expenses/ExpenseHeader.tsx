"use client";
import React from 'react';
import { Plus, RefreshCcw, Download, FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ExpenseCategoriesManager from '@/components/expenses/ExpenseCategoriesManager';
import { useIsMobile } from '@/hooks/use-mobile';

interface ExpenseHeaderProps {
  onAddExpense: () => void;
  onAddBulkExpense: () => void;
  onImportExpenses: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onExportCSV?: () => void;
  onExportPDF?: () => void;
  onDownloadTemplate?: () => void;
  canCreate?: boolean;
}

const ExpenseHeader: React.FC<ExpenseHeaderProps> = ({
  onAddExpense,
  onAddBulkExpense,
  onImportExpenses,
  onRefresh,
  isRefreshing,
  onExportCSV,
  onExportPDF,
  onDownloadTemplate,
  canCreate = true
}) => {
  const isMobile = useIsMobile();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold">Expenses</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Track and manage your business expenses
        </p>
      </div>

      {/* Action Buttons Row 1 */}
      <div className="flex flex-wrap gap-2 sm:gap-3">
        {canCreate && (
          <Button
            onClick={onAddExpense}
            className="gap-2 text-sm bg-red-600 hover:bg-red-700 shadow-sm"
            size={isMobile ? "sm" : "default"}
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        )}
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="gap-2 text-sm"
          size={isMobile ? "sm" : "default"}
        >
          <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>

        <Button
          variant="outline"
          onClick={onDownloadTemplate}
          className="gap-2 text-sm border-green-200 dark:border-green-900/30 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/10"
          size={isMobile ? "sm" : "default"}
        >
          <Download className="h-4 w-4" />
          Template
        </Button>

        <div className="hidden sm:block">
          <ExpenseCategoriesManager />
        </div>
      </div>

      {/* Action Buttons Row 2 (Secondary Actions) */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/50 mt-2">
        {canCreate && (
          <Button
            variant="ghost"
            onClick={onAddBulkExpense}
            className="gap-2 text-xs h-8 px-3 text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
          >
            <Plus className="h-3.5 w-3.5" />
            Bulk Entry
          </Button>
        )}
        {canCreate && (
          <Button
            variant="ghost"
            onClick={onImportExpenses}
            className="gap-2 text-xs h-8 px-3 text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
          >
            <Upload className="h-3.5 w-3.5" />
            Import
          </Button>
        )}

        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1" />

        {onExportCSV && (
          <Button
            variant="ghost"
            onClick={onExportCSV}
            className="gap-2 text-xs h-8 px-3 text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10"
          >
            <FileText className="h-3.5 w-3.5" />
            CSV Export
          </Button>
        )}
        {onExportPDF && (
          <Button
            variant="ghost"
            onClick={onExportPDF}
            className="gap-2 text-xs h-8 px-3 text-slate-600 dark:text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/10"
          >
            <FileText className="h-3.5 w-3.5" />
            PDF Export
          </Button>
        )}

        <div className="sm:hidden block ml-auto">
          <ExpenseCategoriesManager />
        </div>
      </div>
    </div>
  );
};

export default ExpenseHeader;