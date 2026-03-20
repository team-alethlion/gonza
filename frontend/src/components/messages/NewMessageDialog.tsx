/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Send } from "lucide-react";
import { Customer } from "@/hooks/useCustomers";
import { MessageTemplate } from "@/hooks/useMessages";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NewMessageDialogProps {
  open: boolean;
  onClose: () => void;
  onSend: (data: {
    phoneNumber: string;
    content: string;
    customerId?: string;
    templateId?: string;
  }) => Promise<{ success: number; failed: number; errors?: string[] }>;
  customers: Customer[];
  templates: MessageTemplate[];
}

const NewMessageDialog = ({
  open,
  onClose,
  onSend,
  customers,
  templates,
}: NewMessageDialogProps) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [content, setContent] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("none");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("none");
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const getCustomerPhone = useCallback((customer?: any) => {
    if (!customer) return "";
    const phone =
      customer.phone_number ||
      customer.phoneNumber ||
      customer.phone ||
      customer.contact ||
      "";
    return String(phone).trim();
  }, []);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setPhoneNumber("");
        setContent("");
        setSelectedCustomer("none");
        setSelectedTemplate("none");
        setSendResult(null);
        setSearchTerm("");
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Populate phone number when customer is selected
  useEffect(() => {
    if (selectedCustomer && selectedCustomer !== "none") {
      const customer = customers.find((c) => c.id === selectedCustomer);
      const phone = getCustomerPhone(customer);
      if (phoneNumber !== phone) {
        const timer = setTimeout(() => setPhoneNumber(phone), 0);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedCustomer, customers, phoneNumber, getCustomerPhone]);

  // Populate message content when template is selected
  useEffect(() => {
    if (selectedTemplate && selectedTemplate !== "none") {
      const template = templates.find((t) => t.id === selectedTemplate);
      if (template && content !== template.content) {
        const timer = setTimeout(() => setContent(template.content), 0);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedTemplate, templates, content]);

  const filteredCustomers = useMemo(() => {
    const term = (searchTerm || "").toLowerCase();
    return customers
      .filter((c) => getCustomerPhone(c)) // only customers with phone
      .filter((c) => {
        const name = (
          (c as any).full_name ||
          c.fullName ||
          (c as any).name ||
          ""
        ).toLowerCase();
        const phone = getCustomerPhone(c).toLowerCase();
        return !term || name.includes(term) || phone.includes(term);
      });
  }, [customers, searchTerm]);

  const handleSend = async () => {
    if (!phoneNumber || !content) return;

    setIsSending(true);
    const result = await onSend({
      phoneNumber,
      content,
      customerId:
        selectedCustomer && selectedCustomer !== "none"
          ? selectedCustomer
          : undefined,
      templateId:
        selectedTemplate && selectedTemplate !== "none"
          ? selectedTemplate
          : undefined,
    });
    setIsSending(false);

    setSendResult({
      success: result.success,
      failed: result.failed,
      errors: result.errors || [],
    });

    if ((result.failed || 0) === 0) {
      setTimeout(() => onClose(), 3000); // auto-close if all succeed
    }
  };

  const messageLength = content.length;
  const smsCredits = Math.ceil(messageLength / 160) || 1;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Send New Message
          </DialogTitle>
        </DialogHeader>

        {sendResult ? (
          <div className="space-y-4">
            <div
              className={`p-4 rounded-lg border ${
                sendResult.failed === 0
                  ? "bg-green-50 border-green-200"
                  : "bg-amber-50 border-amber-200"
              }`}>
              <h3 className="font-semibold text-lg mb-2">
                {sendResult.failed === 0
                  ? "✅ Message Sent Successfully!"
                  : "⚠️ Sending Completed with Errors"}
              </h3>
              <div className="space-y-1 text-sm">
                <p className="text-green-700">
                  ✓ Successfully sent: {sendResult.success}
                </p>
                {sendResult.failed > 0 && (
                  <p className="text-red-700">✗ Failed: {sendResult.failed}</p>
                )}
              </div>
            </div>

            {sendResult.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-900 mb-2">Errors:</h4>
                <ul className="text-sm text-red-800 space-y-1 max-h-[200px] overflow-y-auto">
                  {sendResult.errors.map((err, idx) => (
                    <li key={idx}>• {err}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Customer Dropdown */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Select Customer (Optional)
              </label>
              <Select
                value={selectedCustomer}
                onValueChange={setSelectedCustomer}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Search or select a customer..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  <div className="p-2">
                    <Input
                      type="text"
                      placeholder="Type to search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="mb-2"
                    />
                  </div>
                  <SelectItem value="none">
                    None - Enter Customer Name or Phone Number
                  </SelectItem>
                  {filteredCustomers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {(c as any).full_name ||
                        c.fullName ||
                        (c as any).name ||
                        "Unnamed Customer"}{" "}
                      - {getCustomerPhone(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Phone Number */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Phone Number *
              </label>
              <Input
                type="tel"
                placeholder="+256700000000"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Template */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Use Template (Optional)
              </label>
              <Select
                value={selectedTemplate}
                onValueChange={setSelectedTemplate}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  <SelectItem value="none">
                    None - Type custom message
                  </SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Message */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Message * (Max 160 Characters)
              </label>
              <Textarea
                placeholder="Type your message..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                required
                className="w-full resize-none"
              />
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                <span>{messageLength} characters</span>
                <span>
                  {smsCredits} SMS credit{smsCredits > 1 ? "s" : ""} will be
                  used
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={isSending}>
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={!phoneNumber || !content || isSending}
                className="bg-blue-600 hover:bg-blue-700">
                {isSending ? (
                  <span className="animate-spin mr-2">⏳</span>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NewMessageDialog;
