
import { useState, useMemo, useEffect } from 'react';
import { Sale } from '@/types';
import { getDateRangeFromFilter } from '@/utils/dateFilters';
import { isSameDay } from 'date-fns';


export const useSalesFilters = (sales: Sale[]) => {
  // Load persisted state from localStorage
  const getPersistedState = () => {
    try {
      const saved = localStorage.getItem('salesFilters');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          searchQuery: parsed.searchQuery || '',
          dateFilter: parsed.dateFilter || 'this-month',
          paymentFilter: parsed.paymentFilter || 'all',
          cashTransactionFilter: parsed.cashTransactionFilter || 'all',
          categoryFilter: parsed.categoryFilter || 'all',
          dateRange: parsed.dateRange ? {
            from: parsed.dateRange.from ? new Date(parsed.dateRange.from) : undefined,
            to: parsed.dateRange.to ? new Date(parsed.dateRange.to) : undefined
          } : { from: undefined, to: undefined },
          specificDate: parsed.specificDate ? new Date(parsed.specificDate) : undefined
        };
      }
    } catch (error) {
      console.error('Error loading persisted sales filters:', error);
    }
    return {
      searchQuery: '',
      dateFilter: 'this-month',
      paymentFilter: 'all',
      cashTransactionFilter: 'all',
      categoryFilter: 'all',
      dateRange: { from: undefined, to: undefined },
      specificDate: undefined
    };
  };

  const persistedState = getPersistedState();
  const [searchQuery, setSearchQuery] = useState(persistedState.searchQuery);
  const [paymentFilter, setPaymentFilter] = useState(persistedState.paymentFilter);
  const [cashTransactionFilter, setCashTransactionFilter] = useState(persistedState.cashTransactionFilter);
  const [categoryFilter, setCategoryFilter] = useState(persistedState.categoryFilter);
  const [dateFilter, setDateFilter] = useState<string>(persistedState.dateFilter);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined; }>(persistedState.dateRange);
  const [specificDate, setSpecificDate] = useState<Date | undefined>(persistedState.specificDate);

  // Persist state to localStorage whenever filters change
  useEffect(() => {
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
  }, [searchQuery, dateFilter, paymentFilter, cashTransactionFilter, categoryFilter, dateRange, specificDate]);

  const isCustomRange = dateFilter === 'custom';
  const isSpecificDate = dateFilter === 'specific';

  const filteredSales = useMemo(() => {
    let filtered = [...sales];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(sale => 
        sale.customerName.toLowerCase().includes(query) ||
        sale.receiptNumber.toLowerCase().includes(query) ||
        sale.items.some(item => item.description.toLowerCase().includes(query))
      );
    }

    // Filter by payment status
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(sale => sale.paymentStatus === paymentFilter);
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
