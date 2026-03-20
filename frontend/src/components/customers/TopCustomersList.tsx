"use client";
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, User, TrendingUp, ShoppingBag } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { useSalesData } from '@/hooks/useSalesData';
import { useAuth } from '@/components/auth/AuthProvider';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useCustomers } from '@/hooks/useCustomers';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useRouter } from 'next/navigation';
import { getDateRangeFromFilter } from '@/utils/dateFilters';

interface TopCustomersListProps {
  selectedCategory?: string;
  dateFilter?: string;
  dateRange?: { from: Date | undefined; to: Date | undefined };
}

const TopCustomersList: React.FC<TopCustomersListProps> = ({ 
  selectedCategory = 'all',
  dateFilter = 'all',
  dateRange = { from: undefined, to: undefined }
}) => {
  const { user } = useAuth();
  const { sales, isLoading } = useSalesData(user?.id || '');
  const { customers } = useCustomers();
  const { settings } = useBusinessSettings();
  const router = useRouter();

  // Pagination state
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  // Calculate top customers from sales data
  const getAllTopCustomers = () => {
    // Apply date filter first
    let filteredSales = sales;
    if (dateFilter === 'custom' && dateRange.from && dateRange.to) {
      // Use custom date range
      filteredSales = sales.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= dateRange.from! && saleDate <= dateRange.to!;
      });
    } else if (dateFilter !== 'all') {
      // Use predefined date filter
      const dateRangeFilter = getDateRangeFromFilter(dateFilter);
      filteredSales = sales.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= dateRangeFilter.from && saleDate <= dateRangeFilter.to;
      });
    }

    // Skip quotes since they're not actual purchases
    const nonQuoteSales = filteredSales.filter(sale => sale.paymentStatus !== "Quote");
    
    // Group sales by customer name
    const customerMap = new Map<string, { total: number, count: number, customerId?: string }>();
    
    nonQuoteSales.forEach(sale => {
      const customerName = sale.customerName;
      const saleTotal = sale.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      if (!customerMap.has(customerName)) {
        customerMap.set(customerName, { 
          total: saleTotal, 
          count: 1,
          customerId: sale.customerId
        });
      } else {
        const current = customerMap.get(customerName)!;
        customerMap.set(customerName, { 
          total: current.total + saleTotal, 
          count: current.count + 1,
          customerId: current.customerId || sale.customerId
        });
      }
    });
    
    // Convert map to array and sort by total purchases
    let topCustomers = Array.from(customerMap.entries())
      .map(([name, data]) => ({
        id: data.customerId,
        name,
        totalPurchases: data.total,
        orderCount: data.count
      }))
      .sort((a, b) => b.totalPurchases - a.totalPurchases);

    // Apply category filter if specified
    if (selectedCategory && selectedCategory !== 'all') {
      topCustomers = topCustomers.filter(customer => {
        if (customer.id) {
          const customerData = customers.find(c => c.id === customer.id);
          return customerData?.categoryId === selectedCategory;
        }
        // Fallback to name matching if no ID
        const customerData = customers.find(c => c.fullName === customer.name);
        return customerData?.categoryId === selectedCategory;
      });
    }
    
    return topCustomers;
  };

  const allTopCustomers = getAllTopCustomers();
  const totalPages = Math.ceil(allTopCustomers.length / pageSize);
  const paginatedCustomers = allTopCustomers.slice((page - 1) * pageSize, page * pageSize);

  const handleCustomerClick = (customerName: string, customerId?: string) => {
    // First try to find by customerId if available
    if (customerId) {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        router.push(`/customers?view=${customer.id}`);
        return;
      }
    }
    
    // Fallback to finding by name
    const customer = customers.find(c => c.fullName === customerName);
    if (customer) {
      router.push(`/customers?view=${customer.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner message="Loading top customers..." />
      </div>
    );
  }



  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Crown className="h-6 w-6 text-amber-600" />
            </div>
            <span className="text-gray-900 font-bold">Top Customers by Revenue</span>
          </CardTitle>
          <CardDescription className="text-gray-600 text-sm">
            Customers ranked by total purchase amount (excluding quotes)
            {dateFilter !== 'all' && (
              <Badge variant="outline" className="ml-2 bg-purple-50 text-purple-700 border-purple-200">
                {dateFilter === 'custom' ? 'Custom Range' :
                 dateFilter === 'today' ? 'Today' :
                 dateFilter === 'yesterday' ? 'Yesterday' :
                 dateFilter === 'this-week' ? 'This Week' :
                 dateFilter === 'last-week' ? 'Last Week' :
                 dateFilter === 'this-month' ? 'This Month' :
                 dateFilter === 'last-month' ? 'Last Month' :
                 dateFilter === 'this-year' ? 'This Year' : ''}
              </Badge>
            )}
            {selectedCategory !== 'all' && (
              <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">
                Filtered by category
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {paginatedCustomers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {selectedCategory !== 'all' ? 'No customers in this category' : 'No customer data available'}
              </h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                {selectedCategory !== 'all' 
                  ? 'Try selecting a different category or add customers to this category.'
                  : 'Sales data will appear here once you have completed transactions.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedCustomers.map((customer, idx) => {
                const index = (page - 1) * pageSize + idx;
                return (
                <div 
                  key={customer.id || customer.name} 
                  className="group relative bg-white border border-gray-200 rounded-xl p-3 sm:p-4 hover:shadow-md transition-all duration-200 hover:border-gray-300 cursor-pointer"
                  onClick={() => handleCustomerClick(customer.name, customer.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Rank Badge */}
                    <div className="flex-shrink-0">
                      <div className={`
                        w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm
                        ${index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg' : 
                          index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-md' :
                          index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-md' :
                          'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 border border-blue-200'}
                      `}>
                        {index + 1}
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col gap-2">
                        {/* Header row with name and badge */}
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-gray-900 text-sm sm:text-base leading-tight break-words flex-1">
                            {customer.name}
                          </h4>
                          {/* Position Badge */}
                          <div className="flex-shrink-0">
                            {index === 0 && (
                              <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 text-xs font-semibold px-2 py-1 shadow-md">
                                👑
                              </Badge>
                            )}
                            {index === 1 && (
                              <Badge variant="secondary" className="bg-gradient-to-r from-gray-400 to-gray-500 text-white border-0 text-xs font-semibold px-2 py-1">
                                🥈
                              </Badge>
                            )}
                            {index === 2 && (
                              <Badge variant="secondary" className="bg-gradient-to-r from-amber-700 to-amber-800 text-white border-0 text-xs font-semibold px-2 py-1">
                                🥉
                              </Badge>
                            )}
                            {index > 2 && (
                              <Badge variant="outline" className="border-gray-300 text-gray-600 text-xs font-medium px-2 py-1 bg-white">
                                #{index + 1}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Stats row */}
                        <div className="flex flex-col xs:flex-row xs:items-center gap-2 xs:gap-3">
                          <div className="flex items-center gap-1.5">
                            <div className="p-1 bg-green-100 rounded">
                              <TrendingUp className="h-3 w-3 text-green-600" />
                            </div>
                            <span className="font-bold text-green-700 text-sm">
                              {settings.currency} {formatNumber(customer.totalPurchases)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="p-1 bg-blue-100 rounded">
                              <ShoppingBag className="h-3 w-3 text-blue-600" />
                            </div>
                            <span className="text-xs font-medium text-gray-600">
                              {customer.orderCount} {customer.orderCount === 1 ? 'order' : 'orders'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subtle hover indicator */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 rounded-xl transition-all duration-200 pointer-events-none" />
                </div>
                );
              })}
                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="flex justify-center mt-6 gap-2">
                          <button
                            className="px-3 py-1 rounded border text-sm font-medium bg-white hover:bg-gray-100 disabled:opacity-50"
                            onClick={() => setPage(page - 1)}
                            disabled={page === 1}
                          >
                            Previous
                          </button>
                          <span className="px-2 py-1 text-gray-600 text-sm">Page {page} of {totalPages}</span>
                          <button
                            className="px-3 py-1 rounded border text-sm font-medium bg-white hover:bg-gray-100 disabled:opacity-50"
                            onClick={() => setPage(page + 1)}
                            disabled={page === totalPages}
                          >
                            Next
                          </button>
                        </div>
                      )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TopCustomersList;
