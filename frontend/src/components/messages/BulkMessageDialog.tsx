
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
import { useBusiness } from '@/contexts/BusinessContext';
import { getSegmentedCustomersAction } from '@/app/actions/customers';
import { getWhatsAppStatusAction } from '@/app/actions/messaging';
import { toast } from 'sonner';

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
  
  // Message State
  const [content, setContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('none');
  const [channel, setChannel] = useState<Channel>('sms');
  
  // WhatsApp Status
  const [waStatus, setWaStatus] = useState<string>('unknown');
  
  // Segmentation State
  const [statusSelection, setStatusSelection] = useState<StatusOption>('all');
  const [inactivityPeriod, setInactivityPeriod] = useState<InactivityPeriod>('90');
  const [segmentCustomers, setSegmentCustomers] = useState<Customer[]>([]);
  const [isLoadingSegment, setIsLoadingSegment] = useState(false);
  
  // Selection State
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Result State
  const [isSending, setIsSending] = useState(false);

  // FETCH WHATSAPP STATUS
  useEffect(() => {
    if (open) {
        getWhatsAppStatusAction().then(res => {
            if (res.success) setWaStatus(res.data.status);
        });
    }
  }, [open]);

  // 🎯 FETCH SEGMENT: Moves heavy logic to Backend
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
        // Auto-select all by default when segment loads
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

  // Re-fetch when criteria change
  useEffect(() => {
    if (open) fetchSegment();
  }, [open, statusSelection, inactivityPeriod, currentBusiness?.id]);

  // Handle template selection
  useEffect(() => {
    if (selectedTemplate && selectedTemplate !== 'none') {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template) setContent(template.content);
    }
  }, [selectedTemplate, templates]);

  // Client-side search within the segment
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

  const handleSend = async () => {
    if (!content || selectedCustomers.length === 0) return;
    
    if (channel === 'whatsapp' && waStatus !== 'connected') {
        toast.error("WhatsApp is not paired. Please connect your device in the WhatsApp tab first.");
        return;
    }

    setIsSending(true);
    try {
      const result = await onSend({
        customerIds: selectedCustomers,
        content,
        templateId: selectedTemplate !== 'none' ? selectedTemplate : undefined,
        channel: channel
      });
      
      if (result.failed === 0) {
        toast.success(`Successfully queued ${result.success} ${channel.toUpperCase()} messages`);
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
            <Users className="w-6 h-6 text-blue-600" />
            Bulk Messaging Engine
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row border-t">
          {/* LEFT: Configuration */}
          <div className="w-full md:w-1/2 p-6 border-r overflow-y-auto space-y-6 bg-gray-50/50">
            <div className="space-y-6">
               {/* 0. Channel Selection */}
               <div className="space-y-3">
                  <label className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-blue-500" />
                    1. Select Channel
                  </label>
                  <div className="flex gap-2 p-1 bg-white border rounded-xl shadow-sm">
                    <Button
                        variant={channel === 'sms' ? 'default' : 'ghost'}
                        onClick={() => setChannel('sms')}
                        className={`flex-1 h-10 gap-2 font-bold ${channel === 'sms' ? 'bg-blue-600 shadow-md shadow-blue-100' : ''}`}
                    >
                        <Smartphone className="w-4 h-4" />
                        SMS
                    </Button>
                    <Button
                        variant={channel === 'whatsapp' ? 'default' : 'ghost'}
                        onClick={() => setChannel('whatsapp')}
                        className={`flex-1 h-10 gap-2 font-bold ${channel === 'whatsapp' ? 'bg-green-600 shadow-md shadow-green-100 hover:bg-green-700' : ''}`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        WhatsApp
                    </Button>
                  </div>
                  {channel === 'whatsapp' && waStatus !== 'connected' && (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 animate-in fade-in slide-in-from-top-1">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <p className="text-[10px] font-bold leading-tight uppercase tracking-tight">
                            WhatsApp is not linked. Pair your device in the <b>WhatsApp Tab</b> first.
                        </p>
                    </div>
                  )}
               </div>

               <div>
                  <label className="text-sm font-black text-slate-900 uppercase tracking-tight mb-3 flex items-center gap-2">
                    <Filter className="w-4 h-4 text-blue-500" />
                    2. Define Audience
                  </label>
                  <div className="flex gap-2 mb-3">
                    {(['all', 'unpaid', 'inactive'] as StatusOption[]).map(status => (
                      <Button
                        key={status}
                        size="sm"
                        variant={statusSelection === status ? 'default' : 'outline'}
                        onClick={() => setStatusSelection(status)}
                        className={`flex-1 text-[10px] uppercase font-black tracking-widest ${statusSelection === status ? 'bg-blue-900 border-blue-900' : ''}`}
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                  
                  {statusSelection === 'inactive' && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <span className="text-[10px] font-black text-blue-800 uppercase">Period:</span>
                        <Select value={inactivityPeriod} onValueChange={(v: InactivityPeriod) => setInactivityPeriod(v)}>
                          <SelectTrigger className="h-8 text-xs bg-white font-bold border-none shadow-sm">
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

               <div className="space-y-3">
                  <label className="text-sm font-black text-slate-900 uppercase tracking-tight block">3. Select Template</label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger className="w-full bg-white border-slate-200 h-11 font-medium">
                      <SelectValue placeholder="Choose a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Custom Message (No Template)</SelectItem>
                      {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
               </div>

               <div className="space-y-2">
                  <label className="text-sm font-black text-slate-900 uppercase tracking-tight block">4. Compose Message</label>
                  <Textarea
                    placeholder="Type your message... Use {customer_name} for personalization"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    rows={6}
                    maxLength={160}
                    className="resize-none bg-white font-mono text-sm border-slate-200"
                  />
                  <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest text-slate-400">
                    <span>{content.length} / 160 Characters</span>
                    <span className="text-blue-600">{totalCredits} Est. Credits</span>
                  </div>
               </div>
            </div>
          </div>

          {/* RIGHT: Customer Selection */}
          <div className="w-full md:w-1/2 p-6 flex flex-col bg-white">
             <div className="mb-4 space-y-3">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-black text-slate-900 uppercase tracking-tight">5. Review Recipients</label>
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                        {selectedCustomers.length} Selected
                    </span>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input 
                        placeholder="Search within segment..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-9 h-11 border-slate-200"
                    />
                </div>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleToggleAll}
                    className="w-full h-8 text-[9px] uppercase font-black tracking-[0.1em] border text-slate-500"
                >
                    {selectedCustomers.length === filteredCustomers.length ? "Deselect All" : "Select All Visible"}
                </Button>
             </div>

             <div className="flex-1 border rounded-xl overflow-hidden bg-slate-50/30">
                <div className="h-full overflow-y-auto divide-y divide-slate-100">
                    {isLoadingSegment ? (
                        <div className="p-12 text-center text-xs text-muted-foreground animate-pulse font-black uppercase tracking-widest">
                            Optimizing segment...
                        </div>
                    ) : filteredCustomers.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p className="text-xs font-black uppercase tracking-widest">No customers found</p>
                        </div>
                    ) : (
                        filteredCustomers.map(customer => (
                            <div 
                                key={customer.id}
                                className="flex items-center gap-3 p-3 hover:bg-white transition-colors cursor-pointer group"
                                onClick={() => handleToggleCustomer(customer.id)}
                            >
                                <Checkbox 
                                    checked={selectedCustomers.includes(customer.id)} 
                                    onCheckedChange={() => handleToggleCustomer(customer.id)}
                                    className="data-[state=checked]:bg-blue-600 border-slate-300"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold truncate group-hover:text-blue-600 transition-colors">
                                        {customer.fullName}
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-mono font-medium">{customer.phoneNumber}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
             </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-6 bg-white border-t flex justify-between items-center">
            <Button variant="ghost" onClick={onClose} disabled={isSending} className="font-bold">Cancel</Button>
            <Button
                onClick={handleSend}
                disabled={selectedCustomers.length === 0 || !content || isSending || isLoadingSegment || (channel === 'whatsapp' && waStatus !== 'connected')}
                size="lg"
                className={`font-black uppercase tracking-widest px-8 shadow-lg transition-all h-14 ${
                    channel === 'whatsapp' ? 'bg-green-600 hover:bg-green-700 shadow-green-100' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
                }`}
            >
                {isSending ? "Processing Job..." : `Send to ${selectedCustomers.length} Recipients`}
                {!isSending && <Send className="w-4 h-4 ml-2" />}
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkMessageDialog;
