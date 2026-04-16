/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useBusiness } from '@/contexts/BusinessContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
import {
  getExpensesAction,
  createExpenseAction,
  updateExpenseAction,
  deleteExpenseAction,
  getExpenseStatsAction,
  createBulkExpensesAction,
  ExpenseInput
} from '@/app/actions/finance';
import { useAuth } from '@/components/auth/AuthProvider';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { localDb } from '@/lib/dexie';

export interface Expense {
  id: string;
  amount: number | null;
  description: string;
  category?: string;
  date: Date;
  paymentMethod?: string;
  personInCharge?: string;
  receiptImage?: string;
  cashAccountId?: string;
  cashTransactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Hook for Expense Summary & Aggregates (Overview Tab)
 */
export const useExpenseSummary = (initialStats?: any) => {
  const { currentBusiness } = useBusiness();
  const [filters, setFilters] = useState<any>({});

  const loadStats = useCallback(async (currentFilters?: any) => {
    if (!currentBusiness) return null;
    const result = await getExpenseStatsAction(currentBusiness.id, currentFilters);
    if (!result.success) return null;
    return result.data;
  }, [currentBusiness?.id]);

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['expenses-summary', currentBusiness?.id, JSON.stringify(filters)],
    queryFn: () => loadStats(filters),
    enabled: !!currentBusiness?.id,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    initialData: (initialStats && Object.keys(filters).length === 0) ? initialStats : undefined
  });

  return {
    stats,
    isLoading,
    isError,
    filters,
    setFilters
  };
};

/**
 * Hook for Expense List & CRUD (List Tab)
 */
export const useExpenses = (initialData?: Expense[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<any>({});
  const { toast } = useToast();
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLogger();

  const loadExpenses = useCallback(async (currentFilters?: any): Promise<Expense[]> => {
    if (!currentBusiness) return [];

    try {
      const result = await getExpensesAction(currentBusiness.id, 1, 100, currentFilters);
      if (!result.success) throw new Error(result.error || 'Failed to fetch expenses');

      const rawExpenses = Array.isArray(result.data?.expenses) ? result.data.expenses : [];

      const formattedExpenses: Expense[] = rawExpenses.map((expense: any) => ({
        id: expense.id,
        amount: expense.amount === null ? null : Number(expense.amount),
        description: expense.description,
        category: expense.category,
        date: new Date(expense.date),
        paymentMethod: expense.payment_method || expense.paymentMethod,
        personInCharge: expense.person_in_charge || expense.personInCharge,
        receiptImage: expense.receipt_image || expense.receiptImage,
        cashAccountId: expense.cash_account_id || expense.cashAccountId,
        cashTransactionId: expense.cash_transaction_id || expense.cashTransactionId,
        createdAt: new Date(expense.created_at || expense.createdAt),
        updatedAt: new Date(expense.updated_at || expense.updatedAt)
      }));

      // Background update Dexie only for the 'all' set
      if (!currentFilters?.search && Object.keys(currentFilters || {}).length === 0 && formattedExpenses.length > 0) {
        const cacheData = formattedExpenses.map((e: any) => ({ ...e, locationId: currentBusiness.id }));
        localDb.expenses.where('locationId').equals(currentBusiness.id).delete().then(() => {
          localDb.expenses.bulkPut(cacheData as any);
        });
      }

      return formattedExpenses;
    } catch (error: any) {
      console.error('Error loading expenses:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return [];
    }
  }, [currentBusiness?.id, toast]);

  // Dexie Fallback
  useEffect(() => {
    if (currentBusiness?.id && (!initialData || initialData.length === 0)) {
      localDb.expenses.where('locationId').equals(currentBusiness.id).reverse().sortBy('date').then(cached => {
        if (cached?.length > 0) {
          const hydrated = cached.map((e: any) => ({ ...e, date: new Date(e.date), createdAt: new Date(e.createdAt), updatedAt: new Date(e.updatedAt) }));
          queryClient.setQueryData(['expenses-list', currentBusiness.id, '', '{}'], hydrated);
        }
      });
    }
  }, [currentBusiness?.id, initialData, queryClient]);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const queryKey = ['expenses-list', currentBusiness?.id, debouncedSearchTerm, JSON.stringify(filters)];

  const { data: queriedExpenses, isLoading: isQueryLoading } = useQuery({
    queryKey,
    queryFn: () => loadExpenses({ search: debouncedSearchTerm, ...filters }),
    enabled: !!currentBusiness?.id,
    staleTime: 30_000,
    initialData: (initialData?.length && !debouncedSearchTerm && Object.keys(filters).length === 0) ? initialData : undefined
  });

  const refreshExpenses = async () => {
    queryClient.invalidateQueries({ queryKey: ['expenses-list'] });
    queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
  };

  const createExpense = async (expenseData: any) => {
    if (!currentBusiness || !user) return;
    try {
      const input: ExpenseInput = { ...expenseData, userId: user.id, locationId: currentBusiness.id };
      const result = await createExpenseAction(input, !!expenseData.linkToCash);
      if (!result.success) throw new Error(result.error);
      
      refreshExpenses();
      
      logActivity({
        activityType: 'CREATE',
        module: 'EXPENSES',
        entityType: 'expense',
        entityId: result.data.id,
        entityName: result.data.description,
        description: `Created expense "${result.data.description}" - Amount: ${result.data.amount}`,
        metadata: result.data
      });

      toast({ title: "Success", description: "Expense created successfully" });
      return result.data;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const updateExpense = async (id: string, updates: any) => {
    if (!currentBusiness) return;
    try {
      const result = await updateExpenseAction(id, currentBusiness.id, updates);
      if (!result.success) throw new Error(result.error);
      
      refreshExpenses();

      logActivity({
        activityType: 'UPDATE',
        module: 'EXPENSES',
        entityType: 'expense',
        entityId: id,
        entityName: updates.description || 'Expense',
        description: `Updated expense "${updates.description || 'Expense'}"`,
        metadata: updates
      });

      toast({ title: "Success", description: "Expense updated successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const deleteExpense = async (id: string) => {
    if (!currentBusiness) return false;
    try {
      const result = await deleteExpenseAction(id, currentBusiness.id);
      if (!result.success) throw new Error(result.error);
      
      refreshExpenses();

      logActivity({
        activityType: 'DELETE',
        module: 'EXPENSES',
        entityType: 'expense',
        entityId: id,
        entityName: 'Expense',
        description: `Deleted expense #${id}`,
      });

      toast({ title: "Success", description: "Expense deleted successfully" });
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
  };

  const createBulkExpenses = async (expensesData: any[]) => {
    if (!currentBusiness || !user) return;
    try {
      const result = await createBulkExpensesAction(currentBusiness.id, expensesData);
      if (!result.success) throw new Error(result.error);
      refreshExpenses();
      toast({ title: "Success", description: `Created ${expensesData.length} expenses` });
      return result.data;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return {
    expenses: queriedExpenses || [],
    isLoading: isQueryLoading && !queriedExpenses,
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    createExpense,
    createBulkExpenses,
    updateExpense,
    deleteExpense,
    refreshExpenses
  };
};
