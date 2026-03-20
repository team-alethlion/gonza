/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSalesData } from "@/hooks/useSalesData";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { Sale } from "@/types";
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
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CustomerPurchaseHistoryProps {
  customerId: string;
  customerNameProp?: string;
}

const CustomerPurchaseHistory: React.FC<CustomerPurchaseHistoryProps> = ({
  customerId,
  customerNameProp,
}) => {
  const { user } = useAuth();
  const { settings } = useBusinessSettings();
  const { sales, isLoading } = useSalesData(user?.id, "desc");

  const [customerSales, setCustomerSales] = useState<Sale[]>([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [customerName, setCustomerName] = useState<string>(
    customerNameProp || "",
  );

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);

  // Fallback if not provided, though it normally should be
  useEffect(() => {
    if (customerNameProp && customerName !== customerNameProp) {
      const timer = setTimeout(() => {
        setCustomerName(customerNameProp);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [customerNameProp, customerName]);

  useEffect(() => {
    const syncSales = () => {
      if (!sales || sales.length === 0 || !customerName) {
        if (customerSales.length > 0) setCustomerSales([]);
        if (localLoading) setLocalLoading(false);
        return;
      }

      // PRIMARY: If sale has customerId, match it directly.
      // FALLBACK: Use customerName matching for legacy sales.
      const filtered = sales.filter((sale) => {
        if (sale.customerId) {
          return sale.customerId === customerId;
        }

        // Fallback for older sales without ID
        const matchesCustomer =
          sale.customerName?.toLowerCase().trim() ===
          customerName.toLowerCase().trim();

        // Filter out manual statement entries (Adjustments and Manual Payments)
        const isManualEntry =
          sale.receiptNumber?.startsWith("ADJ-") ||
          sale.receiptNumber?.startsWith("PAY-");

        return matchesCustomer && !isManualEntry;
      });

      if (JSON.stringify(customerSales) !== JSON.stringify(filtered)) {
        setCustomerSales(filtered);
      }
      if (localLoading) setLocalLoading(false);
    };

    const timer = setTimeout(syncSales, 0);
    return () => clearTimeout(timer);
  }, [sales, customerId, customerName, customerSales, localLoading]);

  const formatCurrency = (value: any) => {
    return `${settings.currency} ${formatNumber(value)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "PAID":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case "NOT PAID":
        return <Badge className="bg-red-100 text-red-800">Unpaid</Badge>;
      case "QUOTE":
        return <Badge className="bg-blue-100 text-blue-800">Quote</Badge>;
      case "INSTALLMENT SALE":
        return (
          <Badge className="bg-purple-100 text-purple-800">Installment</Badge>
        );
      default:
        return <Badge>{status}</Badge>;
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

  if (isLoading || localLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (customerSales.length === 0) {
    return (
      <div className="text-center py-8 border rounded-md">
        <h3 className="text-lg font-medium text-gray-900">
          No purchase history found
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          This customer hasn&apos;t made any purchases yet
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Receipt #</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {customerSales.map((sale) => (
              <TableRow
                key={sale.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleRowClick(sale)}>
                <TableCell>{format(sale.date, "MMM d, yyyy")}</TableCell>

                <TableCell>
                  <Link
                    href={`/sales?receipt=${sale.receiptNumber}`}
                    className="text-blue-600 hover:underline"
                    onClick={(e) => e.stopPropagation()}>
                    {sale.receiptNumber}
                  </Link>
                </TableCell>

                <TableCell>
                  {formatCurrency(
                    sale.items.reduce(
                      (sum, item) => sum + item.price * item.quantity,
                      0,
                    ),
                  )}
                </TableCell>

                <TableCell>
                  <span className="text-sm">{getItemsDisplay(sale)}</span>
                </TableCell>

                <TableCell>{getStatusBadge(sale.paymentStatus)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
    </>
  );
};

export default CustomerPurchaseHistory;
