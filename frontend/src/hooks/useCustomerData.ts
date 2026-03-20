import { useMemo } from 'react';
import { Customer } from '@/hooks/useCustomers';

export const useCustomerData = (
  customers: Customer[],
  categories: Array<{ id: string; name: string }>,
  searchTerm: string,
  selectedCategory: string,
  totalCount?: number,
  customersWithBirthdaysOverride?: number,
  customersThisMonthOverride?: number
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

  // Enhanced customer stats calculations with category breakdown
  const customerStats = useMemo(() => {
    const totalCustomers = typeof totalCount === 'number' ? totalCount : customers.length;
    const customersWithBirthdays = typeof customersWithBirthdaysOverride === 'number' 
      ? customersWithBirthdaysOverride 
      : customers.filter(c => c.birthday).length;
    const customersThisMonth = typeof customersThisMonthOverride === 'number'
      ? customersThisMonthOverride
      : customers.filter(c => {
          const thisMonth = new Date();
          const customerDate = new Date(c.createdAt);
          return customerDate.getMonth() === thisMonth.getMonth() && 
                 customerDate.getFullYear() === thisMonth.getFullYear();
        }).length;

    const categoryBreakdown = categories.reduce((acc, category) => {
      acc[category.id] = customers.filter(c => c.categoryId === category.id).length;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalCustomers,
      customersWithBirthdays,
      customersThisMonth,
      categoryBreakdown
    };
  }, [customers, categories, totalCount, customersWithBirthdaysOverride, customersThisMonthOverride]);

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