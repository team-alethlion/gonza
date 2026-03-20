import React from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import CustomerTabs from '@/components/customers/CustomerTabs';
import CustomerFilters from '@/components/customers/CustomerFilters';
import CustomerList from '@/components/customers/CustomerList';
import TopCustomersList from '@/components/customers/TopCustomersList';
import InactiveCustomersList from '@/components/customers/InactiveCustomersList';
import CustomerDetail from '@/components/customers/CustomerDetail';
import { Customer } from '@/hooks/useCustomers';

interface CustomerContentProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedCustomer: Customer | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  dateFilter: string;
  setDateFilter: (filter: string) => void;
  dateRange: { from: Date | undefined; to: Date | undefined };
  setDateRange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  validCategories: Array<{ id: string; name: string }>;
  filteredCustomers: Customer[];
  customers: Customer[];
  customerStats: {
    categoryBreakdown: Record<string, number>;
  };
  getCategoryName: (categoryId: string | null) => string;
  onSelectCustomer: (customer: Customer) => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => Promise<boolean>;
  onUpdateCustomer: (id: string, data: any) => Promise<boolean>;
  setSelectedCustomer: (customer: Customer | null) => void;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

const CustomerContent: React.FC<CustomerContentProps> = ({
  activeTab,
  setActiveTab,
  selectedCustomer,
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  dateFilter,
  setDateFilter,
  dateRange,
  setDateRange,
  validCategories,
  filteredCustomers,
  customers,
  customerStats,
  getCategoryName,
  onSelectCustomer,
  onEditCustomer,
  onDeleteCustomer,
  onUpdateCustomer,
  setSelectedCustomer,
  canCreate = true,
  canEdit = true,
  canDelete = true
}) => {
  return (
    <div className="bg-white rounded-xl border shadow-sm">
      <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex flex-col xl:flex-row gap-8 items-start">
          {/* Customer Views Section */}
          <div className="flex-1 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Customer Views</h2>
              <p className="text-gray-600 text-sm">Choose how you want to view and manage your customers</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <CustomerTabs activeTab={activeTab} selectedCustomer={selectedCustomer} />
            </Tabs>
          </div>

          {/* Search & Filter Section */}
          <CustomerFilters
            activeTab={activeTab}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            dateRange={dateRange}
            setDateRange={setDateRange}
            validCategories={validCategories}
            filteredCustomers={filteredCustomers}
            customerStats={customerStats}
            getCategoryName={getCategoryName}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="list" className="mt-0">
            <CustomerList
              customers={filteredCustomers}
              isLoading={false}
              onSelectCustomer={onSelectCustomer}
              onEditCustomer={onEditCustomer}
              onDeleteCustomer={onDeleteCustomer}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          </TabsContent>

          <TabsContent value="top" className="mt-0">
            <TopCustomersList
              selectedCategory={selectedCategory}
              dateFilter={dateFilter}
              dateRange={dateRange}
            />
          </TabsContent>

          <TabsContent value="inactive" className="mt-0">
            <InactiveCustomersList
              customers={customers}
              isLoading={false}
              onSelectCustomer={onSelectCustomer}
              selectedCategory={selectedCategory}
            />
          </TabsContent>

          <TabsContent value="details" className="mt-0">
            {selectedCustomer && (
              <CustomerDetail
                customer={selectedCustomer}
                onUpdate={async (data) => {
                  const success = await onUpdateCustomer(selectedCustomer.id, data);
                  return success;
                }}
                onDelete={async () => {
                  const success = await onDeleteCustomer(selectedCustomer.id);
                  if (success) {
                    setSelectedCustomer(null);
                    setActiveTab('list');
                  }
                  return success;
                }}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            )}
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};

export default CustomerContent;