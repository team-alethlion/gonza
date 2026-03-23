/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Printer } from "lucide-react";
import { formatCashCurrency } from "@/lib/utils";
import { format, isSameDay } from "date-fns";
import { Sale } from "@/types";
import { getDateRangeFromFilter } from "@/utils/dateFilters";
import ReceiptDialog from "@/components/sales/ReceiptDialog";
import { useProfiles } from "@/contexts/ProfileContext";
import { useFinancialVisibility } from "@/hooks/useFinancialVisibility";
import { useQuery } from "@tanstack/react-query";
import { getSalesAction } from "@/app/actions/sales";
import { useBusiness } from "@/contexts/BusinessContext";
import { Loader2 } from "lucide-react";

interface ItemSalesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  itemDescription: string;
  currency: string;
  dateFilter: string;
  dateRange: { from: Date | undefined; to: Date | undefined };
  specificDate: Date | undefined;
}

const ItemSalesDialog: React.FC<ItemSalesDialogProps> = ({
  isOpen,
  onOpenChange,
  itemDescription,
  currency,
  dateFilter,
  dateRange,
  specificDate,
}) => {
  const router = useRouter();
  const { hasPermission } = useProfiles();
  const { currentBusiness } = useBusiness();
  const { canViewSellingPrice } = useFinancialVisibility();
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // 🚀 OPTIMIZATION: Fetch ONLY the sales for this specific item
  const { data: relevantSales = [], isLoading } = useQuery({
    queryKey: [
      "item-sales",
      itemDescription,
      currentBusiness?.id,
      dateFilter,
      dateRange,
      specificDate,
    ],
    queryFn: async () => {
      if (!currentBusiness?.id || !isOpen) return [];

      const result = await getSalesAction(currentBusiness.id, 1, 100, {
        search: itemDescription,
      });

      if (!result.success) throw new Error(result.error);
      return result.data?.sales || [];
    },
    enabled: isOpen && !!currentBusiness?.id,
  });

  const handleEditSale = (sale: Sale) => {
    // In Next.js App Router, we use search parameters instead of location state
    router.push(`/agency/new-sale?editId=${sale.id}`);
    onOpenChange(false); // Close the dialog
  };

  const handleViewReceipt = (sale: Sale) => {
    setSelectedSale(sale);
    setIsReceiptOpen(true);
  };

  const handleCloseReceipt = () => {
    setIsReceiptOpen(false);
    setSelectedSale(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sales for &quot;{itemDescription}&quot;</DialogTitle>
          {!isLoading && (
            <p className="text-sm text-muted-foreground">
              {relevantSales.length} sale{relevantSales.length !== 1 ? "s" : ""}{" "}
              found in the selected period
            </p>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Fetching sales records...
            </p>
          </div>
        ) : relevantSales.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No sales found for this item in the selected period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relevantSales.map((sale: Sale) => {
                  const item = sale.items.find(
                    (item: any) => item.description === itemDescription,
                  );
                  if (!item) return null;

                  return (
                    <TableRow key={sale.id}>
                      <TableCell>{format(sale.date, "MMM d, yyyy")}</TableCell>
                      <TableCell className="font-medium">
                        #{sale.receiptNumber}
                      </TableCell>
                      <TableCell>{sale.customerName}</TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {canViewSellingPrice
                          ? formatCashCurrency(item.price, currency)
                          : "•••"}
                      </TableCell>
                      <TableCell className="text-right">
                        {canViewSellingPrice
                          ? formatCashCurrency(
                              item.price * item.quantity,
                              currency,
                            )
                          : "•••"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            sale.paymentStatus === "Paid"
                              ? "default"
                              : sale.paymentStatus === "NOT PAID"
                              ? "destructive"
                              : "secondary"
                          }>
                          {sale.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewReceipt(sale)}
                            className="h-8 w-8 p-0"
                            title="View Receipt">
                            <Printer className="h-4 w-4" />
                            <span className="sr-only">View Receipt</span>
                          </Button>
                          {hasPermission("sales", "edit") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditSale(sale)}
                              className="h-8 w-8 p-0"
                              title="Edit Sale">
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit Sale</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>

      {/* Receipt Dialog */}
      <ReceiptDialog
        isOpen={isReceiptOpen}
        sale={selectedSale}
        currency={currency}
        onOpenChange={handleCloseReceipt}
      />
    </Dialog>
  );
};

export default ItemSalesDialog;
