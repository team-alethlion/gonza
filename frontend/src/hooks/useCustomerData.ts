import { useMemo } from 'react';
import { Customer } from '@/hooks/useCustomers';

export const useCustomerData = (
  customers: Customer[],
  categories: Array<{ id: string; name: string }>,
  searchTerm: string,
  selectedCategory: string,
  totalCount?: number,
  globalStats?: any
) => {
  // Filter out any categories with empty IDs to prevent Select errors
  const validCategories = useMemo(() => {
    return categories.filter(category => category.id && category.id.trim() !== '');
  }, [categories]);

  // Enhanced filtered customers with category filter
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const matchesSearch = customer.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.phoneNumber && customer.phoneNumber.includes(searchTerm));
      
      const matchesCategory = selectedCategory === 'all' || customer.categoryId === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [customers, searchTerm, selectedCategory]);

  // 🚀 PERFORMANCE: Use pre-calculated stats from backend instead of looping in browser
  const customerStats = useMemo(() => {
    if (globalStats) {
      return {
        totalCustomers: globalStats.totalCustomers || totalCount || 0,
        customersWithBirthdays: globalStats.customersWithBirthdays || 0,
        customersThisMonth: globalStats.customersThisMonth || 0,
        categoryBreakdown: globalStats.categoryBreakdown || {}
      };
    }

    // Fallback if stats aren't loaded (basic totals)
    return {
      totalCustomers: totalCount || customers.length,
      customersWithBirthdays: 0,
      customersThisMonth: 0,
      categoryBreakdown: {}
    };
  }, [customers.length, globalStats, totalCount]);

  // Get category name helper
  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Uncategorized';
    const category = validCategories.find(cat => cat.id === categoryId);
    return category?.name || 'Unknown Category';
  };

  return {
    validCategories,
    filteredCustomers,
    customerStats,
    getCategoryName
  };
};