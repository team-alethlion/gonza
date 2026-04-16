import { useMemo } from 'react';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { formatCashCurrency } from '@/lib/utils';
import { Expense } from '@/hooks/useExpenses';
import { getDateRangeFromFilter, isDateInRange } from '@/utils/dateFilters';

export const useExpenseData = (
  expenses: Expense[],
  dateFilter: string,
  customDateRange: { from: Date | undefined; to: Date | undefined },
  backendStats?: any
) => {
  const { settings } = useBusinessSettings();

  // Memoize currency formatter
  const formatCurrency = useMemo(() => {
    const currency = settings.currency || 'USD';
    return (amount: number) => {
      if (amount === null) return '•••';
      return formatCashCurrency(amount, currency);
    };
  }, [settings.currency]);

  // Memoize filtered expenses based on selected date range
  const filteredExpenses = useMemo(() => {
    if (dateFilter === 'all') {
      return expenses;
    }

    let from: Date | undefined;
    let to: Date | undefined;

    if (dateFilter === 'custom') {
      from = customDateRange.from;
      to = customDateRange.to;
    } else {
      const range = getDateRangeFromFilter(dateFilter);
      from = range.from;
      to = range.to;
    }

    return expenses.filter(expense => isDateInRange(expense.date, from, to));
  }, [expenses, dateFilter, customDateRange]);

  // Memoize calculated values
  const expenseStats = useMemo(() => {
    if (backendStats) {
      return {
        totalExpenses: backendStats.total_expenses,
        thisMonthExpenses: backendStats.this_month_expenses,
        transactionCount: backendStats.transaction_count
      };
    }

    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);

    const thisMonthExpenses = filteredExpenses
      .filter(expense => {
        const expenseMonth = expense.date.getMonth();
        const currentMonth = new Date().getMonth();
        const expenseYear = expense.date.getFullYear();
        const currentYear = new Date().getFullYear();
        return expenseMonth === currentMonth && expenseYear === currentYear;
      })
      .reduce((sum, expense) => sum + (expense.amount || 0), 0);

    return {
      totalExpenses,
      thisMonthExpenses,
      transactionCount: filteredExpenses.length
    };
  }, [filteredExpenses, backendStats]);

  return {
    filteredExpenses,
    expenseStats,
    formatCurrency
  };
};