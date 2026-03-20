"use client";
import React, { useState, useEffect } from "react";
import { Customer } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import {
  openSMSApp,
  openWhatsApp,
  formatMessageForSMS,
  canSendSMS,
} from "@/utils/smsUtils";
import { getWeMissYouMessage } from "@/utils/smsUtils";

interface WeMissYouDialogProps {
  customer: Customer | null;
  open: boolean;
  onClose: () => void;
}

const WeMissYouDialog: React.FC<WeMissYouDialogProps> = ({
  customer,
  open,
  onClose,
}) => {
  const { settings } = useBusinessSettings();
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (customer && open) {
      const baseMessage = getWeMissYouMessage(customer.fullName);
      if (message !== baseMessage) {
        const timer = setTimeout(() => {
          setMessage(baseMessage);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [customer, open, message]);

  const handleSendSMS = () => {
    if (!customer?.phoneNumber) {
      toast.error("This customer doesn't have a phone number.");
      return;
    }

    if (!message.trim()) {
      toast.error("Please enter a message.");
      return;
    }

    const formattedMessage = formatMessageForSMS(
      message,
      settings.businessName,
    );

    try {
      openSMSApp({
        phoneNumber: customer.phoneNumber,
        message: formattedMessage,
      });
      toast.success("Opening SMS app...");
      onClose();
    } catch (error) {
      toast.error("Failed to open SMS app.");
    }
  };

  const handleSendWhatsApp = () => {
    if (!customer?.phoneNumber) {
      toast.error("This customer doesn't have a phone number.");
      return;
    }

    if (!message.trim()) {
      toast.error("Please enter a message.");
      return;
    }

    const formattedMessage = formatMessageForSMS(
      message,
      settings.businessName,
    );

    try {
      openWhatsApp({
        phoneNumber: customer.phoneNumber,
        message: formattedMessage,
      });
      toast.success("Opening WhatsApp...");
      onClose();
    } catch (error) {
      toast.error("Failed to open WhatsApp.");
    }
  };

  const handleSendEmail = () => {
    if (!customer?.email) {
      toast.error("This customer doesn't have an email address.");
      return;
    }

    if (!message.trim()) {
      toast.error("Please enter a message.");
      return;
    }

    const formattedMessage = formatMessageForSMS(
      message,
      settings.businessName,
    );
    const subject = "We Miss You!";
    const mailtoLink = `mailto:${customer.email}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(formattedMessage)}`;

    try {
      window.open(mailtoLink);
      toast.success("Opening email client...");
      onClose();
    } catch (error) {
      toast.error("Failed to open email client.");
    }
  };

  const canSendEmail = customer?.email && customer.email.trim() !== "";
  const canSendPhone = customer && canSendSMS(customer);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-purple-600" />
            Send &quot;We Miss You&quot; Message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {customer && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Sending to:{" "}
                <span className="text-foreground font-semibold">
                  {customer.fullName}
                </span>
              </p>
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                {customer.phoneNumber && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {customer.phoneNumber}
                  </span>
                )}
                {customer.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {customer.email}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="message" className="text-sm font-medium">
              Message
            </label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message..."
              className="min-h-[200px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Your business name and signature will be added automatically.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button
              onClick={handleSendSMS}
              disabled={!canSendPhone || !message.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              title={
                !canSendPhone ? "No phone number available" : "Send via SMS"
              }>
              <Phone className="h-4 w-4 mr-2" />
              Send SMS
            </Button>

            <Button
              onClick={handleSendWhatsApp}
              disabled={!canSendPhone || !message.trim()}
              className="flex-1 bg-green-600 hover:bg-green-700"
              title={
                !canSendPhone
                  ? "No phone number available"
                  : "Send via WhatsApp"
              }>
              <MessageSquare className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>

            <Button
              onClick={handleSendEmail}
              disabled={!canSendEmail || !message.trim()}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              title={
                !canSendEmail ? "No email address available" : "Send via Email"
              }>
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
          </div>

          <Button onClick={onClose} variant="outline" className="w-full">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WeMissYouDialog;
