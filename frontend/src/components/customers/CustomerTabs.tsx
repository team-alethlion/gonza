import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, TrendingUp, Calendar, Filter, FileText } from 'lucide-react';
import { Customer } from '@/hooks/useCustomers';

interface CustomerTabsProps {
  activeTab: string;
  selectedCustomer: Customer | null;
}

const CustomerTabs: React.FC<CustomerTabsProps> = ({ activeTab, selectedCustomer }) => {
  return (
    <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-14 bg-white border border-gray-200 shadow-sm p-1.5 rounded-lg">
      <TabsTrigger
        value="list"
        className="flex items-center gap-2.5 text-sm font-medium px-4 py-2.5 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-200 data-[state=active]:shadow-sm rounded-md transition-all duration-200"
      >
        <Users className="h-4 w-4" />
        <span className="hidden sm:inline">All Customers</span>
        <span className="sm:hidden">All</span>
      </TabsTrigger>
      <TabsTrigger
        value="top"
        className="flex items-center gap-2.5 text-sm font-medium px-4 py-2.5 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700 data-[state=active]:border-amber-200 data-[state=active]:shadow-sm rounded-md transition-all duration-200"
      >
        <TrendingUp className="h-4 w-4" />
        <span className="hidden sm:inline">Top Customers</span>
        <span className="sm:hidden">Top</span>
      </TabsTrigger>
      <TabsTrigger
        value="inactive"
        className="flex items-center gap-2.5 text-sm font-medium px-4 py-2.5 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 data-[state=active]:border-orange-200 data-[state=active]:shadow-sm rounded-md transition-all duration-200"
      >
        <Calendar className="h-4 w-4" />
        <span className="hidden sm:inline">Inactive</span>
        <span className="sm:hidden">Inactive</span>
      </TabsTrigger>
      {selectedCustomer && (
        <>
          <TabsTrigger
            value="details"
            className="flex items-center gap-2.5 text-sm font-medium px-4 py-2.5 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:border-purple-200 data-[state=active]:shadow-sm rounded-md transition-all duration-200"
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Details</span>
            <span className="sm:hidden">Details</span>
          </TabsTrigger>
        </>
      )}
    </TabsList>
  );
};

export default CustomerTabs;