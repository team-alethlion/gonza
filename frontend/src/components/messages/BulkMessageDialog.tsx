"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { Send, Users, AlertCircle, Search, Filter, MessageSquare, Smartphone } from 'lucide-react';
import { Customer } from '@/types';
import { MessageTemplate } from '@/hooks/useMessages';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { useBusiness } from '@/contexts/BusinessContext';
import { getSegmentedCustomersAction } from '@/app/actions/customers';
import { getWhatsAppStatusAction } from '@/app/actions/messaging';
import { toast } from 'sonner';
import { useForm } from "react-hook-form";

type StatusOption = 'all' | 'unpaid' | 'inactive';
type InactivityPeriod = '30' | '60' | '90' | '180' | '365';
type Channel = 'sms' | 'whatsapp';

interface BulkMessageDialogProps {
  open: boolean;
  onClose: () => void;
  onSend: (data: { customerIds: string[]; content: string; templateId?: string; channel: Channel }) => Promise<{ success: number; failed: number; errors: string[] }>;
  templates?: MessageTemplate[];
}

const BulkMessageDialog: React.FC<BulkMessageDialogProps> = ({
  open,
  onClose,
  onSend,
  templates = [],
}) => {
  const { currentBusiness } = useBusiness();
  const [waStatus, setWaStatus] = useState<string>('unknown');
  const [statusSelection, setStatusSelection] = useState<StatusOption>('all');
  const [inactivityPeriod, setInactivityPeriod] = useState<InactivityPeriod>('90');
  const [segmentCustomers, setSegmentCustomers] = useState<Customer[]>([]);
  const [isLoadingSegment, setIsLoadingSegment] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSending, setIsSending] = useState(false);

  const form = useForm({
    defaultValues: {
      channel: 'sms' as Channel,
      selectedTemplate: 'none',
      content: '',
    }
  });

  const { control, watch, setValue, handleSubmit, reset } = form;
  const channel = watch("channel");
  const content = watch("content");
  const selectedTemplate = watch("selectedTemplate");

  useEffect(() => {
    if (open) {
      reset();
      getWhatsAppStatusAction().then(res => {
        if (res.success) setWaStatus(res.data.status);
      });
    }
  }, [open, reset]);

  const fetchSegment = async () => {
    if (!currentBusiness?.id) return;
    setIsLoadingSegment(true);
    try {
      const result = await getSegmentedCustomersAction(
        currentBusiness.id, 
        statusSelection, 
        parseInt(inactivityPeriod)
      );
      if (result.success) {
        setSegmentCustomers(result.data);
        setSelectedCustomers(result.data.map((c: any) => c.id));
      } else {
        toast.error("Failed to load customer segment");
      }
    } catch (error) {
      console.error("Segmentation error:", error);
    } finally {
      setIsLoadingSegment(false);
    }
  };

  useEffect(() => {
    if (open) fetchSegment();
  }, [open, statusSelection, inactivityPeriod, currentBusiness?.id]);

  useEffect(() => {
    if (selectedTemplate && selectedTemplate !== 'none') {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template) setValue("content", template.content);
    }
  }, [selectedTemplate, templates, setValue]);

  const filteredCustomers = useMemo(() => {
    return segmentCustomers.filter(customer => {
      const name = (customer.fullName || '').toLowerCase();
      const phone = (customer.phoneNumber || '').toLowerCase();
      const term = searchTerm.toLowerCase();
      return name.includes(term) || phone.includes(term);
    });
  }, [segmentCustomers, searchTerm]);

  const handleToggleCustomer = (id: string) => {
    setSelectedCustomers(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleToggleAll = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map(c => c.id));
    }
  };

  const onFormSubmit = async (values: any) => {
    if (!values.content || selectedCustomers.length === 0) return;
    
    if (values.channel === 'whatsapp' && waStatus !== 'connected') {
        toast.error("WhatsApp is not paired. Please connect your device in the WhatsApp tab first.");
        return;
    }

    setIsSending(true);
    try {
      const result = await onSend({
        customerIds: selectedCustomers,
        content: values.content,
        templateId: values.selectedTemplate !== 'none' ? values.selectedTemplate : undefined,
        channel: values.channel
      });
      
      if (result.failed === 0) {
        toast.success(`Successfully queued ${result.success} ${values.channel.toUpperCase()} messages`);
        setTimeout(() => onClose(), 2000);
      } else {
        toast.error(`Failed to queue some messages: ${result.errors[0]}`);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSending(false);
    }
  };

  const totalCredits = selectedCustomers.length * Math.ceil((content.length || 1) / 160);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
            <Users className="w-6 h-6 text-primary" />
            Bulk Messaging Engine
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(onFormSubmit)} className="flex-1 overflow-hidden flex flex-col md:flex-row border-t">
            {/* LEFT: Configuration */}
            <div className="w-full md:w-1/2 p-6 border-r overflow-y-auto space-y-6 bg-gray-50/50">
              <div className="space-y-6">
                <FormField
                  control={control}
                  name="channel"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-primary" />
                        1. Select Channel
                      </FormLabel>
                      <div className="flex gap-2 p-1 bg-white border rounded-xl shadow-sm">
                        <Button
                          type="button"
                          variant={field.value === 'sms' ? 'default' : 'ghost'}
                          onClick={() => field.onChange('sms')}
                          className={`flex-1 h-10 gap-2 font-bold ${field.value === 'sms' ? 'bg-primary text-primary-foreground shadow-md' : ''}`}
                        >
                          <Smartphone className="w-4 h-4" />
                          SMS
                        </Button>
                        <Button
                          type="button"
                          variant={field.value === 'whatsapp' ? 'default' : 'ghost'}
                          onClick={() => field.onChange('whatsapp')}
                          className={`flex-1 h-10 gap-2 font-bold ${field.value === 'whatsapp' ? 'bg-green-600 text-white shadow-md hover:bg-green-700' : ''}`}
                        >
                          <MessageSquare className="w-4 h-4" />
                          WhatsApp
                        </Button>
                      </div>
                      {field.value === 'whatsapp' && waStatus !== 'connected' && (
                        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 animate-in fade-in slide-in-from-top-1">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <p className="text-[10px] font-bold leading-tight uppercase tracking-tight">
                            WhatsApp is not linked. Pair your device in the <b>WhatsApp Tab</b> first.
                          </p>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <FormLabel className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-primary" />
                    2. Define Audience
                  </FormLabel>
                  <div className="flex gap-2">
                    {(['all', 'unpaid', 'inactive'] as StatusOption[]).map(status => (
                      <Button
                        key={status}
                        type="button"
                        size="sm"
                        variant={statusSelection === status ? 'default' : 'outline'}
                        onClick={() => setStatusSelection(status)}
                        className={`flex-1 text-[10px] uppercase font-bold tracking-widest ${statusSelection === status ? 'bg-slate-900 border-slate-900' : ''}`}
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                  
                  {statusSelection === 'inactive' && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                        <span className="text-[10px] font-bold text-blue-800 uppercase">Period:</span>
                        <Select value={inactivityPeriod} onValueChange={(v: InactivityPeriod) => setInactivityPeriod(v)}>
                          <SelectTrigger className="h-8 text-xs bg-white font-bold border-none shadow-sm w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30">Last 30 Days</SelectItem>
                            <SelectItem value="90">Last 90 Days</SelectItem>
                            <SelectItem value="180">Last 6 Months</SelectItem>
                            <SelectItem value="365">Last 1 Year</SelectItem>
                          </SelectContent>
                        </Select>
                    </div>
                  )}
                </div>

                <FormField
                  control={control}
                  name="selectedTemplate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>3. Select Template</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full bg-white h-11">
                            <SelectValue placeholder="Choose a template..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Custom Message (No Template)</SelectItem>
                          {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>4. Compose Message</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Type your message..."
                          {...field}
                          rows={6}
                          className="resize-none bg-white text-sm"
                        />
                      </FormControl>
                      <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">
                        <span>{field.value.length} / 160 Characters</span>
                        <span className="text-primary">{totalCredits} Est. Credits</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* RIGHT: Customer Selection */}
            <div className="w-full md:w-1/2 p-6 flex flex-col bg-white">
              <div className="mb-4 space-y-3">
                <div className="flex justify-between items-center">
                    <FormLabel>5. Review Recipients</FormLabel>
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        {selectedCustomers.length} Selected
                    </span>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search within segment..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-9 h-11"
                    />
                </div>
                <Button 
                    variant="ghost" 
                    type="button"
                    size="sm" 
                    onClick={handleToggleAll}
                    className="w-full h-8 text-[9px] uppercase font-bold tracking-widest border text-muted-foreground"
                >
                    {selectedCustomers.length === filteredCustomers.length ? "Deselect All" : "Select All Visible"}
                </Button>
              </div>

              <div className="flex-1 border rounded-xl overflow-hidden bg-slate-50/30">
                <div className="h-full overflow-y-auto divide-y divide-slate-100">
                    {isLoadingSegment ? (
                        <div className="p-12 text-center text-xs text-muted-foreground animate-pulse font-bold uppercase tracking-widest">
                            Optimizing segment...
                        </div>
                    ) : filteredCustomers.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p className="text-xs font-bold uppercase tracking-widest">No customers found</p>
                        </div>
                    ) : (
                        filteredCustomers.map(customer => (
                            <div 
                                key={customer.id}
                                className="flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors cursor-pointer group"
                                onClick={() => handleToggleCustomer(customer.id)}
                            >
                                <Checkbox 
                                    checked={selectedCustomers.includes(customer.id)} 
                                    onCheckedChange={() => handleToggleCustomer(customer.id)}
                                    className="data-[state=checked]:bg-primary border-slate-300"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">
                                        {customer.fullName}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground font-mono font-medium">{customer.phoneNumber}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
              </div>
              
              <div className="pt-6 mt-auto flex justify-between items-center">
                <Button variant="ghost" type="button" onClick={onClose} disabled={isSending} className="font-bold text-muted-foreground">
                  Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={selectedCustomers.length === 0 || !content || isSending || isLoadingSegment || (channel === 'whatsapp' && waStatus !== 'connected')}
                    className={cn(
                      "font-bold uppercase tracking-widest px-8 shadow-lg transition-all h-12",
                      channel === 'whatsapp' ? "bg-green-600 hover:bg-green-700 shadow-green-100" : "bg-primary hover:bg-primary/90 shadow-primary/20"
                    )}
                >
                    {isSending ? "Processing..." : `Send to ${selectedCustomers.length} Recipients`}
                    {!isSending && <Send className="w-4 h-4 ml-2" />}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default BulkMessageDialog;
