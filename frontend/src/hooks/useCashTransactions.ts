/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useBusiness } from '@/contexts/BusinessContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CashTransaction,
  DbCashTransaction,
  CashTransactionFormData,
  DailyCashSummary,
  mapDbCashTransactionToCashTransaction
} from '@/types/cash';
import {
  getCashTransactionsAction,
  createCashTransactionAction,
  updateCashTransactionAction,
  deleteCashTransactionAction,
  createBulkCashTransactionsAction,
  getCashAccountSummaryAction
} from '@/app/actions/finance';

import { localDb } from '@/lib/dexie';

export const useCashTransactions = (accountId?: string, initialPageSize: number = 50) => {
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalCount, setTotalCount] = useState(0);
  const [internalTransactions, setInternalTransactions] = useState<CashTransaction[]>([]);

  // Load from Dexie cache on mount
  useEffect(() => {
    const loadFromCache = async () => {
      if (currentBusiness?.id && internalTransactions.length === 0) {
        const query = localDb.cashTransactions.where('locationId').equals(currentBusiness.id);
        
        if (accountId) {
          // Note: Multi-index querying in Dexie is better with compound index, 
          // but for now we filter in memory for specific account if needed or use simple filter
          const cached = await query.and(t => t.accountId === accountId).reverse().sortBy('date');
          setInternalTransactions(cached.map(t => ({...t, date: new Date(t.date), createdAt: new Date(t.createdAt), updatedAt: new Date(t.updatedAt)})));
        } else {
          const cached = await query.reverse().sortBy('date');
          setInternalTransactions(cached.map(t => ({...t, date: new Date(t.date), createdAt: new Date(t.createdAt), updatedAt: new Date(t.updatedAt)})));
        }
      }
    };
    loadFromCache();
  }, [currentBusiness?.id, accountId, internalTransactions.length]);

  const loadTransactions = useCallback(async (): Promise<CashTransaction[]> => {
    try {
      if (!user || !currentBusiness) {
        return [];
      }

      const result = await getCashTransactionsAction(currentBusiness.id, accountId, page, pageSize);

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch transactions');
      }

      if (result.data?.count !== undefined) {
        setTotalCount(result.data.count);
      }

      // Sanitize: getCashTransactionsAction returns { data: { transactions: [] } }
      const rawTransactions = Array.isArray(result.data?.transactions) ? result.data.transactions : [];

      // Format all transactions
      const formattedTransactions = rawTransactions.map((item: any) => {
        const dbTransaction: DbCashTransaction = {
          id: item.id,
          user_id: item.user_id,
          account_id: item.account_id,
          amount: Number(item.amount),
          transaction_type: item.transaction_type,
          category: item.category,
          description: item.description,
          person_in_charge: item.person_in_charge,
          tags: item.tags,
          date: item.date,
          payment_method: item.payment_method,
          receipt_image: item.receipt_image,
          created_at: item.created_at,
          updated_at: item.updated_at
        };
        return mapDbCashTransactionToCashTransaction(dbTransaction);
      });

      // Update Dexie cache in background (page 1 only)
      if (formattedTransactions.length > 0 && page === 1 && !accountId) {
        const cacheData = formattedTransactions.map((t: any) => ({
          ...t,
          locationId: currentBusiness.id as string,
        }));
        await localDb.cashTransactions.where('locationId').equals(currentBusiness.id).delete();
        await localDb.cashTransactions.bulkPut(cacheData as any);
      }

      return formattedTransactions;
    } catch (error) {
      console.error('Error loading cash transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load cash transactions",
        variant: "destructive"
      });
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentBusiness?.id, accountId, page, pageSize, toast]);

  const queryKey = useMemo(() => ['cash_transactions', currentBusiness?.id, user?.id, accountId, page, pageSize], [currentBusiness?.id, user?.id, accountId, page, pageSize]);

  const { data: transactions = internalTransactions, isLoading: isQueryLoading } = useQuery({
    queryKey,
    queryFn: loadTransactions,
    enabled: !!user && !!currentBusiness?.id,
    staleTime: 30_000,
    initialData: internalTransactions.length > 0 ? internalTransactions : undefined
  });

  useEffect(() => {
    if (transactions.length > 0) {
      setInternalTransactions(transactions);
    }
  }, [transactions]);

  const isLoading = isQueryLoading && transactions.length === 0;

  const createTransaction = useCallback(async (transactionData: CashTransactionFormData) => {
    try {
      if (!user || !currentBusiness) throw new Error('User not authenticated');

      const result = await createCashTransactionAction({
        ...transactionData,
        userId: user.id,
        locationId: currentBusiness.id
      });

      if (!result.success) throw new Error(result.error);

      toast({
        title: "Success",
        description: transactionData.transactionType === 'transfer'
          ? "Transfer completed successfully"
          : "Cash transaction created successfully"
      });

      queryClient.invalidateQueries({ queryKey });

      return Array.isArray(result.data)
        ? mapDbCashTransactionToCashTransaction(result.data[0])
        : mapDbCashTransactionToCashTransaction(result.data as any);
    } catch (error) {
      console.error('Error creating cash transaction:', error);
      toast({
        title: "Error",
        description: "Failed to create cash transaction",
        variant: "destructive"
      });
      throw error;
    }
  }, [user, currentBusiness, queryClient, queryKey, toast]);

  const createBulkTransactions = useCallback(async (transactionsData: CashTransactionFormData[]) => {
    try {
      if (!user || !currentBusiness) throw new Error('User not authenticated');

      const payloads = transactionsData.map(t => ({
        ...t,
        userId: user.id,
        locationId: currentBusiness.id
      }));

      const result = await createBulkCashTransactionsAction(payloads);

      if (!result.success) throw new Error(result.error);

      toast({
        title: "Success",
        description: `Successfully created ${transactionsData.length} transactions`
      });

      queryClient.invalidateQueries({ queryKey });
      return (result.data as any[]).map((item: any) => mapDbCashTransactionToCashTransaction(item));
    } catch (error) {
      console.error('Error creating bulk transactions:', error);
      toast({
        title: "Error",
        description: "Failed to create bulk transactions",
        variant: "destructive"
      });
      throw error;
    }
  }, [user, currentBusiness, queryClient, queryKey, toast]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<CashTransactionFormData>) => {
    try {
      if (!currentBusiness) throw new Error('No business selected');
      const result = await updateCashTransactionAction(id, currentBusiness.id, updates);
      if (!result.success) throw new Error(result.error);

      toast({
        title: "Success",
        description: "Transaction updated successfully"
      });

      queryClient.invalidateQueries({ queryKey });
      return mapDbCashTransactionToCashTransaction(result.data as any);
    } catch (error) {
      console.error('Error updating cash transaction:', error);
      toast({
        title: "Error",
        description: "Failed to update transaction",
        variant: "destructive"
      });
      return null;
    }
  }, [currentBusiness, queryClient, queryKey, toast]);

  const deleteTransaction = useCallback(async (id: string, onDeleted?: () => void) => {
    try {
      if (!currentBusiness) throw new Error('No business selected');
      const result = await deleteCashTransactionAction(id, currentBusiness.id);
      if (!result.success) throw new Error(result.error);

      toast({
        title: "Success",
        description: "Cash transaction deleted successfully"
      });

      queryClient.invalidateQueries({ queryKey });
      if (onDeleted) onDeleted();
      return true;
    } catch (error) {
      console.error('Error deleting cash transaction:', error);
      toast({
        title: "Error",
        description: "Failed to delete cash transaction",
        variant: "destructive"
      });
      return false;
    }
  }, [currentBusiness, queryClient, queryKey, toast]);

  const getDailySummary = useCallback(async (date: Date, accountId?: string): Promise<DailyCashSummary> => {
    if (!currentBusiness?.id || !accountId) {
        // If no accountId, we can't fetch a summary from the backend yet or we return empty
        return { date, openingBalance: 0, cashIn: 0, cashOut: 0, transfersIn: 0, transfersOut: 0, closingBalance: 0 };
    }

    const result = await getCashAccountSummaryAction(accountId, currentBusiness.id, date, date);
    if (result.success && result.data) {
        return {
            date: new Date(result.data.date),
            openingBalance: result.data.openingBalance,
            cashIn: result.data.cashIn,
            cashOut: result.data.cashOut,
            transfersIn: result.data.transfersIn,
            transfersOut: result.data.transfersOut,
            closingBalance: result.data.closingBalance
        };
    }

    return { date, openingBalance: 0, cashIn: 0, cashOut: 0, transfersIn: 0, transfersOut: 0, closingBalance: 0 };
  }, [currentBusiness?.id]);

  const getDateRangeSummary = useCallback(async (startDate: Date, endDate: Date, accountId?: string): Promise<DailyCashSummary> => {
    if (!currentBusiness?.id || !accountId) {
        return { date: startDate, openingBalance: 0, cashIn: 0, cashOut: 0, transfersIn: 0, transfersOut: 0, closingBalance: 0 };
    }

    const result = await getCashAccountSummaryAction(accountId, currentBusiness.id, startDate, endDate);
    if (result.success && result.data) {
        return {
            date: new Date(result.data.date),
            openingBalance: result.data.openingBalance,
            cashIn: result.data.cashIn,
            cashOut: result.data.cashOut,
            transfersIn: result.data.transfersIn,
            transfersOut: result.data.transfersOut,
            closingBalance: result.data.closingBalance
        };
    }

    return { date: startDate, openingBalance: 0, cashIn: 0, cashOut: 0, transfersIn: 0, transfersOut: 0, closingBalance: 0 };
  }, [currentBusiness?.id]);

  const refreshTransactions = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return useMemo(() => ({
    transactions,
    isLoading,
    createTransaction,
    createBulkTransactions,
    updateTransaction,
    deleteTransaction,
    getDailySummary,
    getDateRangeSummary,
    refreshTransactions,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalCount
  }), [transactions, isLoading, createTransaction, createBulkTransactions, updateTransaction, deleteTransaction, getDailySummary, getDateRangeSummary, refreshTransactions, page, pageSize, totalCount]);
};
