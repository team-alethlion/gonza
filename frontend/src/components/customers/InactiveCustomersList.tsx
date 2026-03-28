import React, { useState, useEffect, useCallback } from 'react';
import { Customer } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Eye, Loader2, Mail, Calendar, AlertCircle, Phone, MapPin, Tag, MessageCircleHeart } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/components/auth/AuthProvider';
import { useBusiness } from '@/contexts/BusinessContext';
import { getInactiveCustomersAction } from '@/app/actions/customers';
import { toast } from 'sonner';
import { format } from 'date-fns';
import WeMissYouDialog from './WeMissYouDialog';

interface InactiveCustomersListProps {
  customers: Customer[];
  isLoading: boolean;
  onSelectCustomer: (customer: Customer) => void;
  onSendEmail?: (customer: Customer) => void;
  selectedCategory?: string;
}

type InactivityPeriod = '30days' | '60days' | '90days' | '6months' | '1year' | 'all';

const InactivityDaysMap: Record<InactivityPeriod, number> = {
  '30days': 30,
  '60days': 60,
  '90days': 90,
  '6months': 180,
  '1year': 365,
  'all': 9999 // Large enough number
};

const InactiveCustomersList: React.FC<InactiveCustomersListProps> = ({ 
  onSelectCustomer,
  onSendEmail,
  selectedCategory = 'all'
}) => {
  const { currentBusiness } = useBusiness();
  const [inactivityPeriod, setInactivityPeriod] = useState<InactivityPeriod>('30days');
  const [inactiveCustomers, setInactiveCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCustomerForMessage, setSelectedCustomerForMessage] = useState<Customer | null>(null);

  // Inactive customer email template
  const inactiveCustomerMessage = "We Miss You!\n\nIt's been a while since we last heard from you, and we just wanted to check in. We truly value you as a customer and would love to have you back. If there's anything you need or if we can assist in any way, we're here for you!\n\nHope to see you again soon,";

  const loadInactiveCustomers = useCallback(async () => {
    if (!currentBusiness?.id) return;
    
    setIsLoading(true);
    try {
      const result = await getInactiveCustomersAction(currentBusiness.id, {
        days: InactivityDaysMap[inactivityPeriod],
        categoryId: selectedCategory === 'all' ? undefined : selectedCategory
      });

      if (result.success) {
        setInactiveCustomers(result.data || []);
      }
    } catch (error) {
      console.error("Failed to load inactive customers:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentBusiness?.id, inactivityPeriod, selectedCategory]);

  useEffect(() => {
    loadInactiveCustomers();
  }, [loadInactiveCustomers]);

  // Format days since last purchase
  const getDaysSinceLastPurchaseDisplay = (lastPurchaseDate: string | null): string => {
    if (!lastPurchaseDate) {
      return "No purchases";
    }
    
    const lastDate = new Date(lastPurchaseDate);
    const daysSince = Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    
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

  if (isLoading) {
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
                      {getDaysSinceLastPurchaseDisplay(customer.lastPurchaseDate)}
                    </span>
                  </div>
                  </div>                  <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
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
