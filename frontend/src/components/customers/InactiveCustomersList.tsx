"use client";
import React, { useState, useMemo } from 'react';
import { Customer } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Eye, Loader2, Mail, Calendar, AlertCircle, Phone, MapPin, Tag, MessageCircleHeart } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { subDays, subMonths, subYears } from 'date-fns';
import { useSalesData } from '@/hooks/useSalesData';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';
import WeMissYouDialog from './WeMissYouDialog';

interface InactiveCustomersListProps {
  customers: Customer[];
  isLoading: boolean;
  onSelectCustomer: (customer: Customer) => void;
  onSendEmail?: (customer: Customer) => void;
  selectedCategory?: string;
}

type InactivityPeriod = '30days' | '60days' | '90days' | '6months' | '1year' | 'all';

const InactiveCustomersList: React.FC<InactiveCustomersListProps> = ({ 
  customers, 
  isLoading, 
  onSelectCustomer,
  onSendEmail,
  selectedCategory = 'all'
}) => {
  const { user } = useAuth();
  const { sales, isLoading: salesLoading } = useSalesData(user?.id);
  const [inactivityPeriod, setInactivityPeriod] = useState<InactivityPeriod>('30days');
  const [selectedCustomerForMessage, setSelectedCustomerForMessage] = useState<Customer | null>(null);

  // Inactive customer email template
  const inactiveCustomerMessage = "We Miss You!\n\nIt's been a while since we last heard from you, and we just wanted to check in. We truly value you as a customer and would love to have you back. If there's anything you need or if we can assist in any way, we're here for you!\n\nHope to see you again soon,";

  // Calculate the cutoff date based on the selected inactivity period
  const cutoffDate = useMemo((): Date => {
    const now = new Date();
    
    switch(inactivityPeriod) {
      case '30days': return subDays(now, 30);
      case '60days': return subDays(now, 60);
      case '90days': return subDays(now, 90);
      case '6months': return subMonths(now, 6);
      case '1year': return subYears(now, 1);
      case 'all': return new Date(0); // Beginning of time
      default: return subDays(now, 30);
    }
  }, [inactivityPeriod]);

  // Filter customers who haven't purchased since the cutoff date
  const inactiveCustomers = useMemo(() => {
    if (salesLoading || isLoading || customers.length === 0 || sales.length === 0) {
      return [];
    }

    // Filter customers by category first if specified
    let filteredCustomers = customers;
    if (selectedCategory && selectedCategory !== 'all') {
      filteredCustomers = customers.filter(customer => customer.categoryId === selectedCategory);
    }
    
    // For each customer, find their most recent purchase
    return filteredCustomers.filter(customer => {
      const customerSales = sales.filter(sale => 
        sale.customerName.toLowerCase() === customer.fullName.toLowerCase() &&
        sale.paymentStatus !== 'Quote'
      );
      
      // If no sales records, they're inactive
      if (customerSales.length === 0) {
        return true;
      }
      
      // Get the most recent sale date
      const lastPurchaseDate = new Date(Math.max(...customerSales.map(sale => new Date(sale.date).getTime())));
      
      // Check if last purchase is before our cutoff date
      return lastPurchaseDate < cutoffDate;
    });
  }, [customers, sales, salesLoading, isLoading, selectedCategory, cutoffDate]);

  // Format days since last purchase
  const getDaysSinceLastPurchase = (customerName: string): string => {
    const customerSales = sales.filter(sale => 
      sale.customerName.toLowerCase() === customerName.toLowerCase() &&
      sale.paymentStatus !== 'Quote'
    );
    
    if (customerSales.length === 0) {
      return "No purchases";
    }
    
    const lastPurchaseDate = new Date(Math.max(...customerSales.map(sale => new Date(sale.date).getTime())));
    const daysSince = Math.floor((new Date().getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSince < 30) {
      return `${daysSince} days ago`;
    } else if (daysSince < 365) {
      const monthsSince = Math.floor(daysSince / 30);
      return `${monthsSince} month${monthsSince > 1 ? 's' : ''} ago`;
    } else {
      const yearsSince = Math.floor(daysSince / 365);
      return `${yearsSince} year${yearsSince > 1 ? 's' : ''} ago`;
    }
  };

  const handleSendEmail = (customer: Customer) => {
    if (onSendEmail) {
      onSendEmail(customer);
    } else {
      // Fallback if no email handler is provided
      if (customer.email) {
        const mailtoLink = `mailto:${customer.email}?subject=We miss you!&body=${encodeURIComponent(inactiveCustomerMessage)}`;
        window.open(mailtoLink);
      } else {
        toast.error("This customer doesn't have an email address.");
      }
    }
  };

  if (isLoading || salesLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Show inactive for:</span>
          <Select value={inactivityPeriod} onValueChange={(value: InactivityPeriod) => setInactivityPeriod(value)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30days">30 days</SelectItem>
              <SelectItem value="60days">60 days</SelectItem>
              <SelectItem value="90days">90 days</SelectItem>
              <SelectItem value="6months">6 months</SelectItem>
              <SelectItem value="1year">1 year</SelectItem>
              <SelectItem value="all">All inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedCategory !== 'all' && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Filtered by category
            </Badge>
          )}
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
            {inactiveCustomers.length} inactive customers
          </Badge>
        </div>
      </div>

      {/* Customer Cards */}
      {inactiveCustomers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No inactive customers found</h3>
            <p className="text-sm text-gray-500 max-w-md">
              {selectedCategory !== 'all' 
                ? `No customers in the selected category have been inactive for ${
                    inactivityPeriod === '30days' ? 'the last 30 days' : 
                    inactivityPeriod === '60days' ? 'the last 60 days' :
                    inactivityPeriod === '90days' ? 'the last 90 days' :
                    inactivityPeriod === '6months' ? 'the last 6 months' :
                    inactivityPeriod === '1year' ? 'the last year' : 'their history'
                  }.`
                : `All of your customers have made purchases within ${
                    inactivityPeriod === '30days' ? 'the last 30 days' : 
                    inactivityPeriod === '60days' ? 'the last 60 days' :
                    inactivityPeriod === '90days' ? 'the last 90 days' :
                    inactivityPeriod === '6months' ? 'the last 6 months' :
                    inactivityPeriod === '1year' ? 'the last year' : 'their history'
                  }.`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {inactiveCustomers.map((customer) => (
            <Card 
              key={customer.id}
              className="cursor-pointer hover:shadow-md transition-shadow duration-200 border border-amber-200 bg-amber-50/30"
              onClick={() => onSelectCustomer(customer)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 truncate">
                      {customer.fullName}
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                      <Calendar className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-700">
                        {getDaysSinceLastPurchase(customer.fullName)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 hover:bg-purple-50 hover:text-purple-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCustomerForMessage(customer);
                      }}
                      title="Send 'We Miss You' message"
                    >
                      <MessageCircleHeart className="h-4 w-4 text-purple-600" />
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
                    {customer.email && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendEmail(customer);
                        }}
                      >
                        <Mail className="h-4 w-4" />
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
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    {customer.phoneNumber && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{customer.phoneNumber}</span>
                      </div>
                    )}
                    {customer.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="truncate">{customer.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {customer.tags && customer.tags.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Tag className="h-3 w-3" />
                        <span>Tags</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {customer.tags.slice(0, 2).map((tag, i) => (
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
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* We Miss You Dialog */}
      <WeMissYouDialog
        customer={selectedCustomerForMessage}
        open={!!selectedCustomerForMessage}
        onClose={() => setSelectedCustomerForMessage(null)}
      />
    </div>
  );
};

export default InactiveCustomersList;
