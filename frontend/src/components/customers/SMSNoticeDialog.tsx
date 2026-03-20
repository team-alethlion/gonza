"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, X } from 'lucide-react';
import { Customer, Sale } from '@/types';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useToast } from '@/hooks/use-toast';
import { openSMSApp, formatMessageForSMS } from '@/utils/smsUtils';
import { getTemplateById } from '@/utils/noticeTemplates';

interface SMSNoticeDialogProps {
  customer: Customer | { fullName: string; phoneNumber: string | null };
  sale?: Sale;
  open: boolean;
  onClose: () => void;
  templateId?: string;
}

const SMSNoticeDialog: React.FC<SMSNoticeDialogProps> = ({
  customer,
  sale,
  open,
  onClose,
  templateId = 'thank_you'
}) => {
  const [message, setMessage] = useState<string>('');
  const { settings } = useBusinessSettings();
  const { toast } = useToast();

  React.useEffect(() => {
    if (open && templateId) {
      const template = getTemplateById(templateId);
      if (template) {
        let content = template.content;
        
        // Add sale-specific information if available
        if (sale && templateId === 'payment_reminder') {
          const saleTotal = sale.items.reduce((total, item) => total + (item.price * item.quantity), 0);
          content = `${content}\n\nSale Details:\nReceipt: ${sale.receiptNumber}\nAmount: ${settings.currency} ${saleTotal.toFixed(2)}`;
        }
        
        setMessage(content);
      }
    }
  }, [open, templateId, sale, settings.currency]);

  const handleSendSMS = () => {
    if (!message.trim()) {
      toast({
        title: "Message required",
        description: "Please enter a message before sending SMS.",
        variant: "destructive"
      });
      return;
    }

    try {
      const fullMessage = `Dear ${customer.fullName},\n\n${message}\n\nYours faithfully,\n${settings.businessName || 'Management'}`;
      const formattedMessage = formatMessageForSMS(fullMessage, settings.businessName);
      
      openSMSApp({
        phoneNumber: customer.phoneNumber!,
        message: formattedMessage
      });

      toast({
        title: "SMS app opened",
        description: "Your message has been prepared in the SMS app.",
      });

      onClose();
    } catch (error) {
      console.error('Error sending SMS:', error);
      toast({
        title: "SMS failed",
        description: "Failed to open SMS app. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Send SMS to {customer.fullName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Message</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message..."
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              Message will be formatted for SMS with greeting and signature.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSendSMS}
            disabled={!message.trim()}
            className="gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Send SMS
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SMSNoticeDialog;
