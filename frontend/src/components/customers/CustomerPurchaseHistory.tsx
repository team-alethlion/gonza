/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSalesAction } from "@/app/actions/sales";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useBusiness } from "@/contexts/BusinessContext";
import { Sale, mapDbSaleToSale } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { formatNumber } from "@/lib/utils";
import Link from "next/link";
import ReceiptDialog from "@/components/sales/ReceiptDialog";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CustomerPurchaseHistoryProps {
  customerId: string;
  customerNameProp?: string;
}

const CustomerPurchaseHistory: React.FC<CustomerPurchaseHistoryProps> = ({
  customerId,
}) => {
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();
  const { settings } = useBusinessSettings();

  const [customerSales, setCustomerSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!currentBusiness?.id || !customerId) return;

    setIsLoading(true);
    try {
      const result = await getSalesAction(currentBusiness.id, page, pageSize, {
        customerId: customerId,
        ordering: '-date'
      });

      if (result.success && result.data) {
        const mapped = (result.data.sales || []).map((s: any) => mapDbSaleToSale(s));
        setCustomerSales(mapped);
        setTotalCount(result.data.count || 0);
      }
    } catch (error) {
      console.error("Error loading purchase history:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentBusiness?.id, customerId, page]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const formatCurrency = (value: any) => {
    return `${settings.currency} ${formatNumber(value)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "PAID":
      case "COMPLETED":
        return <Badge className="bg-green-100 text-green-800 border-none">Paid</Badge>;
      case "NOT PAID":
      case "UNPAID":
        return <Badge className="bg-red-100 text-red-800 border-none">Unpaid</Badge>;
      case "PARTIAL":
        return <Badge className="bg-amber-100 text-amber-800 border-none">Partial</Badge>;
      case "QUOTE":
        return <Badge className="bg-blue-100 text-blue-800 border-none">Quote</Badge>;
      case "INSTALLMENT":
      case "INSTALLMENT SALE":
        return (
          <Badge className="bg-purple-100 text-purple-800 border-none">Installment</Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getItemsDisplay = (sale: Sale) => {
    if (!sale.items || sale.items.length === 0) {
      return "No items";
    }

    const first = sale.items[0];
    return sale.items.length === 1
      ? `${first.description} (${first.quantity})`
      : `${first.description} (+${sale.items.length - 1} more)`;
  };

  const handleRowClick = (sale: Sale) => {
    setSelectedSale(sale);
    setIsReceiptDialogOpen(true);
  };

  if (isLoading && page === 1) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (customerSales.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12 border rounded-xl bg-gray-50/50 border-dashed">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ChevronRight className="h-8 w-8 text-gray-300" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">
          No purchase history found
        </h3>
        <p className="mt-1 text-sm text-gray-500 max-w-xs mx-auto">
          This customer hasn&apos;t made any purchases yet or sales aren&apos;t linked to their profile.
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border shadow-sm overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Receipt #</TableHead>
              <TableHead className="font-semibold">Amount</TableHead>
              <TableHead className="font-semibold">Items</TableHead>
              <TableHead className="font-semibold text-right">Status</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {customerSales.map((sale) => (
              <TableRow
                key={sale.id}
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleRowClick(sale)}>
                <TableCell className="py-4">{format(new Date(sale.date), "MMM d, yyyy")}</TableCell>

                <TableCell className="py-4">
                  <span className="font-mono text-xs font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                    {sale.receiptNumber}
                  </span>
                </TableCell>

                <TableCell className="py-4 font-bold text-gray-900">
                  {formatCurrency(sale.total)}
                </TableCell>

                <TableCell className="py-4">
                  <span className="text-sm text-gray-600">{getItemsDisplay(sale)}</span>
                </TableCell>

                <TableCell className="py-4 text-right">{getStatusBadge(sale.paymentStatus)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Local Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} sales
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center text-xs font-medium px-2">
              Page {page} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isLoading}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {selectedSale && (
        <ReceiptDialog
          isOpen={isReceiptDialogOpen}
          sale={selectedSale}
          currency={settings.currency}
          onOpenChange={() => {
            setIsReceiptDialogOpen(false);
            setSelectedSale(null);
          }}
        />
      )}
    </div>
  );
};

export default CustomerPurchaseHistory;
