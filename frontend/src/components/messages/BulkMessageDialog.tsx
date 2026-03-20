"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { Send, Users, AlertCircle } from 'lucide-react';
import { Customer } from '@/hooks/useCustomers';
import { MessageTemplate } from '@/hooks/useMessages';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useSalesData } from '@/hooks/useSalesData';
import { useBusiness } from '@/contexts/BusinessContext';
import { subDays, subMonths, subYears } from 'date-fns';

type StatusOption = 'all' | 'paid' | 'unpaid' | 'quote' | 'installment' | 'inactive';
type InactivityPeriod = '30days' | '60days' | '90days' | '6months' | '1year';

interface BulkMessageDialogProps {
  open: boolean;
  onClose: () => void;
  onSend: (data: { customerIds: string[]; content: string; templateId?: string }) => Promise<{ success: number; failed: number; errors: string[] }>;
  customers: Customer[];
  templates?: MessageTemplate[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

const BulkMessageDialog: React.FC<BulkMessageDialogProps> = ({
  open,
  onClose,
  onSend,
  customers,
  templates = [],
  searchTerm,
  setSearchTerm,
}) => {
  const [content, setContent] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('none');
  const [isSending, setIsSending] = useState(false);
  const [statusSelection, setStatusSelection] = useState<StatusOption>('all');
  const [inactivityPeriod, setInactivityPeriod] = useState<InactivityPeriod>('90days');
  const [sendResult, setSendResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const { currentBusiness } = useBusiness();
  const { sales, isLoading } = useSalesData(currentBusiness?.id);

  // Capitalize utility
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  // Map customers to statuses including inactive
  const customerStatusesMap = useMemo(() => {
    const map: Record<string, Set<StatusOption>> = {};
    if (!sales || sales.length === 0) return map;

    const now = new Date();
    let cutoffDate = now;
    switch (inactivityPeriod) {
      case '30days': cutoffDate = subDays(now, 30); break;
      case '60days': cutoffDate = subDays(now, 60); break;
      case '90days': cutoffDate = subDays(now, 90); break;
      case '6months': cutoffDate = subMonths(now, 6); break;
      case '1year': cutoffDate = subYears(now, 1); break;
    }

    customers.forEach(customer => {
      const customerName = (customer.fullName || '').toLowerCase();
      const customerSales = sales.filter(s =>
        s.customerId === customer.id || s.customerName?.toLowerCase().trim() === customerName
      );

      const statuses = new Set<StatusOption>();

      if (customerSales.length === 0) {
        statuses.add('inactive');
      } else {
        const lastPurchaseDate = new Date(Math.max(...customerSales.map(s => new Date(s.date).getTime())));
        if (lastPurchaseDate < cutoffDate) statuses.add('inactive');

        customerSales.forEach(sale => {
          const status = (sale.paymentStatus || '').toUpperCase().trim();
          if (status === 'PAID') statuses.add('paid');
          else if (status === 'QUOTE') statuses.add('quote');
          else if (status === 'INSTALLMENT SALE') statuses.add('installment');
          else if (['NOT PAID', 'UNPAID', 'OPEN'].includes(status)) statuses.add('unpaid');
        });
      }

      map[customer.id] = statuses;
    });

    return map;
  }, [customers, sales, inactivityPeriod]);

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        if (content !== '') setContent('');
        if (selectedCustomers.length > 0) setSelectedCustomers([]);
        if (selectedTemplate !== 'none') setSelectedTemplate('none');
        if (statusSelection !== 'all') setStatusSelection('all');
        if (sendResult !== null) setSendResult(null);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open, content, selectedCustomers.length, selectedTemplate, statusSelection, sendResult]);

  useEffect(() => {
    if (selectedTemplate && selectedTemplate !== 'none') {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template && content !== template.content) {
        const timer = setTimeout(() => {
          setContent(template.content);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedTemplate, templates, content]);

  const getCustomerPhone = (customer: Customer) =>
    customer.phoneNumber || '';

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const phone = getCustomerPhone(customer) || '';
      if (!phone) return false;

      const name = (customer.fullName || '').toLowerCase();
      const term = (searchTerm || '').toLowerCase();
      const searchMatch = !term || name.includes(term) || phone.toLowerCase().includes(term);

      const statuses = customerStatusesMap[customer.id] || new Set<StatusOption>();
      let statusMatch = true;
      if (statusSelection !== 'all') {
        statusMatch = statuses.has(statusSelection);
      }

      return searchMatch && statusMatch;
    });
  }, [customers, searchTerm, statusSelection, customerStatusesMap]);

