import React from 'react';
import ExpenseStatsCards from '@/components/expenses/ExpenseStatsCards';
import RecentExpensesCard from '@/components/expenses/RecentExpensesCard';
import ExpenseCategoriesSummary from '@/components/expenses/ExpenseCategoriesSummary';
import ExpensesList from '@/components/expenses/ExpensesList';
import { Expense } from '@/hooks/useExpenses';

interface ExpenseContentProps {
  filteredExpenses: Expense[];
  expenseStats: {
    totalExpenses: number | null;
    thisMonthExpenses: number | null;
    transactionCount: number;
  };
  formatCurrency: (amount: number | null) => string;
  dateFilter: string;
  onUpdateExpense: (id: string, data: any) => Promise<any>;
  onDeleteExpense: (id: string) => Promise<boolean>;
  showOnlyOverview?: boolean;
  showOnlyList?: boolean;
  backendStats?: any;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
}

const ExpenseContent: React.FC<ExpenseContentProps> = ({
  filteredExpenses,
  expenseStats,
  formatCurrency,
  dateFilter,
  onUpdateExpense,
  onDeleteExpense,
  showOnlyOverview = false,
  showOnlyList = false,
  backendStats,
  searchTerm,
  onSearchChange
}) => {
  if (showOnlyOverview) {
    return (
      <div className="space-y-4 md:space-y-6">
        {/* Summary Cards */}
        <ExpenseStatsCards
          totalExpenses={expenseStats.totalExpenses}
          thisMonthExpenses={expenseStats.thisMonthExpenses}
          transactionCount={expenseStats.transactionCount}
          formatCurrency={formatCurrency}
          dateFilter={dateFilter}
        />

        {/* Categories Summary */}
        <ExpenseCategoriesSummary 
          expenses={filteredExpenses} 
          formatCurrency={formatCurrency} 
          backendStats={backendStats}
        />

        {/* Recent Expenses */}
        <RecentExpensesCard
          filteredExpenses={filteredExpenses}
          formatCurrency={formatCurrency}
        />
      </div>
    );
  }

  if (showOnlyList) {
    return (
      <div className="space-y-4">
        <ExpensesList
          expenses={filteredExpenses}
          onUpdateExpense={onUpdateExpense}
          onDeleteExpense={onDeleteExpense}
          formatCurrency={formatCurrency}
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
        />
      </div>
    );
  }

  // Fallback / original behavior if neither prop is provided
  return (
    <div className="space-y-6">
      <ExpenseStatsCards
        totalExpenses={expenseStats.totalExpenses}
        thisMonthExpenses={expenseStats.thisMonthExpenses}
        transactionCount={expenseStats.transactionCount}
        formatCurrency={formatCurrency}
        dateFilter={dateFilter}
      />
      <ExpensesList
        expenses={filteredExpenses}
        onUpdateExpense={onUpdateExpense}
        onDeleteExpense={onDeleteExpense}
        formatCurrency={formatCurrency}
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
      />
    </div>
  );
};

export default ExpenseContent;
