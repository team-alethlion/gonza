"use client";

import React, { useRef, useEffect, useState } from 'react';
import { Sale, BusinessSettings } from '@/types';
import { format } from 'date-fns';
import { formatNumber } from '@/lib/utils';
import { parsePaymentInfo, useBusinessSettings } from '@/hooks/useBusinessSettings';
import { numberToWords } from '@/utils/numberToWords';
import { useInstallmentPayments } from '@/hooks/useInstallmentPayments';

interface ThermalReceiptProps {
  sale: Sale;
  currency?: string;
  includePaymentInfo?: boolean;
}

const ThermalReceipt: React.FC<ThermalReceiptProps> = ({
  sale,
  currency,
  includePaymentInfo = true
}) => {
  const { settings, isLoading: settingsLoading } = useBusinessSettings();
  const { payments } = useInstallmentPayments(sale.id);

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center p-12 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-sm text-gray-500 font-mono">Preparing receipt...</p>
        </div>
      </div>
    );
  }

  const getDocumentTitle = () => {
    switch (sale.paymentStatus) {
      case 'Quote': return 'QUOTATION';
      case 'Paid': return 'SALES RECEIPT';
      case 'Installment Sale': return 'INSTALLMENT SALE';
      case 'NOT PAID':
      default: return 'INVOICE';
    }
  };

  const getDocumentNumberLabel = () => {
    switch (sale.paymentStatus) {
      case 'Quote': return 'Quote #:';
      case 'Paid': return 'Receipt #:';
      case 'Installment Sale': return 'Installment #:';
      default: return 'Invoice #:';
    }
  };

  const subtotalBeforeDiscount = sale.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  const totalDiscountAmount = sale.items.reduce((total, item) => {
    const itemSubtotal = item.price * item.quantity;
    const discountAmount = item.discountType === 'amount'
      ? (item.discountAmount || 0)
      : (itemSubtotal * (item.discountPercentage || 0)) / 100;
    return total + discountAmount;
  }, 0);

  const subtotalAfterDiscount = subtotalBeforeDiscount - totalDiscountAmount;
  const taxRate = sale.taxRate || 0;
  const taxAmount = subtotalAfterDiscount * (taxRate / 100);
  const totalAmount = subtotalAfterDiscount + taxAmount;
  const totalPaidFromHistory = (payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);

  const displayAmountPaid = sale.paymentStatus === 'Installment Sale' || (sale.paymentStatus === 'Paid' && totalPaidFromHistory > 0)
    ? totalPaidFromHistory
    : (sale.amountPaid || totalAmount);

  const displayAmountDue = sale.paymentStatus === 'Installment Sale'
    ? Math.max(0, totalAmount - totalPaidFromHistory)
    : (sale.amountDue || 0);

  const paymentMethods = settings.paymentInfo ? parsePaymentInfo(settings.paymentInfo) : [];
  const hasPaymentInfo = includePaymentInfo &&
    paymentMethods.length > 0 &&
    paymentMethods.some(pm => pm.method.trim() !== '' || pm.accountNumber.trim() !== '' || pm.accountName.trim() !== '');

  const displayCurrency = currency || settings.currency;
  const receiptDate = new Date(sale.date);
  const currentDateTime = new Date();

  return (
    <div className="flex justify-center bg-gray-100 p-4 sm:p-8 overflow-hidden">
      {/* Simulation of Thermal Paper */}
      <div
        className="relative bg-white shadow-2xl font-mono text-[11px] leading-tight text-black flex flex-col mx-auto"
        style={{
          width: '58mm',
          minHeight: '140mm',
          padding: '6mm 4mm',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          borderTop: '1px dashed #e5e7eb',
          borderBottom: '1px dashed #e5e7eb',
        }}
      >
        {/* Serrated Edge Pattern (Top) */}
        <div className="absolute top-0 left-0 w-full h-1 overflow-hidden flex" style={{ opacity: 0.2 }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="w-4 h-4 bg-gray-300 transform rotate-45 -translate-y-2 translate-x-1" />
          ))}
        </div>

        {/* Header Section */}
        <div className="flex flex-col items-center mb-4 text-center">
          {settings.businessLogo && (
            <div className="mb-2 w-full flex justify-center">
              <img
                src={settings.businessLogo}
                alt="Logo"
                className="h-12 w-auto object-contain max-w-[40mm]"
              />
            </div>
          )}
          <div className="text-[14px] font-black uppercase tracking-tight mb-0.5">{settings.businessName}</div>
          <div className="text-[9px] font-bold opacity-80">{settings.businessAddress}</div>
          <div className="text-[9px] font-bold opacity-80">TEL: {settings.businessPhone}</div>
          {settings.businessEmail && (
            <div className="text-[9px] font-bold opacity-80 lowercase">{settings.businessEmail}</div>
          )}
        </div>

        {/* Separator */}
        <div className="border-b border-black border-dashed w-full my-2"></div>

        {/* Document Title & Basic Info */}
        <div className="text-center mb-3">
          <div className="text-[12px] font-black underline mb-1">{getDocumentTitle()}</div>
          <div className="flex justify-between text-[9px] font-bold">
            <span>{getDocumentNumberLabel()}</span>
            <span>{sale.receiptNumber}</span>
          </div>
          <div className="flex justify-between text-[9px]">
            <span>DATE:</span>
            <span>{format(receiptDate, 'dd/MM/yyyy')}</span>
          </div>
          <div className="flex justify-between text-[9px]">
            <span>TIME:</span>
            <span>{format(currentDateTime, 'HH:mm')}</span>
          </div>
          <div className="flex justify-between text-[9px] font-black">
            <span>STATUS:</span>
            <span>{sale.paymentStatus.toUpperCase()}</span>
          </div>
        </div>

        {/* Customer Section */}
        {sale.customerName && (
          <div className="mb-3 bg-gray-50 p-1.5 border border-gray-100 italic">
            <div className="font-black text-[9px] not-italic uppercase mb-0.5">Customer:</div>
            <div className="font-bold">{sale.customerName}</div>
            {sale.customerAddress && <div className="text-[9px] opacity-70">{sale.customerAddress}</div>}
            {sale.customerContact && <div className="text-[9px] opacity-70">{sale.customerContact}</div>}
          </div>
        )}

        <div className="border-b border-black border-dashed w-full my-2"></div>

        {/* Items Table */}
        <div className="mb-4">
          <div className="flex justify-between font-black text-[9px] pb-1 border-b border-black mb-1.5 uppercase">
            <span className="w-[60%]">Description</span>
            <span className="w-[15%] text-right">Qty</span>
            <span className="w-[25%] text-right">Amt</span>
          </div>

          {sale.items.map((item, index) => {
            const itemSubtotal = item.quantity * item.price;
            const discountAmount = item.discountType === 'amount'
              ? (item.discountAmount || 0)
              : (itemSubtotal * (item.discountPercentage || 0)) / 100;
            const finalAmount = itemSubtotal - discountAmount;

            return (
              <div key={index} className="mb-2 last:mb-0">
                <div className="font-bold text-[10px] break-words uppercase">{item.description}</div>
                <div className="flex justify-between text-[9px] items-center">
                  <span className="text-gray-600 font-bold truncate">
                    {formatNumber(item.price)}
                  </span>
                  <div className="flex-1 border-b border-dotted border-gray-300 mx-2"></div>
                  <span className="font-bold">
                    {formatNumber(item.quantity).padStart(2, '0')}x {formatNumber(finalAmount)}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-[8px] italic text-gray-500 font-bold">
                    <span>- DISCOUNT {item.discountType === 'percentage' ? `(${item.discountPercentage}%)` : ''}</span>
                    <span>-{formatNumber(discountAmount)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-b border-black border-dashed w-full my-2"></div>

        {/* Totals Section */}
        <div className="mb-4 space-y-0.5">
          <div className="flex justify-between font-bold">
            <span>SUBTOTAL:</span>
            <span>{displayCurrency} {formatNumber(subtotalBeforeDiscount)}</span>
          </div>
          {totalDiscountAmount > 0 && (
            <div className="flex justify-between font-bold italic opacity-70">
              <span>DISCOUNT:</span>
              <span>-{displayCurrency} {formatNumber(totalDiscountAmount)}</span>
            </div>
          )}
          {taxRate > 0 && (
            <div className="flex justify-between font-bold">
              <span>TAX ({taxRate}%):</span>
              <span>{displayCurrency} {formatNumber(taxAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-black text-[13px] border-t border-black pt-1.5 mt-1">
            <span>TOTAL:</span>
            <span>{displayCurrency} {formatNumber(totalAmount)}</span>
          </div>

          {sale.paymentStatus === 'Installment Sale' && (
            <div className="mt-2 pt-1 border-t border-gray-200 border-dotted">
              <div className="flex justify-between font-bold">
                <span>PAID:</span>
                <span>{displayCurrency} {formatNumber(displayAmountPaid)}</span>
              </div>
              <div className="flex justify-between font-black text-red-600">
                <span>DUE:</span>
                <span>{displayCurrency} {formatNumber(displayAmountDue)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Amount in Words */}
        <div className="mb-4 text-[9px] italic opacity-80 border-t border-b border-gray-100 py-1">
          <span className="font-black not-italic uppercase">Words:</span> {displayCurrency} {numberToWords(totalAmount)} only.
        </div>

        {/* Payment Info */}
        {hasPaymentInfo && (
          <div className="mb-4 text-[9px]">
            <div className="font-black underline mb-1 uppercase">Payment Channels:</div>
            {paymentMethods
              .filter(p => p.method.trim() !== '' || p.accountNumber.trim() !== '' || p.accountName.trim() !== '')
              .map((p, i) => (
                <div key={i} className="mb-1 last:mb-0 font-bold">
                  <div className="flex justify-between">
                    <span className="uppercase">{p.method}:</span>
                    <span>{p.accountNumber}</span>
                  </div>
                  <div className="text-[8px] opacity-70 italic text-right">{p.accountName}</div>
                </div>
              ))
            }
          </div>
        )}

        {/* Notes */}
        {sale.notes && (
          <div className="mb-4 text-[9px] border border-gray-100 p-1 bg-gray-50">
            <div className="font-black uppercase mb-0.5">Notes:</div>
            <div className="font-bold opacity-70 whitespace-pre-wrap italic">{sale.notes}</div>
          </div>
        )}

        {/* Signature Section */}
        <div className="mt-auto pt-6 flex flex-col items-center">
          {settings.signature ? (
            <div className="flex flex-col items-center">
              <img
                src={settings.signature}
                alt="Signature"
                className="h-10 w-auto object-contain mb-1 mix-blend-multiply opacity-90"
              />
              <div className="w-[80%] border-t border-black border-dashed"></div>
              <div className="text-[8px] font-black uppercase mt-1">Authorized Signature</div>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              <div className="w-[80%] border-t border-black border-dashed pt-1"></div>
              <div className="text-[8px] font-black uppercase mt-1">Authorized Signature</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <div className="text-[10px] font-black mb-1 italic">THANK YOU!</div>
          <div className="text-[8px] font-bold opacity-60">
            GONZA SYSTEMS SUPPORT
            <br />
            PRINTED AT {format(new Date(), 'HH:mm dd/MM/yy')}
          </div>
        </div>

        {/* Serrated Edge Pattern (Bottom) */}
        <div className="absolute bottom-0 left-0 w-full h-1 overflow-hidden flex" style={{ opacity: 0.2 }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="w-4 h-4 bg-gray-300 transform rotate-45 translate-y-2 translate-x-1" />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ThermalReceipt;
