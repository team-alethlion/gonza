/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CashAccount } from '@/types/cash';
import {
  getCashAccountsAction,
  createCashAccountAction,
  updateCashAccountAction,
  deleteCashAccountAction,
  deleteCashAccountWithTransactionsAction,
  getCashAccountBalanceAction
} from '@/app/actions/finance';

import { localDb } from '@/lib/dexie';

export const useCashAccounts = () => {
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const { toast } = useToast();
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Load from Dexie cache on mount
  useEffect(() => {
    const loadFromCache = async () => {
      if (currentBusiness?.id && accounts.length === 0) {
        const cached = await localDb.cashAccounts
          .where('locationId')
          .equals(currentBusiness.id)
          .toArray();
        
        if (cached && cached.length > 0) {
          console.log('[CashAccounts] Loaded from Dexie cache');
          setAccounts(cached.map(a => ({
            ...a,
            createdAt: new Date(a.createdAt),
            updatedAt: new Date(a.updatedAt)
          })));
        }
      }
    };
    loadFromCache();
  }, [currentBusiness?.id, accounts.length]);

  const loadAccounts = useCallback(async (): Promise<CashAccount[]> => {
    if (!currentBusiness?.id) return [];

    try {
      const result = await getCashAccountsAction(currentBusiness.id);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch accounts');
      }

      const formattedAccounts = result.data.map((account: any) => ({
        ...account,
        createdAt: new Date(account.createdAt),
        updatedAt: new Date(account.updatedAt)
      }));

      // Update Dexie cache in the background
      if (formattedAccounts.length > 0) {
        const cacheData = formattedAccounts.map((a: any) => ({
          ...a,
          locationId: currentBusiness.id as string,
        }));
        await localDb.cashAccounts.where('locationId').equals(currentBusiness.id).delete();
        await localDb.cashAccounts.bulkPut(cacheData as any);
      }

      return formattedAccounts;
    } catch (error) {
      console.error('Error loading cash accounts:', error);
      toast({
        title: "Error",
        description: "Failed to load cash accounts",
        variant: "destructive"
      });
      return [];
    }
  }, [currentBusiness?.id, toast]);

  const queryKey = useMemo(() => ['cash_accounts', currentBusiness?.id], [currentBusiness?.id]);
  const { data: queriedAccounts, isLoading: isQueryLoading } = useQuery({
    queryKey,
    queryFn: loadAccounts,
    enabled: !!currentBusiness?.id,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (queriedAccounts) {
      setAccounts(queriedAccounts);
    }
  }, [queriedAccounts]);

  const isLoading = isQueryLoading && !queriedAccounts;

  const refreshAccounts = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const createAccount = useCallback(async (accountData: {
    name: string;
    description?: string;
    openingBalance: number;
    isDefault?: boolean;
  }) => {
    if (!currentBusiness?.id || !user?.id) return null;

    try {
      const result = await createCashAccountAction({
        ...accountData,
        userId: user.id,
        locationId: currentBusiness.id
      });

      if (!result.success || !result.data) throw new Error(result.error);

      queryClient.invalidateQueries({ queryKey });
      toast({
        title: "Success",
        description: "Cash account created successfully"
      });

      return result.data;
    } catch (error) {
      console.error('Error creating cash account:', error);
      toast({
        title: "Error",
        description: "Failed to create cash account",
        variant: "destructive"
      });
      return null;
    }
  }, [currentBusiness?.id, user?.id, queryClient, queryKey, toast]);

  const updateAccount = useCallback(async (id: string, updates: Partial<CashAccount>) => {
    if (!currentBusiness?.id) return false;

    try {
      const result = await updateCashAccountAction(id, currentBusiness.id, {
        ...updates,
        locationId: currentBusiness.id
      });

      if (!result.success) throw new Error(result.error);

      queryClient.invalidateQueries({ queryKey });
      toast({
        title: "Success",
        description: "Cash account updated successfully"
      });

      return true;
    } catch (error) {
      console.error('Error updating cash account:', error);
      toast({
        title: "Error",
        description: "Failed to update cash account",
        variant: "destructive"
      });
      return false;
    }
  }, [currentBusiness?.id, queryClient, queryKey, toast]);

  const deleteAccount = useCallback(async (id: string, onDeleted?: () => void) => {
    if (!currentBusiness?.id) return { success: false, hasTransactions: false };

    try {
      const result = await deleteCashAccountAction(id, currentBusiness.id);

      if (result.success) {
        queryClient.invalidateQueries({ queryKey });
        toast({
          title: "Success",
          description: "Cash account deleted successfully"
        });
        if (onDeleted) onDeleted();
      }

      return result as any;
    } catch (error) {
      console.error('Error deleting cash account:', error);
      toast({
        title: "Error",
        description: "Failed to delete cash account",
        variant: "destructive"
      });
      return { success: false, hasTransactions: false };
    }
  }, [currentBusiness?.id, queryClient, queryKey, toast]);

  const deleteAccountWithTransactions = useCallback(async (id: string, deleteTransactions: boolean = false, onDeleted?: () => void) => {
    if (!currentBusiness?.id) return false;

    try {
      const result = await deleteCashAccountWithTransactionsAction(id, currentBusiness.id, deleteTransactions);

      if (!result.success) throw new Error(result.error);

      queryClient.invalidateQueries({ queryKey });
      toast({
        title: "Success",
        description: deleteTransactions
          ? "Account and transactions deleted"
          : "Account deleted (records unlinked)"
      });
      if (onDeleted) onDeleted();
      return true;
    } catch (error) {
      console.error('Error deleting cash account:', error);
      toast({
        title: "Error",
        description: "Failed to delete cash account",
        variant: "destructive"
      });
      return false;
    }
  }, [currentBusiness?.id, queryClient, queryKey, toast]);

  const getAccountBalance = useCallback(async (accountId: string): Promise<number> => {
    if (!currentBusiness?.id) return 0;
    try {
      const result = await getCashAccountBalanceAction(accountId, currentBusiness.id);
      if (result.success) return result.data as number;
      return 0;
    } catch (error) {
      console.error('Error getting balance:', error);
      return 0;
    }
  }, [currentBusiness?.id]);

  return useMemo(() => ({
    accounts,
    isLoading,
    createAccount,
    updateAccount,
    deleteAccount,
    deleteAccountWithTransactions,
    getAccountBalance,
    loadAccounts,
    refreshAccounts
  }), [accounts, isLoading, createAccount, updateAccount, deleteAccount, deleteAccountWithTransactions, getAccountBalance, loadAccounts, refreshAccounts]);
};
