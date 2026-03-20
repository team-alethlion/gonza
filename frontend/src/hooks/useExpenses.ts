/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useBusiness } from '@/contexts/BusinessContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getExpensesAction,
  createExpenseAction,
  updateExpenseAction,
  deleteExpenseAction,
  ExpenseInput
} from '@/app/actions/finance';
import { useAuth } from '@/components/auth/AuthProvider';

export interface Expense {
  id: string;
  amount: number;
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

import { localDb } from '@/lib/dexie';

export const useExpenses = (initialData?: Expense[]) => {
  const [expenses, setExpenses] = useState<Expense[]>(initialData || []);
  const { toast } = useToast();
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Load from Dexie cache on mount
  useEffect(() => {
    const loadFromCache = async () => {
      if (currentBusiness?.id && expenses.length === 0) {
        const cached = await localDb.expenses
          .where('locationId')
          .equals(currentBusiness.id)
          .reverse()
          .sortBy('date');
        
        if (cached && cached.length > 0) {
          console.log('[Expenses] Loaded from Dexie cache');
          setExpenses(cached.map((e: any) => ({
            ...e,
            date: new Date(e.date),
            createdAt: new Date(e.createdAt),
            updatedAt: new Date(e.updatedAt)
          })));
        }
      }
    };
    loadFromCache();
  }, [currentBusiness?.id, expenses.length]);

  const loadExpenses = useCallback(async (): Promise<Expense[]> => {
    if (!currentBusiness) {
      return [];
    }

    try {
      const result = await getExpensesAction(currentBusiness.id);

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch expenses');
      }

      // Sanitize: Ensure expenses is an array
      const rawExpenses = Array.isArray(result.data?.expenses) ? result.data.expenses : [];

      const formattedExpenses: Expense[] = rawExpenses.map((expense: any) => ({
        id: expense.id,
        amount: Number(expense.amount),
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

      // Update Dexie cache in the background
      if (formattedExpenses.length > 0) {
        const cacheData = formattedExpenses.map((e: any) => ({
          ...e,
          locationId: currentBusiness.id as string,
        }));
        await localDb.expenses.where('locationId').equals(currentBusiness.id).delete();
        await localDb.expenses.bulkPut(cacheData as any);
      }

      return formattedExpenses;
    } catch (error) {
      console.error('Error loading expenses:', error);
      toast({
        title: "Error",
        description: "Failed to load expenses. Please try again.",
        variant: "destructive"
      });
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusiness?.id, toast]);

  // React Query caching
  const queryKey = ['expenses', currentBusiness?.id];
  const { data: queriedExpenses, isLoading: isQueryLoading } = useQuery({
    queryKey,
    queryFn: loadExpenses,
    enabled: !!currentBusiness?.id,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialData: initialData?.length ? initialData : undefined
  });

  useEffect(() => {
    if (queriedExpenses) {
      setExpenses(queriedExpenses);
    }
  }, [queriedExpenses]);

  // Only report loading when there is no cached data yet to avoid skeleton flash
  const isLoading = isQueryLoading && !queriedExpenses;

  const createExpense = async (expenseData: {
    amount: number;
    description: string;
    category?: string;
    date: Date;
    paymentMethod?: string;
    personInCharge?: string;
    receiptImage?: string;
    linkToCash?: boolean;
    cashAccountId?: string;
  }) => {
    if (!currentBusiness || !user) {
      toast({
        title: "Error",
        description: !currentBusiness ? "No business selected" : "User not authenticated",
        variant: "destructive"
      });
      return;
    }

    try {
      const input: ExpenseInput = {
        amount: expenseData.amount,
        description: expenseData.description,
        category: expenseData.category,
        date: expenseData.date,
        paymentMethod: expenseData.paymentMethod,
        personInCharge: expenseData.personInCharge,
        receiptImage: expenseData.receiptImage,
        cashAccountId: expenseData.cashAccountId,
        userId: user.id,
        locationId: currentBusiness.id
      };

      const result = await createExpenseAction(input, !!expenseData.linkToCash);

      if (!result.success || !result.data) {
        throw new Error(result.error);
      }

      const data = result.data;
      const newExpense: Expense = {
        id: data.id,
        amount: Number(data.amount),
        description: data.description,
        category: data.category,
        date: new Date(data.date),
        paymentMethod: data.paymentMethod,
        personInCharge: data.personInCharge,
        receiptImage: data.receiptImage,
        cashAccountId: data.cashAccountId,
        cashTransactionId: data.cashTransactionId,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt)
      };

      // Update local state and cache
      setExpenses(prev => [newExpense, ...prev]);
      queryClient.setQueryData(queryKey, (oldData: Expense[] | undefined) => {
        return oldData ? [newExpense, ...oldData] : [newExpense];
      });

      queryClient.invalidateQueries({ queryKey });

      toast({
        title: "Success",
        description: "Expense created successfully"
      });

      return newExpense;
    } catch (error) {
      console.error('Error creating expense:', error);
      toast({
        title: "Error",
        description: "Failed to create expense. Please try again.",
        variant: "destructive"
      });
    }
  };

  const updateExpense = async (id: string, updates: Partial<Expense & { linkToCash?: boolean }>) => {
    try {
      const currentExpense = expenses.find(exp => exp.id === id);
      if (!currentExpense) throw new Error('Expense not found');

      // Prepare update payload
      const updatePayload = {
        amount: updates.amount !== undefined ? updates.amount : currentExpense.amount,
        description: updates.description !== undefined ? updates.description : currentExpense.description,
        category: updates.category !== undefined ? updates.category : currentExpense.category,
        date: updates.date !== undefined ? updates.date : currentExpense.date,
        paymentMethod: updates.paymentMethod !== undefined ? updates.paymentMethod : currentExpense.paymentMethod,
        personInCharge: updates.personInCharge !== undefined ? updates.personInCharge : currentExpense.personInCharge,
        receiptImage: updates.receiptImage !== undefined ? updates.receiptImage : currentExpense.receiptImage,
        cashAccountId: updates.linkToCash ? updates.cashAccountId : (updates.linkToCash === false ? null : currentExpense.cashAccountId)
      };

      if (!currentBusiness) throw new Error('No business selected');

      const result = await updateExpenseAction(id, currentBusiness.id, updatePayload);
      if (!result.success) throw new Error(result.error);

      queryClient.invalidateQueries({ queryKey });

      toast({
        title: "Success",
        description: "Expense updated successfully"
      });
    } catch (error) {
      console.error('Error updating expense:', error);
      toast({
        title: "Error",
        description: "Failed to update expense. Please try again.",
        variant: "destructive"
      });
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      if (!currentBusiness) throw new Error('No business selected');
      const result = await deleteExpenseAction(id, currentBusiness.id);
      if (!result.success) throw new Error(result.error);

      // Optimistic update
      setExpenses(prev => prev.filter(e => e.id !== id));
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return (old as Expense[]).filter(e => e.id !== id);
      });
      queryClient.invalidateQueries({ queryKey });

      toast({
        title: "Success",
        description: "Expense deleted successfully"
      });

      return true;
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Error",
        description: "Failed to delete expense. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  const refreshExpenses = async () => {
    queryClient.invalidateQueries({ queryKey });
  };

  const createBulkExpenses = async (expensesData: {
    amount: number;
    description: string;
    category?: string;
    date: Date;
    paymentMethod?: string;
    personInCharge?: string;
    receiptImage?: string;
    linkToCash?: boolean;
    cashAccountId?: string;
  }[]) => {
    if (!currentBusiness || !user) {
      toast({
        title: "Error",
        description: !currentBusiness ? "No business selected" : "User not authenticated",
        variant: "destructive"
      });
      return;
    }

    try {
      const bulkResults: Expense[] = [];

      // For bulk, since each might need individual linking logic in the action, 
      // we'll loop calling the createExpenseAction or we could implement a bulk action.
      // Reusing createExpenseAction is simpler for now as it handles the transaction.
      for (const data of expensesData) {
        const input: ExpenseInput = {
          amount: data.amount,
          description: data.description,
          category: data.category,
          date: data.date,
          paymentMethod: data.paymentMethod,
          personInCharge: data.personInCharge,
          receiptImage: data.receiptImage,
          cashAccountId: data.cashAccountId,
          userId: user.id,
          locationId: currentBusiness.id
        };

        const result = await createExpenseAction(input, !!data.linkToCash);

        if (result.success && result.data) {
          const e = result.data;
          bulkResults.push({
            id: e.id,
            amount: Number(e.amount),
            description: e.description,
            category: e.category,
            date: new Date(e.date),
            paymentMethod: e.paymentMethod,
            personInCharge: e.personInCharge,
            receiptImage: e.receiptImage,
            cashAccountId: e.cashAccountId,
            cashTransactionId: e.cashTransactionId,
            createdAt: new Date(e.createdAt),
            updatedAt: new Date(e.updatedAt)
          });
        }
      }

      queryClient.invalidateQueries({ queryKey });

      toast({
        title: "Success",
        description: `Successfully created ${bulkResults.length} expenses`
      });

      return bulkResults;
    } catch (error) {
      console.error('Error creating bulk expenses:', error);
      toast({
        title: "Error",
        description: "Failed to create bulk expenses. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    expenses,
    isLoading,
    createExpense,
    createBulkExpenses,
    updateExpense,
    deleteExpense,
    refreshExpenses
  };
};
