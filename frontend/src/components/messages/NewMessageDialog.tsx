/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Send, MessageSquare, Smartphone, AlertCircle, Loader2 } from "lucide-react";
import LoadingSpinner from "../LoadingSpinner";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { getWhatsAppStatusAction } from "@/app/actions/messaging";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { messageSchema, type MessageFormValues } from "@/lib/validations/message";

interface NewMessageDialogProps {
  open: boolean;
  onClose: () => void;
  onSend: (data: {
    phoneNumber: string;
    content: string;
    customerId?: string;
    templateId?: string;
    channel: "sms" | "whatsapp";
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
  const [waStatus, setWaStatus] = useState<string>('unknown');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const form = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    mode: "onChange",
    defaultValues: {
      channel: "sms",
      selectedCustomer: "none",
      phoneNumber: "",
      content: "",
      selectedTemplate: "none",
    },
  });

  const { watch, setValue, control, handleSubmit, reset } = form;
  const channel = watch("channel");
  const selectedCustomer = watch("selectedCustomer");
  const selectedTemplate = watch("selectedTemplate");
  const content = watch("content");
  const phoneNumber = watch("phoneNumber");

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
      reset();
      setSendResult(null);
      setSearchTerm("");
    } else {
        getWhatsAppStatusAction().then(res => {
            if (res.success) setWaStatus(res.data.status);
        });
    }
  }, [open, reset]);

  // Populate phone number when customer is selected
  useEffect(() => {
    if (selectedCustomer && selectedCustomer !== "none") {
      const customer = customers.find((c) => c.id === selectedCustomer);
      const phone = getCustomerPhone(customer);
      if (phoneNumber !== phone) {
        setValue("phoneNumber", phone, { shouldValidate: true });
      }
    }
  }, [selectedCustomer, customers, phoneNumber, getCustomerPhone, setValue]);

  // Populate message content when template is selected
  useEffect(() => {
    if (selectedTemplate && selectedTemplate !== "none") {
      const template = templates.find((t) => t.id === selectedTemplate);
      if (template && content !== template.content) {
        setValue("content", template.content, { shouldValidate: true });
      }
    }
  }, [selectedTemplate, templates, content, setValue]);

  const filteredCustomers = useMemo(() => {
    const term = (searchTerm || "").toLowerCase();
    return customers
      .filter((c) => getCustomerPhone(c))
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

  const onFormSubmit = async (values: MessageFormValues) => {
    if (values.channel === 'whatsapp' && waStatus !== 'connected') {
        toast.error("WhatsApp is not connected. Please pair your device first.");
        return;
    }

    setIsSending(true);
    try {
      const result = await onSend({
        phoneNumber: values.phoneNumber,
        content: values.content,
        channel: values.channel,
        customerId:
          values.selectedCustomer && values.selectedCustomer !== "none"
            ? values.selectedCustomer
            : undefined,
        templateId:
          values.selectedTemplate && values.selectedTemplate !== "none"
            ? values.selectedTemplate
            : undefined,
      });

      setSendResult({
        success: result.success,
        failed: result.failed,
        errors: result.errors || [],
      });

      if ((result.failed || 0) === 0) {
        setTimeout(() => onClose(), 2000);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const messageLength = content.length;
  const creditCost = Math.ceil(messageLength / 160) || 1;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Send className="w-5 h-5 text-primary" />
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
          <Form {...form}>
            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6 py-2">
              <FormField
                control={control}
                name="channel"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>1. Select Delivery Channel</FormLabel>
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                      <Button
                        type="button"
                        variant={field.value === 'sms' ? 'default' : 'ghost'}
                        onClick={() => field.onChange('sms')}
                        className={`flex-1 h-10 gap-2 font-bold rounded-lg transition-all ${field.value === 'sms' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}
                      >
                        <Smartphone className="w-4 h-4" />
                        SMS
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === 'whatsapp' ? 'default' : 'ghost'}
                        onClick={() => field.onChange('whatsapp')}
                        className={`flex-1 h-10 gap-2 font-bold rounded-lg transition-all ${field.value === 'whatsapp' ? 'bg-white shadow-sm text-green-600' : 'text-slate-500'}`}
                      >
                        <MessageSquare className="w-4 h-4" />
                        WhatsApp
                      </Button>
                    </div>
                    {field.value === 'whatsapp' && waStatus !== 'connected' && (
                      <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 animate-in fade-in zoom-in-95">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <p className="text-[10px] font-bold leading-tight uppercase tracking-tight">
                          WhatsApp not paired. Connect your device in the <b>WhatsApp Tab</b> first.
                        </p>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="selectedCustomer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>2. Select Recipient</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full h-11">
                          <SelectValue placeholder="Search or select a customer..." />
                        </SelectTrigger>
                      </FormControl>
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem className={cn(selectedCustomer !== 'none' && "opacity-50 grayscale pointer-events-none")}>
                    <FormLabel>3. Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+256700000000"
                        {...field}
                        className="w-full h-11 font-mono"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <FormLabel>4. Compose Content</FormLabel>
                  <FormField
                    control={control}
                    name="selectedTemplate"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}>
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
                    )}
                  />
                </div>
                
                <FormField
                  control={control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Type your message..."
                          {...field}
                          rows={5}
                          className="w-full resize-none text-sm leading-relaxed"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-between mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>{messageLength} Characters</span>
                  <span className="text-primary font-bold">
                    {creditCost} Credit{creditCost > 1 ? "s" : ""} Required
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button variant="ghost" type="button" onClick={onClose} disabled={isSending} className="font-bold text-slate-400">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSending || (channel === 'whatsapp' && waStatus !== 'connected')}
                  className={cn(
                    "h-12 px-8 font-black uppercase tracking-widest shadow-lg",
                    channel === 'whatsapp' ? "bg-green-600 hover:bg-green-700 shadow-green-100" : "bg-primary hover:bg-primary/90"
                  )}
                >
                  {isSending ? (
                    <LoadingSpinner inline size="sm" showMessage={false} />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send via {channel.toUpperCase()}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NewMessageDialog;
