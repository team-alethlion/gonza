/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Sale, BusinessSettings } from "@/types";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import TableActions from "@/components/sales/TableActions";
import SalesTableFilters from "@/components/sales/SalesTableFilters";
import SalesTableRow from "@/components/sales/SalesTableRow";
import SalesTablePagination from "@/components/sales/SalesTablePagination";
import EmptySalesState from "@/components/sales/EmptySalesState";
import DeleteSaleDialog from "@/components/sales/DeleteSaleDialog";
import BusinessNoticeGenerator from "@/components/customers/BusinessNoticeGenerator";
import PaymentReminderPreviewDialog from "@/components/customers/PaymentReminderPreviewDialog";
import SalesCategoryManager from "@/components/sales/SalesCategoryManager";
import { SalesSummaryCards } from "@/components/sales/SalesSummaryCards";
import { useSalesFilters } from "@/hooks/useSalesFilters";
import { usePagination } from "@/hooks/usePagination";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProfiles } from "@/contexts/ProfileContext";
import { useCashAccounts } from "@/hooks/useCashAccounts";
import { useCashTransactions } from "@/hooks/useCashTransactions";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useToast } from "@/hooks/use-toast";
import { useInstallmentPayments } from "@/hooks/useInstallmentPayments";
import { useFinancialVisibility } from "@/hooks/useFinancialVisibility";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Edit,
  Trash2,
  Receipt,
  FileText,
  Quote,
  Heart,
  MessageCircle,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { generatePaymentReminderPDF } from "@/utils/generatePaymentReminderPDF";
import { openWhatsApp, getThankYouMessage, canSendSMS } from "@/utils/smsUtils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SalesTableProps {
  sales: Sale[];
  onViewReceipt: (sale: Sale) => void;
  onEditSale: (sale: Sale) => void;
  onDeleteSale: (sale: Sale, reason?: string) => void;
  currency?: string;
  onDateFilterChange?: (value: string) => void;
  onDateRangeChange?: (range: {
    from: Date | undefined;
    to: Date | undefined;
  }) => void;
  isLoading?: boolean;
  mobileOptimized?: boolean;
}

const DEFAULT_SETTINGS: BusinessSettings = {
  businessName: "Your Business Name",
  businessAddress: "Your Business Address",
  businessPhone: "(123) 456-7890",
  businessEmail: "support@yourbusiness.com",
  businessLogo: "",
  currency: "UGX",
};

