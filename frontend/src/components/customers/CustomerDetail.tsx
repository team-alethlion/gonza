"use client";

import React, { useState, useEffect } from 'react';
import { Customer, Sale, SaleItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, Edit2, Mail, MapPin, Phone, Trash2, Receipt, CreditCard, 
  FileText, MessageSquare, Cake, Loader2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Trash } from 'lucide-react';
import CustomerForm from './CustomerForm';
import CustomerPurchaseHistory from './CustomerPurchaseHistory';
import CustomerNotes from './CustomerNotes';
import BusinessNoticeGenerator from './BusinessNoticeGenerator';
import SMSNoticeDialog from './SMSNoticeDialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSalesData } from '@/hooks/useSalesData';
import { useAuth } from '@/components/auth/AuthProvider';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { formatNumber } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { canSendSMS, getBirthdayMessage, openSMSApp, openWhatsApp, formatMessageForSMS } from '@/utils/smsUtils';
import { useToast } from '@/hooks/use-toast';
import PaymentReminderNotice from './PaymentReminderNotice';
import { useBusiness } from '@/contexts/BusinessContext';
import { useCustomerLifetimeStats } from '@/hooks/useCustomerLifetimeStats';
import { createReceiptAction } from '@/app/actions/sales';
import { generateReceiptNumber } from '@/utils/generateReceiptNumber';

interface LedgerEntry {
  date: Date;
  details: string;
  amount: number;
  type: 'sale' | 'payment';
  id?: string;
  originalSale?: Sale;
  isInstallment?: boolean;
  isManualPayment?: boolean;
  createdAt?: Date;
}

interface CustomerDetailProps {
  customer: Customer;
  onUpdate: (data: Partial<Customer>) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  canEdit?: boolean;
  canDelete?: boolean;
}

