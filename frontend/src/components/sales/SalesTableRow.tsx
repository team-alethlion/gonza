"use client";
import React from 'react';
import { format } from 'date-fns';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, Edit, Trash2, FileText, Heart, MessageSquare, RotateCcw } from 'lucide-react';
import { useProfiles } from '@/contexts/ProfileContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sale } from '@/types';
import { formatNumber } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { canSendSMS } from '@/utils/smsUtils';
import { useFinancialVisibility } from '@/hooks/useFinancialVisibility';

interface SalesTableRowProps {
  sale: Sale;
  currency: string;
  onViewReceipt: (sale: Sale) => void;
  onEditSale: (sale: Sale) => void;
  onDeleteSale: (sale: Sale, reason?: string) => void;
  onProcessReturn?: (sale: Sale) => void;
  onSendPaymentReminder: (sale: Sale) => void;
  onSendThankYouNotice?: (sale: Sale) => void;
  onSendPaymentReminderSMS?: (sale: Sale) => void;
  onSendThankYouSMS?: (sale: Sale) => void;
  // Hoisted props for performance
  isMobile: boolean;
  canViewCostPrice: boolean;
  canViewProfit: boolean;
  canEditSale: boolean;
  canDeleteSale: boolean;
  formatFinancial: (value: number | null | undefined, type: "cost" | "selling" | "profit") => string;
}

const SalesTableRow: React.FC<SalesTableRowProps> = React.memo(({
  sale,
  currency,
  onViewReceipt,
  onEditSale,
  onDeleteSale,
  onProcessReturn,
  onSendPaymentReminder,
  onSendThankYouNotice,
  onSendPaymentReminderSMS,
  onSendThankYouSMS,
  isMobile,
  canViewCostPrice,
  canViewProfit,
  canEditSale,
  canDeleteSale,
  formatFinancial
}) => {
  const totalQuantity = sale.totalQuantity ?? 0;
  const averagePrice = totalQuantity > 0 ? (sale.subtotal + sale.discount) / totalQuantity : 0;

  const totalCost = sale.totalCost;
  const saleTotal = sale.total;
  const profit = sale.profit;
  const totalDiscount = sale.discount;

  const itemsDescription = sale.itemDescription || "No items";

  // Use pre-resolved cash account name from backend
  const cashAccountName = sale.cashAccountName;

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
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'Quote':
      case 'QUOTE':
        return 'bg-purple-100 text-purple-800';
      case 'Installment Sale':
      case 'INSTALLMENT':
        return 'bg-blue-100 text-blue-800';
      case 'REFUNDED':
        return 'bg-red-100 text-red-800';
      case 'NOT PAID':
      case 'UNPAID':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  // 🚀 PERFORMANCE FIX: Use pre-fetched amounts from the sale object instead of making new requests per row
  const actualAmountPaid = sale.amountPaid || 0;
  const actualAmountDue = sale.amountDue || 0;

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
          {canViewProfit ? `${currency} ${formatNumber(profit)}` : '•••'}
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

          {onProcessReturn && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onProcessReturn(sale);
              }}
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              title="Process Return"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="sr-only">Process Return</span>
            </Button>
          )}

          {canEditSale && (
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
          {canDeleteSale && (
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
});

SalesTableRow.displayName = 'SalesTableRow';

export default SalesTableRow;
