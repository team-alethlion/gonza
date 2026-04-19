
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Send, MessageSquare, Smartphone, AlertCircle, Loader2 } from "lucide-react";
import { Customer } from "@/types";
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
import { getWhatsAppStatusAction } from "@/app/actions/messaging";
import { toast } from "sonner";

type Channel = 'sms' | 'whatsapp';

interface NewMessageDialogProps {
  open: boolean;
  onClose: () => void;
  onSend: (data: {
    phoneNumber: string;
    content: string;
    customerId?: string;
    templateId?: string;
    channel: Channel;
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
  const [channel, setChannel] = useState<Channel>('sms');
  const [waStatus, setWaStatus] = useState<string>('unknown');
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
        setChannel('sms');
        setSendResult(null);
        setSearchTerm("");
      }, 0);
      return () => clearTimeout(timer);
    } else {
        // Fetch WhatsApp status when opening
        getWhatsAppStatusAction().then(res => {
            if (res.success) setWaStatus(res.data.status);
        });
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
  }, [customers, searchTerm, getCustomerPhone]);

  const handleSend = async () => {
    if (!phoneNumber || !content) return;

    if (channel === 'whatsapp' && waStatus !== 'connected') {
        toast.error("WhatsApp is not connected. Please pair your device first.");
        return;
    }

    setIsSending(true);
    const result = await onSend({
      phoneNumber,
      content,
      channel,
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
  const creditCost = Math.ceil(messageLength / 160) || 1;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Send className="w-5 h-5 text-blue-600" />
            Send New Message
          </DialogTitle>
        </DialogHeader>

        {sendResult ? (
          <div className="space-y-4 py-4 text-center">
            <div
              className={`p-6 rounded-2xl border-2 ${
                sendResult.failed === 0
                  ? "bg-green-50 border-green-100 text-green-900"
                  : "bg-amber-50 border-amber-100 text-amber-900"
              }`}>
              <h3 className="font-black uppercase tracking-tight text-lg mb-4">
                {sendResult.failed === 0
                  ? "✓ Message Queued"
                  : "⚠️ Completed with Errors"}
              </h3>
              <div className="space-y-2 text-sm font-bold opacity-80 uppercase tracking-widest">
                <p>Status: {channel.toUpperCase()}</p>
                <p>Sent: {sendResult.success}</p>
                {sendResult.failed > 0 && (
                  <p className="text-red-600">Failed: {sendResult.failed}</p>
                )}
              </div>
            </div>

            {sendResult.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
                <h4 className="font-bold text-red-900 mb-2">Error Details:</h4>
                <ul className="text-xs text-red-800 space-y-1 max-h-[200px] overflow-y-auto">
                  {sendResult.errors.map((err, idx) => (
                    <li key={idx}>• {err}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button onClick={onClose} variant="ghost" className="w-full font-bold">
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {/* 0. Channel Selection */}
            <div className="space-y-3">
               <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                 1. Select Delivery Channel
               </label>
               <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                 <Button
                    variant={channel === 'sms' ? 'default' : 'ghost'}
                    onClick={() => setChannel('sms')}
                    className={`flex-1 h-10 gap-2 font-bold rounded-lg transition-all ${channel === 'sms' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                 >
                    <Smartphone className="w-4 h-4" />
                    SMS
                 </Button>
                 <Button
                    variant={channel === 'whatsapp' ? 'default' : 'ghost'}
                    onClick={() => setChannel('whatsapp')}
                    className={`flex-1 h-10 gap-2 font-bold rounded-lg transition-all ${channel === 'whatsapp' ? 'bg-white shadow-sm text-green-600' : 'text-slate-500'}`}
                 >
                    <MessageSquare className="w-4 h-4" />
                    WhatsApp
                 </Button>
               </div>
               {channel === 'whatsapp' && waStatus !== 'connected' && (
                 <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 animate-in fade-in zoom-in-95">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p className="text-[10px] font-bold leading-tight uppercase tracking-tight">
                        WhatsApp not paired. Connect your device in the <b>WhatsApp Tab</b> first.
                    </p>
                 </div>
               )}
            </div>

            {/* Customer Dropdown */}
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">
                2. Select Recipient
              </label>
              <Select
                value={selectedCustomer}
                onValueChange={setSelectedCustomer}>
                <SelectTrigger className="w-full h-11 border-slate-200">
                  <SelectValue placeholder="Search or select a customer..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  <div className="p-2">
                    <Input
                      type="text"
                      placeholder="Type to search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="mb-2 h-9"
                    />
                  </div>
                  <SelectItem value="none" className="font-bold text-slate-400">
                    Manual Entry (New Recipient)
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
            <div className={`${selectedCustomer !== 'none' ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">
                3. Phone Number
              </label>
              <Input
                type="tel"
                placeholder="+256700000000"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full h-11 border-slate-200 font-mono"
              />
            </div>

            {/* Message */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    4. Compose Content
                </label>
                <Select
                    value={selectedTemplate}
                    onValueChange={setSelectedTemplate}>
                    <SelectTrigger className="w-48 h-8 text-[10px] uppercase font-bold border-slate-100 bg-slate-50">
                    <SelectValue placeholder="Quick Template" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                    <SelectItem value="none">Custom Message</SelectItem>
                    {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="Type your message..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                required
                className="w-full resize-none border-slate-200 text-sm leading-relaxed"
              />
              <div className="flex justify-between mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>{messageLength} Characters</span>
                <span className="text-blue-600">
                  {creditCost} Credit{creditCost > 1 ? "s" : ""} Required
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
              <Button variant="ghost" onClick={onClose} disabled={isSending} className="font-bold text-slate-400">
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={!phoneNumber || !content || isSending || (channel === 'whatsapp' && waStatus !== 'connected')}
                className={`h-12 px-8 font-black uppercase tracking-widest shadow-lg ${
                    channel === 'whatsapp' ? 'bg-green-600 hover:bg-green-700 shadow-green-100' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
                }`}
              >
                {isSending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send via {channel.toUpperCase()}
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