// Memoized mobile card component for better performance
const MobileCard = React.memo(
  ({
    sale,
    settings,
    onViewReceipt,
    onEditSale,
    onDeleteSale,
    onSendPaymentReminder,
    onSendThankYouNotice,
    cashAccountName,
  }: {
    sale: Sale;
    settings: BusinessSettings;
    onViewReceipt: (sale: Sale) => void;
    onEditSale: (sale: Sale) => void;
    onDeleteSale: (sale: Sale, reason?: string) => void;
    onSendPaymentReminder: (sale: Sale) => void;
    onSendThankYouNotice: (sale: Sale) => void;
    cashAccountName?: string | null;
  }) => {
    const { payments } = useInstallmentPayments(sale.id);
    const { hasPermission } = useProfiles();
    const {
      canViewCostPrice,
      canViewProfit,
      canViewSellingPrice,
      canViewTotalAmount,
    } = useFinancialVisibility();

    const totalWithTax = sale.total;
    const totalCost = sale.totalCost;
    const profit = sale.profit;
    const totalDiscount = sale.discount;
    const taxRate = sale.taxRate || 0;

    // Use pre-calculated amounts from the sale object
    const actualAmountPaid = sale.amountPaid || 0;
    const actualAmountDue = sale.amountDue || 0;

    const itemDescription = sale.itemDescription || "No items";

    // Determine status display and styling
    const getStatusDisplay = () => {
      if (sale.paymentStatus === "Installment Sale") {
        return "Installment";
      }
      return sale.paymentStatus === "NOT PAID" ? "Credit" : sale.paymentStatus;
    };

    const getStatusStyling = () => {
      switch (sale.paymentStatus) {
        case "Paid":
          return "bg-green-100 text-green-700";
        case "Quote":
          return "bg-purple-100 text-purple-700";
        case "Installment Sale":
          return "bg-blue-100 text-blue-700";
        case "NOT PAID":
        default:
          return "bg-yellow-100 text-yellow-700";
      }
    };

    // Determine receipt button properties based on status
    const getReceiptButtonProps = () => {
      switch (sale.paymentStatus) {
        case "Paid":
          return { label: "Receipt", icon: Receipt };
        case "NOT PAID":
          return { label: "Invoice", icon: FileText };
        case "Quote":
          return { label: "Quotation", icon: Quote };
        default:
          return { label: "Receipt", icon: Receipt };
      }
    };

    const { label: buttonLabel, icon: ButtonIcon } = getReceiptButtonProps();

    // Check if this is a credit sale that needs payment reminder (exclude installment sales)
    const isCreditSale = sale.paymentStatus === "NOT PAID";

    // Check if this is an installment sale with outstanding balance
    const isInstallmentWithDue =
      sale.paymentStatus === "Installment Sale" && actualAmountDue > 0;

    return (
      <Card
        className={`mb-3 bg-white border shadow-sm ${
          cashAccountName
            ? "border-l-4 border-l-green-500 border-green-200"
            : "border-gray-200"
        }`}>
        <CardContent className="p-4">
          {cashAccountName && (
            <div className="flex items-center gap-2 mb-2 p-2 bg-green-50 rounded-md border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
              <span className="text-xs font-medium text-green-700 truncate">
                Linked to: {cashAccountName}
              </span>
            </div>
          )}
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1 min-w-0 pr-2">
              <p className="font-semibold text-gray-900 text-sm truncate">
                {sale.customerName}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {new Date(sale.date).toLocaleDateString("en-GB")}
              </p>
              {sale.paymentStatus === "Installment Sale" &&
                actualAmountDue > 0 && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-red-50 text-red-700 border-red-200 mt-1">
                    Due:{" "}
                    {canViewSellingPrice || canViewTotalAmount
                      ? `${settings.currency} ${formatNumber(actualAmountDue)}`
                      : "•••"}
                  </Badge>
                )}
            </div>
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusStyling()}`}>
              {getStatusDisplay()}
            </span>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-xs text-gray-600 mb-3 line-clamp-1 cursor-help">
                {itemDescription}
              </p>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="space-y-1">
                <p className="font-bold break-words whitespace-normal">
                  {itemDescription}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>

          <div className="space-y-3 mb-3">
            {/* First row: Cost and Discount */}
            <div className="flex justify-between items-center">
              <div className="text-left">
                <p className="text-xs text-gray-500">Cost</p>
                <p className="font-semibold text-gray-900">
                  {canViewCostPrice
                    ? `${settings.currency} ${formatNumber(totalCost)}`
                    : "NaN"}
                </p>
              </div>
              {totalDiscount > 0 ? (
                <div className="text-right">
                  <p className="text-xs text-gray-500">Discount</p>
                  <p className="font-semibold text-orange-600">
                    {canViewSellingPrice
                      ? `-${settings.currency} ${formatNumber(totalDiscount)}`
                      : "NaN"}
                  </p>
                </div>
              ) : (
                <div className="text-right">
                  <p className="text-xs text-gray-500">Discount</p>
                  <p className="font-semibold text-gray-400">-</p>
                </div>
              )}
            </div>

            {/* Second row: Total Amount and Profit */}
            <div className="flex justify-between items-center">
              <div className="text-left">
                <p className="text-xs text-gray-500">Total Amount</p>
                <p className="font-semibold text-gray-900">
                  {canViewTotalAmount || canViewSellingPrice
                    ? `${settings.currency} ${formatNumber(totalWithTax)}`
                    : "NaN"}
                </p>
                {taxRate > 0 && (
                  <p className="text-xs text-gray-500">Tax incl.</p>
                )}
                {sale.paymentStatus === "Installment Sale" &&
                  actualAmountPaid > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      Paid:{" "}
                      {canViewTotalAmount || canViewSellingPrice
                        ? `${settings.currency} ${formatNumber(
                            actualAmountPaid,
                          )}`
                        : "•••"}
                    </p>
                  )}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Profit</p>
                <p className="font-semibold text-green-600">
                  {canViewProfit
                    ? `${settings.currency} ${formatNumber(profit)}`
                    : "NaN"}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewReceipt(sale)}
                className="flex items-center gap-1.5 text-xs h-8 border-gray-200 flex-1 min-w-0">
                <ButtonIcon className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{buttonLabel}</span>
              </Button>

              {isCreditSale && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSendPaymentReminder(sale)}
                  className="flex items-center gap-1.5 text-xs h-8 border-orange-200 text-orange-600 hover:bg-orange-50 flex-1 min-w-0">
                  <FileText className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">Reminder</span>
                </Button>
              )}

              {isInstallmentWithDue && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSendPaymentReminder(sale)}
                  className="flex items-center gap-1.5 text-xs h-8 border-blue-200 text-blue-600 hover:bg-blue-50 flex-1 min-w-0">
                  <FileText className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">Due Reminder</span>
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => onSendThankYouNotice(sale)}
                className="flex items-center gap-1.5 text-xs h-8 border-purple-200 text-purple-600 hover:bg-purple-50 flex-1 min-w-0">
                <Heart className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">Thanks</span>
              </Button>
            </div>

            <div className="flex justify-center gap-2">
              {hasPermission("sales", "edit") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditSale(sale)}
                  className="h-8 px-3 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-1">
                  <Edit className="h-4 w-4" />
                  <span className="text-xs">Edit</span>
                </Button>
              )}
              {hasPermission("sales", "delete") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteSale(sale)}
                  className="h-8 px-3 hover:bg-red-50 hover:text-red-600 flex items-center gap-1">
                  <Trash2 className="h-4 w-4" />
                  <span className="text-xs">Delete</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  },
);

MobileCard.displayName = "MobileCard";

const SalesTable: React.FC<SalesTableProps> = ({
  sales,
  onViewReceipt,
  onEditSale,
  onDeleteSale,
  currency = "USD",
  onDateFilterChange,
  onDateRangeChange,
  isLoading = false,
  mobileOptimized = false,
}) => {
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<BusinessSettings>({
    ...DEFAULT_SETTINGS,
    currency,
  });

  useEffect(() => {
    setMounted(true);
  }, []);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingSale, setIsDeletingSale] = useState(false);
  const [selectedSaleForNotice, setSelectedSaleForNotice] =
    useState<Sale | null>(null);
  const [isNoticeDialogOpen, setIsNoticeDialogOpen] = useState(false);
  const [selectedPreviewSale, setSelectedPreviewSale] = useState<Sale | null>(
    null,
  );
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const { accounts } = useCashAccounts();
  const { transactions } = useCashTransactions();
  const { settings: businessSettings } = useBusinessSettings();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const {
    searchQuery,
    setSearchQuery,
    paymentFilter,
    setPaymentFilter,
    cashTransactionFilter,
    setCashTransactionFilter,
    categoryFilter,
    setCategoryFilter,
    dateFilter,
    setDateFilter,
    dateRange,
    setDateRange,
    specificDate,
    setSpecificDate,
    isCustomRange,
    isSpecificDate,
    filteredSales,
  } = useSalesFilters(sales);

  // Memoize expensive operations
  const memoizedFilteredSales = useMemo(() => filteredSales, [filteredSales]);

  // Use smaller page sizes for mobile optimization
  const pageSize = mobileOptimized ? 5 : 10;

  const {
    currentPage,
    setCurrentPage,
    paginatedItems: paginatedSales,
    totalPages,
  } = usePagination<Sale>({
    items: memoizedFilteredSales,
    itemsPerPage: pageSize,
  });

  useEffect(() => {
    if (onDateFilterChange) {
      onDateFilterChange(dateFilter);
    }
  }, [dateFilter, onDateFilterChange]);

  useEffect(() => {
    if (onDateRangeChange && isCustomRange) {
      onDateRangeChange(dateRange);
    }
  }, [dateRange, isCustomRange, onDateRangeChange]);

  useEffect(() => {
    setSettings((prevSettings) => ({ ...prevSettings, currency }));

    const savedSettings = localStorage.getItem("businessSettings");
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings({ ...parsed, currency: currency || parsed.currency });
    }
  }, [currency]);

  // Create memoized lookup maps for O(1) access
  const transactionMap = useMemo(() => {
    const map = new Map<string, any>();
    transactions.forEach((t) => map.set(t.id, t));
    return map;
  }, [transactions]);

  const accountMap = useMemo(() => {
    const map = new Map<string, any>();
    accounts.forEach((a) => map.set(a.id, a));
    return map;
  }, [accounts]);

  // Memoize cash account lookup using pre-built maps
  const getCashAccountName = useCallback(
    (sale: Sale) => {
      if (!sale.cashTransactionId) return null;

      const linkedTransaction = transactionMap.get(sale.cashTransactionId);
      if (!linkedTransaction || !linkedTransaction.accountId) return null;

      const linkedAccount = accountMap.get(linkedTransaction.accountId);
      return linkedAccount ? linkedAccount.name : null;
    },
    [transactionMap, accountMap],
  );

  const getReceiptButtonLabel = useCallback((paymentStatus: string) => {
    switch (paymentStatus) {
      case "Paid":
        return "Receipt";
      case "NOT PAID":
        return "Invoice";
      case "Quote":
        return "Quotation";
      default:
        return "Receipt";
    }
  }, []);

  const getReceiptButtonIcon = useCallback((paymentStatus: string) => {
    switch (paymentStatus) {
      case "Paid":
        return Receipt;
      case "NOT PAID":
        return FileText;
      case "Quote":
        return Quote;
      default:
        return Receipt;
    }
  }, []);

  // Handle delete confirmation
  const handleDeleteSale = useCallback((sale: Sale) => {
    setSaleToDelete(sale);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(
    async (reason: string) => {
      if (saleToDelete && !isDeletingSale) {
        setIsDeletingSale(true);
        try {
          await onDeleteSale(saleToDelete, reason);
          setIsDeleteDialogOpen(false);
          setSaleToDelete(null);
        } finally {
          setIsDeletingSale(false);
        }
      }
    },
    [saleToDelete, onDeleteSale, isDeletingSale],
  );

  const handleCancelDelete = useCallback(
    (open: boolean) => {
      if (!isDeletingSale && !open) {
        setIsDeleteDialogOpen(false);
        setSaleToDelete(null);
      }
    },
    [isDeletingSale],
  );

  // Handle thank you notice generation
  const handleSendThankYouNotice = useCallback((sale: Sale) => {
    setSelectedSaleForNotice(sale);
    setIsNoticeDialogOpen(true);
  }, []);

  const handleCloseNoticeDialog = useCallback(() => {
    setIsNoticeDialogOpen(false);
    setSelectedSaleForNotice(null);
  }, []);

  // Handle payment reminder generation
  const handleSendPaymentReminder = useCallback(
    async (sale: Sale) => {
      try {
        // Create a customer object from the sale data
        const customer = {
          id: sale.customerId || "",
          fullName: sale.customerName,
          phoneNumber: sale.customerContact || "",
          email: "",
          location: sale.customerAddress || "",
          categoryId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          birthday: null,
          socialMedia: null,
          gender: null,
          tags: null,
          notes: null,
        };

        // Open the preview dialog instead of generating PDF directly
        setSelectedPreviewSale(sale);
        setIsPreviewDialogOpen(true);
      } catch (error) {
        console.error("Error generating payment reminder:", error);
        toast({
          title: "Error",
          description: "Failed to generate payment reminder. Please try again.",
          variant: "destructive",
        });
      }
    },
    [businessSettings, settings, toast],
  );

  // Handle WhatsApp thank you message
  const handleSendThankYouWhatsApp = useCallback(
    (sale: Sale) => {
      if (!canSendSMS({ phoneNumber: sale.customerContact })) {
        toast({
          title: "Phone number required",
          description: "Customer phone number is not available for WhatsApp.",
          variant: "destructive",
        });
        return;
      }

      const message = getThankYouMessage(sale, businessSettings || settings);
      openWhatsApp({
        phoneNumber: sale.customerContact!,
        message,
      });

      toast({
        title: "WhatsApp Opened",
        description: `Opening WhatsApp chat for ${sale.customerName}`,
      });
    },
    [businessSettings, settings, toast],
  );

  // Show optimized loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4">
        <img src="/icon.png" alt="Loading" className="w-12 h-12 animate-spin" />
        <p className="text-muted-foreground text-sm">Loading sales...</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <>
        <div className="bg-white rounded-lg shadow-sm border border-border/50">
          <div className="p-4 sm:p-6 border-b border-border/50">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                    Sales Records
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {mounted ? (
                      <>
                        {memoizedFilteredSales.length}{" "}
                        {memoizedFilteredSales.length === 1
                          ? "record"
                          : "records"}{" "}
                        found
                      </>
                    ) : (
                      "Loading records..."
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <SalesCategoryManager />
                  <div className="w-full sm:w-auto">
                    <TableActions
                      filteredSales={memoizedFilteredSales}
                      allSales={sales}
                      currency={settings.currency}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <SalesSummaryCards
              sales={memoizedFilteredSales}
              currency={settings.currency}
            />

            <SalesTableFilters
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              paymentFilter={paymentFilter}
              setPaymentFilter={setPaymentFilter}
              cashTransactionFilter={cashTransactionFilter}
              setCashTransactionFilter={setCashTransactionFilter}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              dateFilter={dateFilter}
              setDateFilter={setDateFilter}
              dateRange={dateRange}
              setDateRange={setDateRange}
              specificDate={specificDate}
              setSpecificDate={setSpecificDate}
              isCustomRange={isCustomRange}
              isSpecificDate={isSpecificDate}
            />

            {memoizedFilteredSales.length > 0 ? (
              <>
                {isMobile ? (
                  <div className="space-y-3">
                    {paginatedSales.map((sale) => (
                      <MobileCard
                        key={sale.id}
                        sale={sale}
                        settings={settings}
                        onViewReceipt={onViewReceipt}
                        onEditSale={onEditSale}
                        onDeleteSale={handleDeleteSale}
                        onSendPaymentReminder={handleSendPaymentReminder}
                        onSendThankYouNotice={handleSendThankYouNotice}
                        cashAccountName={getCashAccountName(sale)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Receipt #</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-right">
                            Total Qty
                          </TableHead>
                          <TableHead className="text-right">
                            Avg Price
                          </TableHead>
                          <TableHead className="text-right">Discount</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                          <TableHead className="text-right">Profit</TableHead>
                          <TableHead className="text-right">
                            Total (incl. Tax)
                          </TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedSales.map((sale) => (
                          <SalesTableRow
                            key={sale.id}
                            sale={sale}
                            currency={settings.currency}
                            onViewReceipt={onViewReceipt}
                            onEditSale={onEditSale}
                            onDeleteSale={handleDeleteSale}
                            onSendPaymentReminder={handleSendPaymentReminder}
                            onSendThankYouNotice={handleSendThankYouNotice}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <div className="mt-6">
                  <SalesTablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              </>
            ) : (
              <EmptySalesState />
            )}
          </div>
        </div>

        <DeleteSaleDialog
          isOpen={isDeleteDialogOpen}
          onOpenChange={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeletingSale}
        />

        {selectedSaleForNotice && (
          <BusinessNoticeGenerator
            customer={{
              id: selectedSaleForNotice.customerId || "",
              fullName: selectedSaleForNotice.customerName,
              phoneNumber: selectedSaleForNotice.customerContact || "",
              email: "",
              location: selectedSaleForNotice.customerAddress || "",
              categoryId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              birthday: null,
              socialMedia: null,
              gender: null,
              tags: null,
              notes: null,
              branchId: "placeholder",
            }}
            open={isNoticeDialogOpen}
            onClose={handleCloseNoticeDialog}
            defaultTemplate="thank_you"
            sale={selectedSaleForNotice}
          />
        )}

        <PaymentReminderPreviewDialog
          isOpen={isPreviewDialogOpen}
          onOpenChange={setIsPreviewDialogOpen}
          sale={selectedPreviewSale}
        />
      </>
    </TooltipProvider>
  );
};

export default SalesTable;
