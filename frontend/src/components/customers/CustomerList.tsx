"use client";
import React, { useState } from 'react';
import { Customer } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Eye, Calendar, Receipt, Edit, Mail, Phone, MapPin, Tag, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { formatNumber } from '@/lib/utils';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFinancialVisibility } from '@/hooks/useFinancialVisibility';
import BusinessNoticeGenerator from './BusinessNoticeGenerator';

interface CustomerListProps {
  customers: Customer[];
  isLoading: boolean;
  onSelectCustomer: (customer: Customer) => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => Promise<boolean>;
  canEdit?: boolean;
  canDelete?: boolean;
}

const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  isLoading,
  onSelectCustomer,
  onEditCustomer,
  canEdit = true,
  canDelete = true
}) => {
  const { settings } = useBusinessSettings();
  const isMobile = useIsMobile();
  const { canViewTotalAmount, canViewSellingPrice } = useFinancialVisibility();
  const [noticeDialogOpen, setNoticeDialogOpen] = useState(false);
  const [selectedCustomerForNotice, setSelectedCustomerForNotice] = useState<Customer | null>(null);

  // Use pre-calculated lifetime value from the customer object
  const getCustomerLifetimeTotal = (customer: Customer) => {
    if (!(canViewTotalAmount || canViewSellingPrice)) return '•••';
    return `${settings.currency} ${formatNumber(customer.lifetimeValue || 0)}`;
  };

  const handleSendNotice = (customer: Customer) => {
    setSelectedCustomerForNotice(customer);
    setNoticeDialogOpen(true);
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading customers..." />;
  }

  if (customers.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900">No customers yet</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by adding your first customer</p>
      </div>
    );
  }

  // Create a Map to track unique customers by ID to prevent duplicates
  const uniqueCustomers = new Map();
  customers.forEach(customer => {
    if (!uniqueCustomers.has(customer.id)) {
      uniqueCustomers.set(customer.id, customer);
    }
  });

  // Mobile Card View
  if (isMobile) {
    return (
      <>
        <div className="grid grid-cols-1 gap-4">
          {Array.from(uniqueCustomers.values()).map((customer) => (
            <Card
              key={customer.id}
              className="cursor-pointer hover:shadow-md transition-shadow duration-200 border border-gray-200"
              onClick={() => onSelectCustomer(customer)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-gray-900 break-words leading-tight">
                      {customer.fullName}
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                      <Receipt className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-green-600 truncate">
                        {getCustomerLifetimeTotal(customer)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendNotice(customer);
                      }}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCustomer(customer);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditCustomer(customer);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Contact Information */}
                  <div className="space-y-2">
                    {customer.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    {customer.phoneNumber && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="break-all">{customer.phoneNumber}</span>
                      </div>
                    )}
                    {customer.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="break-words">{customer.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Birthday */}
                  {customer.birthday && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span>Birthday: {format(customer.birthday, 'MMM d, yyyy')}</span>
                    </div>
                  )}

                  {/* Tags */}
                  {customer.tags && customer.tags.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Tag className="h-3 w-3 flex-shrink-0" />
                        <span>Tags</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {customer.tags.slice(0, 3).map((tag: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                            {tag}
                          </Badge>
                        ))}
                        {customer.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs bg-gray-100 border-gray-200">
                            +{customer.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedCustomerForNotice && (
          <BusinessNoticeGenerator
            customer={selectedCustomerForNotice}
            open={noticeDialogOpen}
            onClose={() => {
              setNoticeDialogOpen(false);
              setSelectedCustomerForNotice(null);
            }}
          />
        )}
      </>
    );
  }

  // Desktop Table View
  return (
    <>
      <div className="bg-white rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Customer</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Contact</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Lifetime Value</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Tags</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(uniqueCustomers.values()).map((customer, index) => (
                <tr
                  key={customer.id}
                  className={`border-b hover:bg-gray-50 cursor-pointer transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                    }`}
                  onClick={() => onSelectCustomer(customer)}
                >
                  <td className="py-4 px-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900 break-words">{customer.fullName}</span>
                      {customer.location && (
                        <span className="text-sm text-gray-500 break-words">{customer.location}</span>
                      )}
                      {customer.birthday && (
                        <span className="text-sm text-gray-500">
                          Birthday: {format(customer.birthday, 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex flex-col space-y-1">
                      {customer.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <span className="break-words">{customer.email}</span>
                        </div>
                      )}
                      {customer.phoneNumber && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <span className="break-all">{customer.phoneNumber}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1">
                      <Receipt className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-green-600">
                        {getCustomerLifetimeTotal(customer)}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {customer.tags && customer.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {customer.tags.slice(0, 2).map((tag: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                            {tag}
                          </Badge>
                        ))}
                        {customer.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs bg-gray-100 border-gray-200">
                            +{customer.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">No tags</span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendNotice(customer);
                        }}
                        title="Send Notice"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCustomer(customer);
                        }}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditCustomer(customer);
                          }}
                          title="Edit Customer"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCustomerForNotice && (
        <BusinessNoticeGenerator
          customer={selectedCustomerForNotice}
          open={noticeDialogOpen}
          onClose={() => {
            setNoticeDialogOpen(false);
            setSelectedCustomerForNotice(null);
          }}
        />
      )}
    </>
  );
};

export default CustomerList;
