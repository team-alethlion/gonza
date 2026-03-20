"use client";
import React from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, Users } from 'lucide-react';
import { Customer } from '@/hooks/useCustomers';
import CustomerExportActions from './CustomerExportActions';

interface CustomerHeaderProps {
  onAddNewCustomer: () => void;
  onFindDuplicates?: () => void;
  customers?: Customer[];
  currency?: string;
  businessName?: string;
  businessLogo?: string;
  getCategoryName?: (categoryId: string | null) => string;
  canCreate?: boolean;
}

const CustomerHeader: React.FC<CustomerHeaderProps> = ({
  onAddNewCustomer,
  onFindDuplicates,
  customers = [],
  currency = 'UGX',
  businessName = 'Your Business',
  businessLogo,
  getCategoryName = () => 'Uncategorized',
  canCreate = true
}) => {
  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-gray-600">Manage your customer relationships and track their activities</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <CustomerExportActions
            customers={customers}
            currency={currency}
            businessName={businessName}
            businessLogo={businessLogo}
            getCategoryName={getCategoryName}
          />
          {onFindDuplicates && (
            <Button onClick={onFindDuplicates} variant="outline" className="gap-2 px-6 py-3 text-sm font-medium">
              <Users className="h-4 w-4" />
              Find Duplicates
            </Button>
          )}
          {canCreate && (
            <Button onClick={onAddNewCustomer} className="gap-2 px-6 py-3 text-sm font-medium">
              <UserPlus className="h-4 w-4" />
              Add New Customer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerHeader;