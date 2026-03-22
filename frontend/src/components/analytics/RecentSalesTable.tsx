
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sale } from '@/types';
import { formatNumber } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRouter } from 'next/navigation';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFinancialVisibility } from '@/hooks/useFinancialVisibility';

interface RecentSalesTableProps {
  recentSales: Sale[];
  currency: string;
}

const RecentSalesTable: React.FC<RecentSalesTableProps> = ({ recentSales, currency }) => {
  const isMobile = useIsMobile();
  const router = useRouter();
  const {
    canViewCostPrice,
    canViewProfit,
    canViewAvgPrice,
    canViewTotalAmount
  } = useFinancialVisibility();

  // Helper to ensure we always have a valid number for math
  const toSafeNum = (val: any) => {
    if (val === null || val === undefined || val === '' || String(val).toLowerCase() === 'none') return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

  const handleSaleClick = (sale: Sale) => {
    router.push(`/agency/new-sale?editSaleId=${sale.id}`);
  };

  if (recentSales.length === 0) {
    return (
      <Card>
        <CardHeader className={isMobile ? 'p-4' : ''}>
          <CardTitle className={isMobile ? 'text-lg' : ''}>Recent Sales</CardTitle>
          <CardDescription className={isMobile ? 'text-xs' : ''}>Your latest transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center">
            <p className="text-muted-foreground">No recent sales</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // For mobile view, render cards instead of a table
  if (isMobile) {
    return (
      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-lg">Recent Sales</CardTitle>
          <CardDescription className="text-xs">Your latest transactions</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-3">
            {recentSales.map((sale) => {
              // Calculate subtotal from items with discount considerations
              const subtotal = (sale.items || []).reduce((total, item) => {
                const itemPrice = toSafeNum(item.price);
                const itemQty = toSafeNum(item.quantity);
                const itemSubtotal = itemPrice * itemQty;
                const discountAmount = (itemSubtotal * toSafeNum(item.discountPercentage)) / 100;
                return total + (itemSubtotal - discountAmount);
              }, 0);

              // Calculate total discount amount
              const totalDiscount = (sale.items || []).reduce((total, item) => {
                const itemSubtotal = toSafeNum(item.price) * toSafeNum(item.quantity);
                const discountAmount = (itemSubtotal * toSafeNum(item.discountPercentage)) / 100;
                return total + discountAmount;
              }, 0);

              // Calculate tax amount based on subtotal and tax rate
              const taxRate = toSafeNum(sale.taxRate);
              const taxAmount = subtotal * (taxRate / 100);

              // Total including tax
              const saleTotal = subtotal + taxAmount;

              // Calculate total cost for the sale
              const totalCost = (sale.items || []).reduce((sum, item) => sum + (toSafeNum(item.cost) * toSafeNum(item.quantity)), 0);

              // Get primary item description (or combination)
              let itemDescription = "No items";
              if (sale.items && Array.isArray(sale.items) && sale.items.length > 0) {
                itemDescription = sale.items[0].description;
                if (sale.items.length > 1) {
                  itemDescription += ` (+${sale.items.length - 1} more)`;
                }
              }

              return (
                <div
                  key={sale.id}
                  className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleSaleClick(sale)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-base truncate">{sale.customerName}</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-1 cursor-help">
                            {itemDescription}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-bold break-words whitespace-normal">{itemDescription}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ml-2 ${sale.paymentStatus === 'Paid'
                        ? 'bg-green-100 text-green-800'
                        : sale.paymentStatus === 'Quote'
                          ? 'bg-purple-100 text-purple-800'
                          : sale.paymentStatus === 'Installment Sale'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                    >
                      {sale.paymentStatus === 'NOT PAID' ? 'Credit' :
                        sale.paymentStatus === 'Installment Sale' ? 'Installment' :
                          sale.paymentStatus}
                    </span>
                  </div>

                  {/* Financial data in organized grid */}
                  <div className="grid grid-cols-2 gap-4 py-3 bg-gray-50 rounded-lg mb-3">
                    <div className="text-center border-r border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Cost</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {canViewCostPrice ? `${currency} ${formatNumber(totalCost)}` : '•••'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Discount</p>
                      <p className={`text-sm font-semibold ${totalDiscount > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                        {totalDiscount > 0 ? `-${currency} ${formatNumber(totalDiscount)}` : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-3 bg-gray-50 rounded-lg">
                    <div className="text-center border-r border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Avg Price</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {canViewAvgPrice ? `${currency} ${formatNumber(saleTotal / Math.max(1, (sale.items || []).reduce((total, item) => total + toSafeNum(item.quantity), 0)))}` : '•••'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Total Amount</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {canViewTotalAmount ? `${currency} ${formatNumber(saleTotal)}` : '•••'}
                      </p>
                    </div>
                  </div>

                  {/* Profit and date row */}
                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
                    <div className="text-left">
                      <p className="text-xs text-gray-500">Profit</p>
                      <p className="text-sm font-semibold text-green-600">
                        {canViewProfit ? `${currency} ${formatNumber(saleTotal - totalCost)}` : '•••'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {new Date(sale.date).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Desktop view with table
  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
          <CardDescription>Your latest 20 transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-3 text-left">Date</th>
                  <th className="py-3 text-left">Receipt #</th>
                  <th className="py-3 text-left">Customer</th>
                  <th className="py-3 text-left">Item</th>
                  <th className="py-3 text-right">Total Qty</th>
                  <th className="py-3 text-right">Avg Price</th>
                  <th className="py-3 text-right">Discount</th>
                  {canViewCostPrice && <th className="py-3 text-right">Cost</th>}
                  {canViewProfit && <th className="py-3 text-right">Profit</th>}
                  <th className="py-3 text-right">Total (incl. Tax)</th>
                  <th className="py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((sale) => {
                  // Calculate total quantity
                  const totalQuantity = (sale.items || []).reduce((total, item) => total + toSafeNum(item.quantity), 0);
                  // Calculate subtotal from items with discount considerations
                  const subtotal = (sale.items || []).reduce((total, item) => {
                    const itemPrice = toSafeNum(item.price);
                    const itemQty = toSafeNum(item.quantity);
                    const itemSubtotal = itemPrice * itemQty;
                    const discountAmount = (itemSubtotal * toSafeNum(item.discountPercentage)) / 100;
                    return total + (itemSubtotal - discountAmount);
                  }, 0);

                  const averagePrice = totalQuantity > 0 ? subtotal / totalQuantity : 0;

                  // Calculate total discount amount
                  const totalDiscount = (sale.items || []).reduce((total, item) => {
                    const itemSubtotal = toSafeNum(item.price) * toSafeNum(item.quantity);
                    const discountAmount = (itemSubtotal * toSafeNum(item.discountPercentage)) / 100;
                    return total + discountAmount;
                  }, 0);

                  // Calculate tax amount based on subtotal and tax rate
                  const taxRate = toSafeNum(sale.taxRate);
                  const taxAmount = subtotal * (taxRate / 100);

                  // Total including tax
                  const saleTotal = subtotal + taxAmount;

                  // Calculate total cost
                  const totalCost = (sale.items || []).reduce((total, item) => total + (toSafeNum(item.cost) * toSafeNum(item.quantity)), 0);

                  // Get primary item description (or combination)
                  let itemDescription = "No items";
                  if (sale.items && Array.isArray(sale.items) && sale.items.length > 0) {
                    itemDescription = sale.items[0].description;
                    if (sale.items.length > 1) {
                      itemDescription += ` (+${sale.items.length - 1} more)`;
                    }
                  }

                  return (
                    <tr
                      key={sale.id}
                      className="border-b cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSaleClick(sale)}
                    >
                      <td className="py-3">
                        {new Date(sale.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                      <td className="py-3">{sale.receiptNumber}</td>
                      <td className="py-3">{sale.customerName}</td>
                      <td className="py-3 max-w-xs truncate">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">{itemDescription}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-bold break-words whitespace-normal">{itemDescription}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      <td className="py-3 text-right">{totalQuantity}</td>
                      <td className="py-3 text-right">
                        {canViewAvgPrice ? `${currency} ${formatNumber(averagePrice)}` : '•••'}
                      </td>
                      <td className="py-3 text-right">
                        {totalDiscount > 0 ? (
                          <span className="text-orange-600">
                            -{currency} {formatNumber(totalDiscount)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      {canViewCostPrice && (
                        <td className="py-3 text-right">
                          {currency} {formatNumber(totalCost)}
                        </td>
                      )}
                      {canViewProfit && (
                        <td className="py-3 text-right">
                          <span className="text-green-600 font-medium">
                            {currency} {formatNumber(saleTotal - totalCost)}
                          </span>
                        </td>
                      )}
                      <td className="py-3 text-right">
                        {canViewTotalAmount ? (
                          <>
                            {currency} {formatNumber(saleTotal)}
                            {sale.paymentStatus === 'Installment Sale' && sale.amountPaid && (
                              <div className="text-xs text-green-600">
                                Paid: {currency} {formatNumber(sale.amountPaid)}
                              </div>
                            )}
                          </>
                        ) : '•••'}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sale.paymentStatus === 'Paid'
                            ? 'bg-green-100 text-green-800'
                            : sale.paymentStatus === 'Quote'
                              ? 'bg-purple-100 text-purple-800'
                              : sale.paymentStatus === 'Installment Sale'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                        >
                          {sale.paymentStatus === 'NOT PAID' ? 'Credit' :
                            sale.paymentStatus === 'Installment Sale' ? 'Installment' :
                              sale.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default RecentSalesTable;
