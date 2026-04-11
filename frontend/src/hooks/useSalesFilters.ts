
import { useState, useMemo, useEffect } from 'react';
import { Sale } from '@/types';
import { getDateRangeFromFilter } from '@/utils/dateFilters';
import { isSameDay } from 'date-fns';


export const useSalesFilters = (sales: Sale[]) => {
  // 🛡️ HYDRATION GUARD: Initialize with server-safe defaults
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [cashTransactionFilter, setCashTransactionFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<string>('this-month');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined; }>({ from: undefined, to: undefined });
  const [specificDate, setSpecificDate] = useState<Date | undefined>(undefined);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load persisted state from localStorage AFTER mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem('salesFilters');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.searchQuery) setSearchQuery(parsed.searchQuery);
        if (parsed.paymentFilter) setPaymentFilter(parsed.paymentFilter);
        if (parsed.cashTransactionFilter) setCashTransactionFilter(parsed.cashTransactionFilter);
        if (parsed.categoryFilter) setCategoryFilter(parsed.categoryFilter);
        if (parsed.dateFilter) setDateFilter(parsed.dateFilter);
        if (parsed.dateRange) {
          setDateRange({
            from: parsed.dateRange.from ? new Date(parsed.dateRange.from) : undefined,
            to: parsed.dateRange.to ? new Date(parsed.dateRange.to) : undefined
          });
        }
        if (parsed.specificDate) setSpecificDate(new Date(parsed.specificDate));
      }
    } catch (error) {
      console.error('Error loading persisted sales filters:', error);
    }
    setIsHydrated(true);
  }, []);

  // Persist state to localStorage only AFTER hydration is complete
  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') return;

    const stateToSave = {
      searchQuery,
      dateFilter,
      paymentFilter,
      cashTransactionFilter,
      categoryFilter,
      dateRange: {
        from: dateRange.from?.toISOString(),
        to: dateRange.to?.toISOString()
      },
      specificDate: specificDate?.toISOString()
    };
    localStorage.setItem('salesFilters', JSON.stringify(stateToSave));
  }, [searchQuery, dateFilter, paymentFilter, cashTransactionFilter, categoryFilter, dateRange, specificDate, isHydrated]);

  const isCustomRange = dateFilter === 'custom';
  const isSpecificDate = dateFilter === 'specific';

  const filteredSales = useMemo(() => {
    let filtered = [...sales];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(sale => 
        (sale.customerName?.toLowerCase().includes(query) || false) ||
        (sale.receiptNumber?.toLowerCase().includes(query) || false) ||
        (sale.items?.some(item => item.description?.toLowerCase().includes(query)) || false)
      );
    }

    // Filter by payment status
    if (paymentFilter !== 'all') {
      if (paymentFilter === 'Paid') {
        filtered = filtered.filter(sale => 
          sale.paymentStatus === 'Paid' || sale.paymentStatus === 'COMPLETED'
        );
      } else {
        filtered = filtered.filter(sale => sale.paymentStatus === paymentFilter);
      }
    }

    // Filter by cash transaction (linked/unlinked)
    if (cashTransactionFilter !== 'all') {
      if (cashTransactionFilter === 'linked') {
        filtered = filtered.filter(sale => sale.cashTransactionId);
      } else if (cashTransactionFilter === 'unlinked') {
        filtered = filtered.filter(sale => !sale.cashTransactionId);
      }
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'none') {
        filtered = filtered.filter(sale => !sale.categoryId);
      } else {
        filtered = filtered.filter(sale => sale.categoryId === categoryFilter);
      }
    }

    // Filter by date
    if (dateFilter !== 'all') {
      if (isSpecificDate && specificDate) {
        filtered = filtered.filter(sale => {
          const saleDate = new Date(sale.date);
          return isSameDay(saleDate, specificDate);
        });
      } else if (isCustomRange && dateRange.from && dateRange.to) {
        const from = dateRange.from;
        const to = dateRange.to;
        filtered = filtered.filter(sale => {
          const saleDate = new Date(sale.date);
          return saleDate >= from && saleDate <= to;
        });
      } else {
        const range = getDateRangeFromFilter(dateFilter);
        const from = range.from;
        const to = range.to;
        filtered = filtered.filter(sale => {
          const saleDate = new Date(sale.date);
          return saleDate >= from && saleDate <= to;
        });
      }
    }

    // Note: Sorting is now handled at the database level in useSalesData
    // No need to sort here as the data comes pre-sorted from the database
    return filtered;
  }, [sales, searchQuery, paymentFilter, cashTransactionFilter, categoryFilter, dateFilter, dateRange, specificDate, isCustomRange, isSpecificDate]);

  return {
    searchQuery,
    setSearchQuery,
    paymentFilter,
    setPaymentFilter,
    cashTransactionFilter,
    setCashTransactionFilter,
    categoryFilter,
    setCategoryFilter,
    dateFilter,
    setDateFilter,
    dateRange,
    setDateRange,
    specificDate,
    setSpecificDate,
    isCustomRange,
    isSpecificDate,
    filteredSales
  };
};
