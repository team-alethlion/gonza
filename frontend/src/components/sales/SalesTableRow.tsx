"use client";
import React from 'react';
import { format } from 'date-fns';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, Edit, Trash2, FileText, Heart, MessageSquare } from 'lucide-react';
import { useProfiles } from '@/contexts/ProfileContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sale } from '@/types';
import { formatNumber } from '@/lib/utils';
import { useCashAccounts } from '@/hooks/useCashAccounts';
import { useCashTransactions } from '@/hooks/useCashTransactions';
import { useIsMobile } from '@/hooks/use-mobile';
import { canSendSMS } from '@/utils/smsUtils';
import { useInstallmentPayments } from '@/hooks/useInstallmentPayments';
import { useFinancialVisibility } from '@/hooks/useFinancialVisibility';

interface SalesTableRowProps {
  sale: Sale;
  currency: string;
  onViewReceipt: (sale: Sale) => void;
  onEditSale: (sale: Sale) => void;
  onDeleteSale: (sale: Sale) => void;
  onSendPaymentReminder?: (sale: Sale) => void;
  onSendThankYouNotice?: (sale: Sale) => void;
  onSendPaymentReminderSMS?: (sale: Sale) => void;
  onSendThankYouSMS?: (sale: Sale) => void;
}

const SalesTableRow: React.FC<SalesTableRowProps> = ({
  sale,
  currency,
  onViewReceipt,
  onEditSale,
  onDeleteSale,
  onSendPaymentReminder,
  onSendThankYouNotice,
  onSendPaymentReminderSMS,
  onSendThankYouSMS
}) => {
  const { accounts } = useCashAccounts();
  const { transactions } = useCashTransactions();
  const isMobile = useIsMobile();
  const { payments } = useInstallmentPayments(sale.id);
  const { hasPermission } = useProfiles();
  const { formatFinancial, canViewCostPrice, canViewProfit } = useFinancialVisibility();

  const totalQuantity = sale.items.reduce((total, item) => total + item.quantity, 0);
  const averagePrice = totalQuantity > 0 ? (sale.subtotal + sale.discount) / totalQuantity : 0;

  const subtotal = sale.subtotal;
  const totalDiscount = sale.discount;
  const taxAmount = sale.taxAmount;
  const saleTotal = sale.total;
  const totalCost = sale.totalCost;

  // Improved cash account name resolution with better logging
  const getCashAccountName = () => {
    if (!sale.cashTransactionId) {
      console.log('No cash transaction ID for sale:', sale.id);
      return null;
    }

    console.log('Looking for transaction with ID:', sale.cashTransactionId);
    console.log('Available transactions count:', transactions.length);

    // Find the transaction linked to this sale
    const linkedTransaction = transactions.find(transaction => transaction.id === sale.cashTransactionId);
    if (!linkedTransaction) {
      console.log('No linked transaction found for sale:', sale.id, 'transaction ID:', sale.cashTransactionId);
      console.log('All transaction IDs:', transactions.map(t => t.id));
      return null;
    }

    console.log('Found linked transaction:', linkedTransaction);

    if (!linkedTransaction.accountId) {
      console.log('Linked transaction has no accountId:', linkedTransaction);
      return null;
    }

    // Find the account linked to the transaction
    const linkedAccount = accounts.find(account => account.id === linkedTransaction.accountId);
    if (!linkedAccount) {
      console.log('No linked account found for accountId:', linkedTransaction.accountId);
      console.log('Available accounts:', accounts.map(a => ({ id: a.id, name: a.name })));
      return null;
    }

    console.log('Successfully resolved cash account:', linkedAccount.name);
    return linkedAccount.name;
  };

  let itemsDescription = "No items";
  if (sale.items && Array.isArray(sale.items) && sale.items.length > 0) {
    itemsDescription = sale.items[0].description;
    if (sale.items.length > 1) {
      itemsDescription += ` (+${sale.items.length - 1} more)`;
    }
  }

  const cashAccountName = getCashAccountName();

  // Determine display status
  const getDisplayStatus = () => {
    if (sale.paymentStatus === 'Installment Sale') {
      return 'Installment';
    }
    return sale.paymentStatus;
  };

  // Get status styling
  const getStatusStyling = () => {
    switch (sale.paymentStatus) {
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Quote':
        return 'bg-purple-100 text-purple-800';
      case 'Installment Sale':
        return 'bg-blue-100 text-blue-800';
      case 'NOT PAID':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  // Calculate actual amounts for installment sales based on payment history
  const actualAmountPaid = sale.paymentStatus === 'Installment Sale'
    ? payments.reduce((sum, payment) => sum + payment.amount, 0)
    : sale.amountPaid || 0;

  const actualAmountDue = sale.paymentStatus === 'Installment Sale'
    ? Math.max(0, saleTotal - actualAmountPaid)
    : sale.amountDue || 0;

  // Check if this is a credit sale that needs payment reminder (exclude installment sales)
  const isCreditSale = sale.paymentStatus === 'NOT PAID';

  // Check if this is an installment sale with outstanding balance
  const isInstallmentWithDue = sale.paymentStatus === 'Installment Sale' && actualAmountDue > 0;

  // Create a customer-like object for SMS checking
  const customerForSMS = {
    phoneNumber: sale.customerContact || null
  };

  const canSendSMSToCustomer = canSendSMS(customerForSMS);
  const showSMSOptions = isMobile && canSendSMSToCustomer;

  return (
    <TableRow
      className="cursor-pointer hover:bg-gray-50"
      onClick={() => onViewReceipt(sale)}
    >
      <TableCell className="font-medium">
        {format(new Date(sale.date), 'dd/MM/yyyy')}
      </TableCell>
      <TableCell>{sale.receiptNumber}</TableCell>
      <TableCell>
        <div className="space-y-1">
          <div>{sale.customerName}</div>
          {cashAccountName && (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              {cashAccountName}
            </Badge>
          )}
          {sale.paymentStatus === 'Installment Sale' && actualAmountDue > 0 && (
            <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
              Due: {currency} {formatNumber(actualAmountDue)}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="line-clamp-1 cursor-help">
              {itemsDescription}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-bold break-words whitespace-normal">{itemsDescription}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TableCell>
      <TableCell className="text-right">{totalQuantity}</TableCell>
      <TableCell className="text-right">
        {currency} {formatNumber(averagePrice)}
      </TableCell>
      <TableCell className="text-right">
        {totalDiscount > 0 ? (
          <span className="text-orange-600">
            -{currency} {formatNumber(totalDiscount)}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {canViewCostPrice ? `${currency} ${formatFinancial(totalCost, 'cost')}` : '•••'}
      </TableCell>
      <TableCell className="text-right">
        <span className="text-green-600 font-medium">
          {canViewProfit ? `${currency} ${formatNumber(saleTotal - totalCost)}` : '•••'}
        </span>
      </TableCell>
      <TableCell className="text-right">
        {currency} {formatNumber(saleTotal)}
        {sale.paymentStatus === 'Installment Sale' && actualAmountPaid > 0 && (
          <div className="text-xs text-green-600">
            Paid: {currency} {formatNumber(actualAmountPaid)}
          </div>
        )}
      </TableCell>
      <TableCell>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyling()}`}
        >
          {getDisplayStatus()}
        </span>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onViewReceipt(sale);
            }}
          >
            <Printer className="h-4 w-4" />
            <span className="sr-only">View Receipt</span>
          </Button>

          {isCreditSale && onSendPaymentReminder && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSendPaymentReminder(sale);
              }}
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              title="Send Payment Reminder"
            >
              <FileText className="h-4 w-4" />
              <span className="sr-only">Send Payment Reminder</span>
            </Button>
          )}

          {isInstallmentWithDue && onSendPaymentReminder && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSendPaymentReminder(sale);
              }}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              title="Send Due Payment Reminder"
            >
              <FileText className="h-4 w-4" />
              <span className="sr-only">Send Due Payment Reminder</span>
            </Button>
          )}

          {isCreditSale && showSMSOptions && onSendPaymentReminderSMS && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSendPaymentReminderSMS(sale);
              }}
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              title="Send Payment Reminder SMS"
            >
              <MessageSquare className="h-3 w-3" />
              <span className="sr-only">Send Payment Reminder SMS</span>
            </Button>
          )}

          {onSendThankYouNotice && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSendThankYouNotice(sale);
              }}
              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
              title="Send Thank You Notice"
            >
              <Heart className="h-4 w-4" />
              <span className="sr-only">Send Thank You Notice</span>
            </Button>
          )}

          {showSMSOptions && onSendThankYouSMS && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSendThankYouSMS(sale);
              }}
              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
              title="Send Thank You SMS"
            >
              <MessageSquare className="h-3 w-3" />
              <span className="sr-only">Send Thank You SMS</span>
            </Button>
          )}

          {hasPermission('sales', 'edit') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEditSale(sale);
              }}
            >
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit Sale</span>
            </Button>
          )}
          {hasPermission('sales', 'delete') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSale(sale);
              }}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete Sale</span>
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

export default SalesTableRow;