const CustomerDetail: React.FC<CustomerDetailProps> = ({
  customer,
  onUpdate,
  onDelete,
  canEdit = true,
  canDelete = true
}) => {
  // Statement feature state and ref
  const statementTableRef = React.useRef<HTMLDivElement>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [manualChargeOpen, setManualChargeOpen] = useState(false);
  const [manualPaymentOpen, setManualPaymentOpen] = useState(false);
  const [isProcessingEntry, setIsProcessingEntry] = useState(false);

  // Helper to get statement sales for this customer, excluding quotes
  const getStatementSales = () => sales.filter(sale => {
    const status = (sale.paymentStatus || '').toString().toUpperCase();
    const saleDate = new Date(sale.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (end) end.setHours(23, 59, 59, 999);
    const isWithinRange = (!start || saleDate >= start) &&
      (!end || saleDate <= end);
    return sale.customerName.toLowerCase() === customer.fullName.toLowerCase() && status !== 'QUOTE' && isWithinRange;
  });

  // Helper to get paid amount for a sale
  const getPaidAmount = (sale: Sale) => {
    // Normalize payment status for case-insensitive match
    const status = (sale.paymentStatus || '').toString().toUpperCase();
    // Use Sale.amountPaid if present, else fallback to amountPaid (typed match)
    if (typeof sale.amountPaid === 'number') return sale.amountPaid;
    
    // If installment sale, sum payments from sale.installments if present
    if (status === 'INSTALLMENT SALE' && Array.isArray(sale.installments)) {
      return (sale.installments as Array<{ amountPaid?: number }>).reduce((sum: number, inst) => sum + (inst.amountPaid || 0), 0);
    }
    // If paymentStatus is Paid, assume full amount paid
    if (status === 'PAID') {
      return sale.items.reduce((sum: number, item: SaleItem) => sum + item.price * item.quantity, 0);
    }
    return 0;
  };


  // Export CSV handler
  const handleExportStatementCSV = () => {
    const allCustomerSales = sales.filter(sale =>
      sale.customerName.toLowerCase() === customer.fullName.toLowerCase() &&
      (sale.paymentStatus || '').toString().toUpperCase() !== 'QUOTE'
    );

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

    let openingBalance = 0;
    if (start) {
      allCustomerSales.forEach(sale => {
        const saleDate = new Date(sale.date);
        if (saleDate < start) {
          openingBalance += sale.items.reduce((sum: number, item: SaleItem) => sum + item.price * item.quantity, 0);
          openingBalance -= getPaidAmount(sale);
        }
      });
    }

    const ledgerEntries: LedgerEntry[] = [];
    allCustomerSales.forEach(sale => {
      // Add sale
      const status = (sale.paymentStatus || '').toString().toUpperCase();
      let label = 'Receipt #';
      if (status === 'QUOTE') label = 'Quote #';
      else if (status === 'NOT PAID' || status === 'PARTIAL') label = 'Invoice #';
      else if (sale.receiptNumber.startsWith('ADJ-')) label = 'Adjustment #';

      ledgerEntries.push({
        date: new Date(sale.date),
        details: `${label}${sale.receiptNumber}`,
        amount: sale.items.reduce((sum: number, item: SaleItem) => sum + item.price * item.quantity, 0),
        type: 'sale'
      });

      // Add payments
      if (status === 'INSTALLMENT SALE' && Array.isArray(sale.installments)) {
        sale.installments.forEach(inst => {
          const pAmount = inst.amountPaid || 0;
          if (pAmount > 0) {
            ledgerEntries.push({
              date: inst.date ? new Date(inst.date) : new Date(sale.date),
              details: 'Payment',
              amount: -pAmount,
              type: 'payment'
            });
          }
        });
      } else {
        const paid = getPaidAmount(sale);
        if (paid > 0) {
          ledgerEntries.push({
            date: new Date(sale.date),
            details: 'Payment',
            amount: -paid,
            type: 'payment'
          });
        }
      }
    });

    ledgerEntries.sort((a, b) => {
      const dateComparison = a.date.getTime() - b.date.getTime();
      if (dateComparison !== 0) return dateComparison;
      return (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
    });

    const headers = ['Date', 'Details', 'Amount', 'Balance'];
    const rows = [];
    let runningBalance = openingBalance;

    if (start) {
      rows.push([format(start, 'yyyy-MM-dd'), 'Opening Balance', '-', runningBalance]);
    }

    ledgerEntries.forEach(entry => {
      const isWithinRange = (!start || entry.date >= start) && (!end || entry.date <= end);
      runningBalance += entry.amount;

      if (isWithinRange) {
        rows.push([
          format(entry.date, 'yyyy-MM-dd'),
          entry.details,
          entry.amount,
          runningBalance
        ]);
      }
    });

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `customer_statement_${customer.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF handler (uses new jsPDF-based layout utility)
  const handleExportStatementPDF = async () => {
    const allCustomerSales = sales.filter(sale =>
      sale.customerName.toLowerCase() === customer.fullName.toLowerCase() &&
      (sale.paymentStatus || '').toString().toUpperCase() !== 'QUOTE'
    );

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

    let openingBalance = 0;
    if (start) {
      allCustomerSales.forEach(sale => {
        const saleDate = new Date(sale.date);
        if (saleDate < start) {
          openingBalance += sale.items.reduce((sum: number, item: SaleItem) => sum + item.price * item.quantity, 0);
          openingBalance -= getPaidAmount(sale);
        }
      });
    }

    const ledgerEntries: LedgerEntry[] = [];
    allCustomerSales.forEach(sale => {
      const status = (sale.paymentStatus || '').toString().toUpperCase();
      let label = 'Receipt #';
      if (status === 'QUOTE') label = 'Quote #';
      else if (status === 'NOT PAID' || status === 'PARTIAL') label = 'Invoice #';
      else if (sale.receiptNumber.startsWith('ADJ-')) label = 'Adjustment #';

      ledgerEntries.push({
        date: new Date(sale.date),
        details: `${label}${sale.receiptNumber}`,
        amount: sale.items.reduce((sum: number, item: SaleItem) => sum + item.price * item.quantity, 0),
        type: 'sale'
      });

      // Add payments
      if (status === 'INSTALLMENT SALE' && Array.isArray(sale.installments)) {
        sale.installments.forEach(inst => {
          const pAmount = inst.amountPaid || 0;
          if (pAmount > 0) {
            ledgerEntries.push({
              date: inst.date ? new Date(inst.date) : new Date(sale.date),
              details: 'Payment',
              amount: -pAmount,
              type: 'payment'
            });
          }
        });
      } else {
        const paid = getPaidAmount(sale);
        if (paid > 0) {
          ledgerEntries.push({
            date: new Date(sale.date),
            details: 'Payment',
            amount: -paid,
            type: 'payment'
          });
        }
      }
    });

    ledgerEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

    const rows = [];
    let runningBalance = openingBalance;

    if (start) {
      rows.push({
        date: start.toISOString(),
        details: 'Opening Balance',
        amount: openingBalance,
        paid: 0,
        balance: openingBalance
      });
    }

    ledgerEntries.forEach(entry => {
      const isWithinRange = (!start || entry.date >= start) && (!end || entry.date <= end);
      runningBalance += entry.amount;

      if (isWithinRange) {
        rows.push({
          date: entry.date.toISOString(),
          details: entry.details,
          amount: entry.amount > 0 ? entry.amount : 0,
          paid: entry.amount < 0 ? Math.abs(entry.amount) : 0,
          balance: runningBalance
        });
      }
    });

    const { generateStatementPDF } = await import('@/utils/generateStatementPDF');
    await generateStatementPDF(rows, {
      filename: `customer_statement_${customer.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`,
      orientation: 'portrait',
      format: 'a4',
      margins: { top: 15, right: 15, bottom: 15, left: 15 },
      currency: settings.currency,
      customerName: customer.fullName
    });
  };
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noticeDialogOpen, setNoticeDialogOpen] = useState(false);
  const [smsDialogOpen, setSMSDialogOpen] = useState(false);
  const { user } = useAuth();
  
  // Only load recent sales for the purchase history list, not for lifetime totals
  const { sales, isLoading, deleteSale, refetch } = useSalesData(user?.id, 'desc', 50);
  
  const { data: lifetimeStats, isLoading: isLoadingLifetimeStats } = useCustomerLifetimeStats(customer.fullName);
  
  const { currentBusiness } = useBusiness();
  const { settings } = useBusinessSettings();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [creditSales, setCreditSales] = useState<{ total: number, count: number } | null>(null);

  useEffect(() => {
    const calculateCreditData = () => {
      try {
        if (customer && !isLoading) {
          // Calculate credit sales (unpaid sales only) from the loaded chunk of sales
          // Note: If customer has > 50 sales, this might be incomplete. 
          // Ideally we need a server-side action for total credit balance too.
          const customerSales = sales.filter(sale =>
            sale.customerName.toLowerCase() === customer.fullName.toLowerCase()
          );

          const unpaidSales = customerSales.filter(sale =>
            sale.paymentStatus === "NOT PAID"
          );

          const creditTotal = unpaidSales.reduce((sum, sale) => sum + sale.total, 0);

          setCreditSales({
            total: creditTotal,
            count: unpaidSales.length
          });
        } else {
          setCreditSales({ total: 0, count: 0 });
        }
      } catch (error) {
        console.error("Error calculating credit data:", error);
        setCreditSales({ total: 0, count: 0 });
      } finally {
      }
    };

    calculateCreditData();
  }, [customer, sales, isLoading]);

  const formatCurrency = (value: number) => {
    return `${settings.currency} ${formatNumber(value)}`;
  };

  const handleUpdate = async (data: Partial<Customer>) => {
    console.log('Customer update data received in detail view:', data);

    // Create a clean copy of the data to avoid reference issues
    const updatedData = { ...data };

    // Make sure birthday is properly handled if it exists
    if (updatedData.birthday) {
      console.log('Birthday before update:', updatedData.birthday);

      // Ensure it's a valid Date object
      if (!(updatedData.birthday instanceof Date) || isNaN(updatedData.birthday.getTime())) {
        console.log('Converting birthday to valid Date object');

        // If it's a string, convert it to a Date at UTC noon
        if (typeof updatedData.birthday === 'string') {
          // Type-safe string handling
          const birthdayString = updatedData.birthday as string;
          const dateParts = birthdayString.split('-');
          if (dateParts.length === 3) {
            const [year, month, day] = dateParts.map(Number);
            updatedData.birthday = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
          } else {
            // Handle invalid string format
            console.error('Invalid birthday string format');
            updatedData.birthday = null;
          }
        } else {
          // Handle other non-Date, non-string types
          console.error('Birthday is not a Date or string:', typeof updatedData.birthday);
          updatedData.birthday = null;
        }
      }
    }

    const success = await onUpdate(updatedData);
    if (success) {
      setEditDialogOpen(false);
    }
    return success;
  };

  const handleDelete = async () => {
    const success = await onDelete();
    if (success) {
      setDeleteDialogOpen(false);
    }
    return success;
  };

  const showSMSOption = isMobile && canSendSMS(customer);
  const showWhatsAppOption = canSendSMS(customer);

  // Check if customer has birthday and it's their birthday month or within a few days
  const hasBirthday = customer.birthday !== null;
  const isBirthdayToday = customer.birthday &&
    new Date().toDateString() === customer.birthday.toDateString();
  const isBirthdayThisMonth = customer.birthday &&
    new Date().getMonth() === customer.birthday.getMonth();

  const handleSendBirthdayWishes = (method: 'sms' | 'whatsapp') => {
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
    <div className="space-y-6">
      {/* Payment Reminder Notice - Show only if there are credit sales */}
      {creditSales && creditSales.count > 0 && (
        <PaymentReminderNotice
          customer={customer}
          unpaidSales={sales.filter(sale =>
            sale.customerName.toLowerCase() === customer.fullName.toLowerCase() &&
            sale.paymentStatus === "NOT PAID"
          )}
          totalAmountDue={creditSales.total}
        />
      )}

      {/* Birthday Notice - Show if customer has birthday and it's their birthday month */}
      {hasBirthday && isBirthdayThisMonth && (showSMSOption || showWhatsAppOption) && (
        <Card className="border-pink-200 bg-gradient-to-r from-pink-50 to-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-500 rounded-lg">
                  <Cake className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-pink-900">
                    {isBirthdayToday ? "🎉 It's their birthday today!" : "Birthday this month"}
                  </h3>
                  <p className="text-sm text-pink-700">
                    {customer.birthday && format(customer.birthday, 'MMMM d')} - Send birthday wishes
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {showSMSOption && (
                  <Button
                    size="sm"
                    onClick={() => handleSendBirthdayWishes('sms')}
                    className="bg-pink-500 hover:bg-pink-600 text-white"
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    SMS Wishes
                  </Button>
                )}
                {showWhatsAppOption && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSendBirthdayWishes('whatsapp')}
                    className="border-green-500 text-green-700 hover:bg-green-50"
                  >
                    📱 WhatsApp
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{customer.fullName}</CardTitle>
              <CardDescription>
                Customer since {format(customer.createdAt, 'MMMM d, yyyy')}
              </CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              {showSMSOption && (
                <Button variant="outline" size="sm" onClick={() => setSMSDialogOpen(true)}>
                  <MessageSquare className="h-4 w-4 mr-1" />
                  SMS
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setNoticeDialogOpen(true)}>
                <FileText className="h-4 w-4 mr-1" />
                Send Notice
              </Button>
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              {canDelete && (
                <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-500 mb-2">Contact Information</h3>
                <div className="space-y-2">
                  {customer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">
                        {customer.email}
                      </a>
                    </div>
                  )}
                  {customer.phoneNumber && (
                    <div className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <a href={`tel:${customer.phoneNumber}`} className="text-blue-600 hover:underline">
                          {customer.phoneNumber}
                        </a>
                      </div>
                      {showSMSOption && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSMSDialogOpen(true)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1 h-auto"
                          title="Send SMS"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                  {customer.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{customer.location}</span>
                    </div>
                  )}
                </div>
              </div>

              {customer.birthday && (
                <div>
                  <h3 className="font-medium text-gray-500 mb-2">Birthday</h3>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{format(customer.birthday, 'MMMM d')}</span>
                  </div>
                </div>
              )}

              {customer.socialMedia && Object.keys(customer.socialMedia).length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-500 mb-2">Social Media</h3>
                  <div className="space-y-1">
                    {Object.entries(customer.socialMedia).map(([platform, handle]) => (
                      handle && (
                        <div key={platform} className="flex items-center gap-2">
                          <span className="capitalize">{platform}:</span>
                          <span className="text-blue-600">{handle}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Lifetime Purchases Section - Updated with credit sales */}
              <div>
                <h3 className="font-medium text-gray-500 mb-2">Purchase Summary</h3>
                {isLoadingLifetimeStats ? (
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin text-gray-500" />
                    <span>Loading purchase data...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-gray-400" />
                      <span>
                        <strong>Lifetime Purchases:</strong> {lifetimeStats?.count || 0} orders totaling {formatCurrency(lifetimeStats?.total || 0)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-red-400" />
                      <span>
                        <strong>Total Credit Sales:</strong> {creditSales?.count || 0} unpaid orders totaling {formatCurrency(creditSales?.total || 0)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      * Quotes are excluded from totals
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {customer.tags && customer.tags.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-500 mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-1">
                    {customer.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="bg-blue-50">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {customer.gender && (
                <div>
                  <h3 className="font-medium text-gray-500 mb-2">Gender</h3>
                  <span className="capitalize">{customer.gender}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="purchases" className="w-full">
        <TabsList>
          <TabsTrigger value="purchases">Purchase History</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="statement">Statement</TabsTrigger>
        </TabsList>
        <TabsContent value="purchases">
          <CustomerPurchaseHistory customerId={customer.id} customerNameProp={customer.fullName} />
        </TabsContent>
        <TabsContent value="notes">
          <CustomerNotes
            notes={customer.notes || ''}
            onSave={(notes) => onUpdate({ notes })}
          />
        </TabsContent>
        <TabsContent value="statement">
          <div ref={statementTableRef} className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h3 className="font-bold text-xl text-gray-800">Customer Statement</h3>
                <p className="text-sm text-gray-500">Transaction history and balance</p>
              </div>

              <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                <div className="flex items-center gap-2">
                  <Label htmlFor="statement-start" className="text-xs font-medium text-gray-500">From:</Label>
                  <Input
                    id="statement-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9 text-xs w-36"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="statement-end" className="text-xs font-medium text-gray-500">To:</Label>
                  <Input
                    id="statement-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9 text-xs w-36"
                  />
                </div>
                <div className="flex gap-2 ml-auto">
                  {canEdit && (
                    <>
                      <Button size="sm" variant="outline" className="bg-red-50 text-red-700 border-red-200" onClick={() => setManualChargeOpen(true)}>Add Charge</Button>
                      <Button size="sm" variant="outline" className="bg-green-50 text-green-700 border-green-200" onClick={() => setManualPaymentOpen(true)}>Add Payment</Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" onClick={handleExportStatementCSV}>CSV</Button>
                  <Button size="sm" variant="outline" onClick={handleExportStatementPDF}>PDF</Button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="px-4 py-3 text-left font-semibold first:rounded-tl-lg">Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Details (Receipt/Invoice)</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount</th>
                    <th className="px-4 py-3 text-right font-semibold">Balance</th>
                    <th className="px-4 py-3 text-center font-semibold last:rounded-tr-lg">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(() => {
                    const allCustomerSales = sales.filter(sale =>
                      sale.customerName.toLowerCase() === customer.fullName.toLowerCase() &&
                      (sale.paymentStatus || '').toString().toUpperCase() !== 'QUOTE'
                    );

                    const startValue = startDate ? new Date(startDate) : null;
                    const endValue = endDate ? new Date(endDate) : null;
                    if (endValue) endValue.setHours(23, 59, 59, 999);

                    // Calculate opening balance (all transactions before start date)
                    let openingBalance = 0;
                    if (startValue) {
                      allCustomerSales.forEach(sale => {
                        const saleDate = new Date(sale.date);
                        if (saleDate < startValue) {
                          const amount = sale.items.reduce((sum: number, item: SaleItem) => sum + item.price * item.quantity, 0);
                          openingBalance += amount;
                          openingBalance -= getPaidAmount(sale);
                        }
                      });
                    }

                    const statementSales = allCustomerSales.filter(sale => {
                      const saleDate = new Date(sale.date);
                      return (!startValue || saleDate >= startValue) && (!endValue || saleDate <= endValue);
                    });

                    const sortedSales = [...statementSales].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                    let runningBalance = openingBalance;
                    const ledgerEntries: LedgerEntry[] = [];

                    // Add sales as entries
                    sortedSales.forEach(sale => {
                      const status = (sale.paymentStatus || '').toString().toUpperCase();
                      let label = 'Receipt #';
                      if (status === 'QUOTE') label = 'Quote #';
                      else if (status === 'NOT PAID' || status === 'PARTIAL') label = 'Invoice #';
                      else if (sale.receiptNumber.startsWith('ADJ-')) label = 'Adjustment #';

                      if (!sale.receiptNumber.startsWith('PAY-')) {
                        ledgerEntries.push({
                          date: new Date(sale.date),
                          details: label + sale.receiptNumber,
                          amount: sale.items.reduce((sum: number, item: SaleItem) => sum + item.price * item.quantity, 0),
                          type: 'sale',
                          id: sale.id,
                          originalSale: sale,
                          createdAt: sale.createdAt
                        });
                      }

                      // Add payments from this sale as entries
                      if (status === 'INSTALLMENT SALE' && Array.isArray(sale.installments)) {
                        sale.installments.forEach((inst, iidx) => {
                          const pAmount = inst.amountPaid || 0;
                          if (pAmount > 0) {
                            ledgerEntries.push({
                              date: inst.date ? new Date(inst.date) : new Date(sale.date),
                              details: 'Payment',
                              amount: -pAmount,
                              type: 'payment',
                              id: `${sale.id}-inst-${iidx}`,
                              originalSale: sale,
                              isInstallment: true,
                              createdAt: sale.createdAt // Using sale creation time as roughly correct for initial payment structure or fallback
                            });
                          }
                        });
                      } else {
                        const paid = getPaidAmount(sale);
                        if (paid > 0) {
                          ledgerEntries.push({
                            date: new Date(sale.date),
                            details: 'Payment',
                            amount: -paid,
                            type: 'payment',
                            id: `${sale.id}-payment`,
                            originalSale: sale,
                            // For non-installment sales, the payment is intrinsic to the sale, so we can't delete it separately easily unless it's a Manual Payment (which is a sale itself)
                            isManualPayment: sale.receiptNumber.startsWith('PAY-'),
                            createdAt: sale.createdAt
                          });
                        }
                      }
                    });

                    // Sort all entries by date, then by creation time
                    ledgerEntries.sort((a, b) => {
                      const dateComparison = a.date.getTime() - b.date.getTime();
                      if (dateComparison !== 0) return dateComparison;
                      return (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
                    });

                    const rows = [];
                    // Add opening balance row
                    if (startValue) {
                      rows.push(
                        <tr key="opening-balance" className="bg-gray-50 italic">
                          <td className="px-4 py-3 text-gray-500">{format(startValue, 'MMM d, yyyy')}</td>
                          <td className="px-4 py-3 text-gray-500 font-medium">Opening Balance</td>
                          <td className="px-4 py-3 text-right text-gray-500">-</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-600">{settings.currency} {openingBalance.toLocaleString()}</td>
                        </tr>
                      );
                    }

                    // Build rows from sorted ledger entries
                    ledgerEntries.forEach((entry) => {
                      const isWithinRange = (!startValue || entry.date >= startValue) && (!endValue || entry.date <= endValue);

                      runningBalance += entry.amount;

                      if (isWithinRange) {
                        const isPayment = entry.type === 'payment';
                        rows.push(
                          <tr key={entry.id} className={isPayment ? "bg-green-50/50 hover:bg-green-50 transition-colors" : "hover:bg-blue-50 transition-colors"}>
                            <td className={`px-4 py-3 ${isPayment ? 'text-green-700 italic' : 'text-gray-600'}`}>
                              {format(entry.date, 'MMM d, yyyy')}
                            </td>
                            <td className={`px-4 py-3 font-medium ${isPayment ? 'text-green-700' : 'text-gray-900'}`}>
                              {entry.details}
                            </td>
                            <td className={`px-4 py-3 text-right ${isPayment ? 'text-green-700' : 'text-gray-900'}`}>
                              {isPayment ? '- ' : ''}{settings.currency} {Math.abs(entry.amount).toLocaleString()}
                            </td>
                            <td className={`px-4 py-3 text-right font-bold ${isPayment ? 'text-green-800' : 'text-gray-900'}`}>
                              {settings.currency} {runningBalance.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={async () => {
                                  if (confirm('Are you sure you want to delete this entry?')) {
                                    try {
                                      if (entry.isInstallment) {
                                        toast({ title: "Notice", description: "Cannot delete installment payment from this view. Please go to the sale details." });
                                      } else if ((entry.type === 'sale' || entry.isManualPayment) && entry.originalSale) {
                                        await deleteSale(entry.originalSale.id);
                                        toast({ title: "Success", description: "Entry deleted" });
                                      } else {
                                        toast({ title: "Notice", description: "Cannot delete this payment directly. Delete the sale instead." });
                                      }
                                    } catch (e) {
                                      console.error(e);
                                      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
                                    }
                                  }
                                }}
                              >
                                <Trash className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </td>
                          </tr>
                        );
                      }
                    });

                    return rows;
                  })()
                  }
                </tbody>
              </table>
            </div>
            {getStatementSales().length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <FileText className="h-12 w-12 mb-3 opacity-20" />
                <p>No transactions found for the selected date range.</p>
              </div>
            )}

            {getStatementSales().length > 0 && (
              <div className="mt-6 flex justify-end">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 min-w-48">
                  <p className="text-xs text-blue-600 font-medium uppercase tracking-wider mb-1">Current Balance</p>
                  <p className="text-2xl font-black text-blue-900">
                    {settings.currency} {(() => {
                      const salesInView = getStatementSales();
                      let bal = 0;
                      salesInView.forEach(s => {
                        const amt = s.items.reduce((sum: number, item: SaleItem) => sum + item.price * item.quantity, 0);
                        bal += amt;
                        bal -= getPaidAmount(s);
                      });
                      return bal.toLocaleString();
                    })()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer information. Click save when you&apos;re done.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[calc(80vh-8rem)]">
            <div className="px-1">
              <CustomerForm
                initialData={customer}
                onSubmit={handleUpdate}
                onCancel={() => setEditDialogOpen(false)}
              />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <BusinessNoticeGenerator
        customer={customer}
        open={noticeDialogOpen}
        onClose={() => setNoticeDialogOpen(false)}
      />

      <SMSNoticeDialog
        customer={customer}
        open={smsDialogOpen}
        onClose={() => setSMSDialogOpen(false)}
        templateId="general_notice"
      />

      {/* Manual Charge Dialog */}
      <Dialog open={manualChargeOpen} onOpenChange={setManualChargeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Manual Charge</DialogTitle>
            <DialogDescription>
              Create a debit adjustment for this customer&apos;s account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const amount = parseFloat((formData.get('amount') as string).replace(/,/g, ''));
            const description = formData.get('description') as string;
            const dateStr = formData.get('date') as string;
            const date = dateStr ? new Date(dateStr) : new Date();

            if (isNaN(amount) || amount <= 0) {
              toast({ title: "Error", description: "Please enter a valid amount.", variant: "destructive" });
              return;
            }

            setIsProcessingEntry(true);
            try {
              const receiptNumber = await generateReceiptNumber(currentBusiness?.id || '');

              const saleData = {
                receiptNumber: `ADJ-${receiptNumber}`,
                customerName: customer.fullName,
                customerId: customer.id,
                date: date.toISOString().split('T')[0],
                items: [{
                  description: description || 'Manual Charge',
                  quantity: 1,
                  price: amount,
                  cost: 0
                }],
                paymentStatus: 'NOT PAID',
                amountPaid: 0,
                amountDue: amount,
                profit: amount,
                taxRate: 0,
                notes: '',
                cashAccountId: undefined,
                paymentDetails: undefined,
                installmentPlan: undefined
              };

              // Use server action to create receipt
              const result = await createReceiptAction(saleData, currentBusiness?.id || '');

              if (!result.success) throw new Error(result.error);

              toast({ title: "Success", description: "Manual charge added successfully." });
              setManualChargeOpen(false);
              await refetch();
            } catch (err: unknown) {
              const error = err as Error;
              console.error(error);
              toast({ title: "Error", description: error.message || "Failed to add charge.", variant: "destructive" });
            } finally {
              setIsProcessingEntry(false);
            }
          }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="charge-date">Date</Label>
                <Input id="charge-date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="charge-desc">Description</Label>
                <Input id="charge-desc" name="description" placeholder="e.g., Service Fee, Penalty" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="charge-amount">Amount ({settings.currency})</Label>
                <Input
                  id="charge-amount"
                  name="amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setManualChargeOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isProcessingEntry}>
                {isProcessingEntry ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Charge
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manual Payment Dialog */}
      <Dialog open={manualPaymentOpen} onOpenChange={setManualPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Manual Payment</DialogTitle>
            <DialogDescription>
              Record a payment or credit to this customer&apos;s balance.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const amount = parseFloat((formData.get('amount') as string).replace(/,/g, ''));
            const description = formData.get('description') as string;
            const dateStr = formData.get('date') as string;
            const date = dateStr ? new Date(dateStr) : new Date();

            if (isNaN(amount) || amount <= 0) {
              toast({ title: "Error", description: "Please enter a valid amount.", variant: "destructive" });
              return;
            }

            setIsProcessingEntry(true);
            try {
              const receiptNumber = await generateReceiptNumber(currentBusiness?.id || '');

              const saleData = {
                receiptNumber: `PAY-${receiptNumber}`,
                customerName: customer.fullName,
                customerId: customer.id,
                date: date.toISOString().split('T')[0],
                items: [{
                  description: description || 'Account Payment',
                  quantity: 1,
                  price: 0,
                  cost: 0
                }],
                paymentStatus: 'PAID',
                amountPaid: amount,
                amountDue: 0,
                profit: 0,
                taxRate: 0,
                notes: '',
                cashAccountId: undefined, // Add logic here if payment is bound to an account later
                paymentDetails: undefined,
                installmentPlan: undefined
              };

              // Use server action to create receipt
              const result = await createReceiptAction(saleData, currentBusiness?.id || '');

              if (!result.success) throw new Error(result.error);

              toast({ title: "Success", description: "Manual payment recorded successfully." });
              setManualPaymentOpen(false);
              await refetch();
            } catch (err: unknown) {
              const error = err as Error;
              console.error(error);
              toast({ title: "Error", description: error.message || "Failed to record payment.", variant: "destructive" });
            } finally {
              setIsProcessingEntry(false);
            }
          }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="pay-date">Date</Label>
                <Input id="pay-date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-desc">Description</Label>
                <Input id="pay-desc" name="description" placeholder="e.g., Cash Payment, Discount, Waiver" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-amount">Amount ({settings.currency})</Label>
                <Input
                  id="pay-amount"
                  name="amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setManualPaymentOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isProcessingEntry}>
                {isProcessingEntry ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Payment
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete customer
              &quot;{customer.fullName}&quot; and remove their data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CustomerDetail;
