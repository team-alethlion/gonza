"use client";

import React from 'react';
import { format } from 'date-fns';
import { Customer } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cake, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useToast } from '@/hooks/use-toast';
import { canSendSMS, getBirthdayMessage, openSMSApp, openWhatsApp, formatMessageForSMS } from '@/utils/smsUtils';

interface BirthdayCardProps {
  customers: Customer[];
}

const BirthdayCard: React.FC<BirthdayCardProps> = ({ customers }) => {
  const currentMonth = new Date().getMonth();
  const isMobile = useIsMobile();
  const { settings } = useBusinessSettings();
  const { toast } = useToast();
  
  // Filter customers with birthdays in the current month
  const birthdayCustomers = customers.filter(customer => 
    customer.birthday && customer.birthday.getMonth() === currentMonth
  );
  
  // Birthday email template
  const birthdayMessage = "🎉 Happy Birthday! 🎉\nWishing you a day filled with joy, love, and great memories. Thank you for being a valued part of our Family. We're grateful for your support and wish you nothing but happiness in the year ahead!";
  
  const handleSendBirthdayWishes = (customer: Customer, method: 'sms' | 'whatsapp') => {
    if (!canSendSMS(customer)) {
      toast({
        title: "Phone number required",
        description: "Customer phone number is not available.",
        variant: "destructive"
      });
      return;
    }

    try {
      const birthdayMessage = getBirthdayMessage(customer.fullName);
      const formattedMessage = formatMessageForSMS(birthdayMessage, settings.businessName);
      
      if (method === 'sms') {
        openSMSApp({
          phoneNumber: customer.phoneNumber!,
          message: formattedMessage
        });
        toast({
          title: "SMS app opened",
          description: "Birthday wishes prepared in SMS app.",
        });
      } else {
        openWhatsApp({
          phoneNumber: customer.phoneNumber!,
          message: formattedMessage
        });
        toast({
          title: "WhatsApp opened",
          description: "Birthday wishes prepared in WhatsApp.",
        });
      }
    } catch (error) {
      console.error('Error sending birthday wishes:', error);
      toast({
        title: "Failed to send",
        description: "Failed to open messaging app. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-medium">
          <Cake className="h-5 w-5 text-blue-500" />
          <span>This Month's Birthdays</span>
          {birthdayCustomers.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {birthdayCustomers.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {birthdayCustomers.length > 0 ? (
          <ul className="space-y-3">
            {birthdayCustomers.map(customer => (
              <li key={customer.id} className="flex items-center justify-between border-b pb-3">
                <div>
                  <p className="font-medium">{customer.fullName}</p>
                  <p className="text-sm text-gray-500">
                    {customer.birthday && format(customer.birthday, 'MMMM d')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {customer.email && (
                    <a 
                      href={`mailto:${customer.email}?subject=Happy Birthday!&body=${encodeURIComponent(birthdayMessage)}`}
                      className="text-sm text-blue-500 hover:underline"
                    >
                      Send email
                    </a>
                  )}
                  {canSendSMS(customer) && isMobile && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSendBirthdayWishes(customer, 'sms')}
                      className="text-xs"
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      SMS
                    </Button>
                  )}
                  {canSendSMS(customer) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSendBirthdayWishes(customer, 'whatsapp')}
                      className="text-xs border-green-500 text-green-700 hover:bg-green-50"
                    >
                      📱 WhatsApp
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No birthdays this month</p>
        )}
      </CardContent>
    </Card>
  );
};

export default BirthdayCard;