  const handleToggleCustomer = (id: string) => {
    setSelectedCustomers(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  // Select all / deselect all
  const handleToggleAll = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map(c => c.id));
    }
  };

  const handleSend = async () => {
    if (!content || selectedCustomers.length === 0) return;
    setIsSending(true);
    const result = await onSend({
      customerIds: selectedCustomers,
      content,
      templateId: selectedTemplate !== 'none' ? selectedTemplate : undefined,
    });
    setIsSending(false);
    setSendResult(result);
    if (result.failed === 0) setTimeout(() => onClose(), 3000);
  };

  const totalSMS = selectedCustomers.length * Math.ceil((content.length || 1) / 160);

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="p-4 text-center text-gray-500">Loading sales data...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Send Bulk SMS
          </DialogTitle>
        </DialogHeader>

        {sendResult ? (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg border ${sendResult.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              <h3 className="font-semibold text-lg mb-2">
                {sendResult.failed === 0 ? '✅ Messages Sent Successfully!' : '⚠️ Sending Complete with Errors'}
              </h3>
              <div className="space-y-1 text-sm">
                <p className="text-green-700">✓ Successfully sent: {sendResult.success}</p>
                {sendResult.failed > 0 && <p className="text-red-700">✗ Failed: {sendResult.failed}</p>}
              </div>
            </div>

            {sendResult.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-900 mb-2">Errors:</h4>
                <ul className="text-sm text-red-800 space-y-1 max-h-[200px] overflow-y-auto">
                  {sendResult.errors.map((err, idx) => <li key={idx}>• {err}</li>)}
                </ul>
              </div>
            )}

            <Button onClick={onClose} className="w-full">Close</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Template */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Use Template (Optional)</label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  <SelectItem value="none">None - Type custom message</SelectItem>
                  {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Message */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Message * (Max 160 Characters)</label>
              <Textarea
                placeholder="Type your message here... Use {customer_name} for personalization"
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={4}
                maxLength={160}
                required
                className="resize-none w-full"
              />
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                <span>{content.length} characters</span>
                <span className="font-medium text-blue-600">{totalSMS} total SMS credits will be used</span>
              </div>
            </div>

            {/* Status selection */}
            <div className="flex gap-2 mb-2 flex-wrap items-center">
              {(['all', 'paid', 'unpaid', 'quote', 'installment', 'inactive'] as StatusOption[]).map(status => (
                <Button
                  key={status}
                  size="sm"
                  variant={statusSelection === status ? 'default' : 'outline'}
                  onClick={() => setStatusSelection(status)}
                >
                  {capitalize(status)}
                </Button>
              ))}

              {/* Inactivity period selector */}
              {statusSelection === 'inactive' && (
                <Select value={inactivityPeriod} onValueChange={(v: InactivityPeriod) => setInactivityPeriod(v)}>
                  <SelectTrigger className="w-[120px] text-xs">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30days">30 days</SelectItem>
                    <SelectItem value="60days">60 days</SelectItem>
                    <SelectItem value="90days">90 days</SelectItem>
                    <SelectItem value="6months">6 months</SelectItem>
                    <SelectItem value="1year">1 year</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Button size="sm" variant="outline" onClick={handleToggleAll}>
                {selectedCustomers.length === filteredCustomers.length
                  ? `Deselect All ${capitalize(statusSelection)} Customers`
                  : `Select All ${capitalize(statusSelection)} Customers`}
              </Button>

            </div>

            {/* Search */}
            <Input type="text" placeholder="Search customers..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="mb-2" />

            {/* Customer list */}
            <div className="border rounded-lg max-h-[300px] overflow-y-auto">
              {filteredCustomers.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No customers match your search</p>
                </div>
              ) : (
                filteredCustomers.map(customer => {
                  const phone = getCustomerPhone(customer);
                  const statuses = Array.from(customerStatusesMap[customer.id] || []);
                  return (
                    <div
                      key={customer.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b last:border-b-0 cursor-pointer"
                      onClick={() => handleToggleCustomer(customer.id)}
                    >
                      <Checkbox checked={selectedCustomers.includes(customer.id)} onCheckedChange={() => handleToggleCustomer(customer.id)} />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{customer.fullName || 'Unnamed Customer'}</p>
                        <p className="text-xs text-gray-500">{phone}</p>
                        <span className="text-xs text-gray-400">Status: {statuses.map(s => s.toUpperCase()).join(', ')}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Action */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={isSending}>Cancel</Button>
              <Button
                onClick={handleSend}
                disabled={selectedCustomers.length === 0 || !content || isSending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSending ? (
                  <span className="animate-spin mr-2">⏳</span>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send to {selectedCustomers.length} Customer{selectedCustomers.length !== 1 ? 's' : ''}
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

export default BulkMessageDialog;
