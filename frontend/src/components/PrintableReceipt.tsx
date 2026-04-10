/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sale } from "@/types";
import { generatePDF } from "@/utils/generatePDF";
import { directPrint } from "@/utils/directPrint";
import { format } from "date-fns";
import { Printer, Download, Loader2 } from "lucide-react";
import { formatNumber, getBaseUrl } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

import { parsePaymentInfo } from "@/hooks/useBusinessSettings";
import { useBusiness } from "@/contexts/BusinessContext";
import { numberToWords } from "@/utils/numberToWords";
import { useIsMobile } from "@/hooks/use-mobile";

import ThermalReceipt from "./ThermalReceipt";
import { toast } from "sonner";
import { print } from "@/utils/thermalPrinterPlug";
import { generateThermalReceipt } from "@/utils/generateThermalReceipt";

const DEFAULT_SETTINGS: any = {
  businessName: "Business Name",
  businessAddress: "Business Address",
  businessPhone: "Business Phone",
  businessEmail: "email@business.com",
  currency: "UGX",
  paymentInfo: "",
};

interface PrintableReceiptProps {
  sale: Sale;
  currency?: string;
  isMobile?: boolean;
  includePaymentInfo?: boolean;
}

type ReceiptType = "standard" | "thermal";

const PrintableReceipt: React.FC<PrintableReceiptProps> = ({
  sale,
  currency,
  isMobile,
  includePaymentInfo = true,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const thermalReceiptRef = useRef<HTMLDivElement>(null);

  // 🚀 OPTIMIZATION: Use pre-fetched settings from context to prevent "Loading..." lag
  const { initialBusinessSettings: settings } = useBusiness();
  const settingsLoading = !settings;

  // 🛡️ SAFETY: Fallback to defaults if settings are not yet loaded
  const activeSettings = settings || DEFAULT_SETTINGS;

  // 🚀 PERFORMANCE FIX: Use data already available in the sale object instead of a second API call
  const payments = sale.payments || [];

  const [receiptType, setReceiptType] = useState<ReceiptType>("standard");
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const isMobileDevice = useIsMobile();

  // Update receipt type when settings are loaded
  useEffect(() => {
    if (activeSettings.defaultPrintFormat) {
      setReceiptType(activeSettings.defaultPrintFormat as ReceiptType);
    }
  }, [activeSettings.defaultPrintFormat]);

  // Determine document title based on payment status
  const getDocumentTitle = () => {
    switch (sale.paymentStatus) {
      case "Quote":
        return "QUOTATION";
      case "Paid":
      case "COMPLETED":
        return "SALES RECEIPT";
      case "Installment Sale":
      case "INSTALLMENT":
        return "INVOICE";
      case "NOT PAID":
      default:
        return "INVOICE";
    }
  };

  const getDocumentNumberLabel = () => {
    switch (sale.paymentStatus) {
      case "Quote":
        return "Quote #:";
      case "Paid":
      case "COMPLETED":
        return "Receipt #:";
      case "Installment Sale":
      case "INSTALLMENT":
        return "Installment #:";
      case "NOT PAID":
      default:
        return "Invoice #:";
    }
  };

  const documentTitle = getDocumentTitle();
  const documentNumberLabel = getDocumentNumberLabel();

  // Helper to ensure we always have a valid number for math
  const toSafeNum = (val: any) => {
    if (val === null || val === undefined || val === "") return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

  // Calculate subtotal with discounts - using server values if available
  const subtotal = sale.subtotal !== undefined ? toSafeNum(sale.subtotal) : sale.items.reduce((total: number, item: any) => {
    const itemPrice = toSafeNum(item.price);
    const itemQty = toSafeNum(item.quantity);
    const itemSubtotal = itemPrice * itemQty;

    const discountAmount =
      item.discountType === "amount"
        ? toSafeNum(item.discountAmount)
        : (itemSubtotal * toSafeNum(item.discountPercentage)) / 100;
    return total + (itemSubtotal - discountAmount);
  }, 0);

  // Total discount from server or items
  const totalDiscount = sale.discount !== undefined ? toSafeNum(sale.discount) : sale.items.reduce((total: number, item: any) => {
    const itemSubtotal = toSafeNum(item.quantity) * toSafeNum(item.price);
    const discountAmount =
      item.discountType === "amount"
        ? toSafeNum(item.discountAmount)
        : (itemSubtotal * toSafeNum(item.discountPercentage)) / 100;
    return total + discountAmount;
  }, 0);

  // Calculate tax amount based on taxRate (default to 0 if not present)
  const taxRate = toSafeNum(sale.taxRate);
  const taxAmount = subtotal * (taxRate / 100);

  // Total amount including tax
  const totalAmount = subtotal + taxAmount;

  // For installment sales, use payment history total; for others use the provided amounts
  const totalPaidFromHistory = payments.reduce(
    (sum: number, payment: { amount: any; }) => sum + toSafeNum(payment.amount),
    0,
  );
  const displayAmountPaid =
    (sale.paymentStatus === "Installment Sale" || sale.paymentStatus === "INSTALLMENT")
      ? totalPaidFromHistory + toSafeNum(sale.amountPaid || (sale as any).amount_paid)
      : ((sale.paymentStatus === "Paid" || sale.paymentStatus === "COMPLETED") && totalPaidFromHistory > 0)
      ? totalPaidFromHistory
      : toSafeNum(sale.amountPaid || (sale as any).amount_paid || totalAmount);
  const displayAmountDue = toSafeNum(sale.amountDue !== undefined ? sale.amountDue : (sale as any).balance_due);

  // Get the total amount in words
  const totalAmountInWords = numberToWords(totalAmount);

  // Check if we should show the tax row
  const showTaxRow = taxRate > 0;

  // Check if this is an installment sale
  const isInstallmentSale = sale.paymentStatus === "Installment Sale" || sale.paymentStatus === "INSTALLMENT";

  // Parse payment info into structured format
  const paymentMethods = activeSettings.paymentInfo
    ? parsePaymentInfo(activeSettings.paymentInfo)
    : [];
  // Only show payment methods table if there are valid payment methods AND includePaymentInfo is true
  const hasPaymentInfo =
    includePaymentInfo &&
    paymentMethods.length > 0 &&
    paymentMethods.some(
      (pm) =>
        pm.method.trim() !== "" ||
        pm.accountNumber.trim() !== "" ||
        pm.accountName.trim() !== "",
    );

  // Use the currency prop if provided, otherwise use the one from settings
  const displayCurrency = currency || activeSettings.currency;

  // Check if device is iOS or Android

  const receiptDate = new Date(sale.date);

  // Helper function to create structured receipt data
  const createReceiptData = () => {
    const currentDateTime = new Date();
    const paymentMethods = activeSettings.paymentInfo
      ? parsePaymentInfo(activeSettings.paymentInfo)
      : [];
    const hasPaymentInfo =
      includePaymentInfo &&
      paymentMethods.length > 0 &&
      paymentMethods.some(
        (pm) =>
          pm.method.trim() !== "" ||
          pm.accountNumber.trim() !== "" ||
          pm.accountName.trim() !== "",
      );

    return {
      documentTitle: getDocumentTitle(),
      documentNumberLabel: getDocumentNumberLabel(),
      receiptNumber: sale.receiptNumber || (sale as any).receipt_number,
      date: format(receiptDate, "MMM dd, yyyy"),
      time: format(currentDateTime, "hh:mm a"),
      status: sale.paymentStatus || (sale as any).status,
      businessName: activeSettings.businessName,
      businessAddress: activeSettings.businessAddress,
      businessPhone: activeSettings.businessPhone,
      businessEmail: activeSettings.businessEmail,
      businessLogo: activeSettings.businessLogo,
      signature: activeSettings.signature,
      customerName: sale.customerName || (sale as any).customer_name,
      customerAddress: sale.customerAddress || (sale as any).customer_address,
      customerContact: sale.customerContact || (sale as any).customer_phone,
      items: sale.items.map((item: any) => {
        const itemPrice = toSafeNum(item.price);
        const itemQty = toSafeNum(item.quantity);
        const itemSubtotal = itemPrice * itemQty;

        const discountAmount =
          item.discountType === "amount"
            ? toSafeNum(item.discountAmount)
            : (itemSubtotal * toSafeNum(item.discountPercentage)) / 100;
        return {
          description: item.description,
          quantity: itemQty,
          unitPrice: itemPrice,
          discountPercentage: toSafeNum(item.discountPercentage),
          discountAmount,
          discountType: item.discountType || "percentage",
          amount: itemSubtotal - discountAmount,
        };
      }),
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      amountPaid: displayAmountPaid,
      amountDue: displayAmountDue,
      isInstallmentSale,
      totalAmountInWords,
      paymentMethods: hasPaymentInfo
        ? paymentMethods.filter(
            (pm) =>
              pm.method.trim() !== "" ||
              pm.accountNumber.trim() !== "" ||
              pm.accountName.trim() !== "",
          )
        : undefined,
      currency: displayCurrency,
      showTaxRow,
      hasPaymentInfo,
      notes: sale.notes,
    };
  };

  // Optimized download handler with vector PDF for standard receipts
  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;

    setIsDownloading(true);

    try {
      toast.success("Preparing download...");

      const filePrefix =
        sale.paymentStatus === "Quote"
          ? "Quote"
          : sale.paymentStatus === "Paid"
          ? "Receipt"
          : "Invoice";

      const fileName =
        receiptType === "thermal"
          ? `${filePrefix}_Thermal-${sale.receiptNumber}.pdf`
          : `${filePrefix}-${sale.receiptNumber}.pdf`;

      if (receiptType === "standard") {
        // Use new vector PDF generation for standard receipts
        const { generateReceiptVectorPDF } = await import(
          "@/utils/generateReceiptVectorPDF"
        );
        const receiptData = createReceiptData();
        await generateReceiptVectorPDF(receiptData, {
          filename: fileName,
          orientation: "portrait",
          format: "a4",
          margins: { top: 20, right: 20, bottom: 20, left: 20 },
          saleId: sale.id, // Pass saleId
        });
      } else {
        // Use existing method for thermal receipts
        await generatePDF(receiptRef.current, fileName, { isReceipt: true });
      }

      toast.success("Receipt downloaded successfully!");
    } catch (error) {
      console.error("Error downloading receipt:", error);
      toast.error("Failed to download receipt. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Share handle share
  const handleShare = async () => {
    setIsSharing(true);
    try {
      const { generateReceiptVectorPDF } = await import(
        "@/utils/generateReceiptVectorPDF"
      );
      const receiptData = createReceiptData();
      const pdfBlob = await generateReceiptVectorPDF(receiptData, {
        returnBlob: true,
        saleId: sale.id, // Pass saleId
      });
      if (!pdfBlob) return;

      // 🔹 Use dynamic prefix same as download
      const filePrefix =
        sale.paymentStatus === "Quote"
          ? "Quotation"
          : sale.paymentStatus === "Paid"
          ? "Receipt"
          : "Invoice";

      const fileName = `${filePrefix}-${sale.receiptNumber}.pdf`;

      const file = new File([pdfBlob], fileName, { type: "application/pdf" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${filePrefix} - ${sale.receiptNumber}`,
          text: `${filePrefix} #${sale.receiptNumber}`,
        });
        toast.success(`${filePrefix} shared successfully!`);
      } else {
        toast.error("Sharing not supported on this device.");
      }
    } catch (error) {
      console.error("Error sharing document:", error);
      toast.error("Failed to share document.");
    } finally {
      setIsSharing(false);
    }
  };

  // Optimized print handler with PDF generation for desktop
  const handlePrint = async () => {
    const printElement =
      receiptType === "thermal"
        ? thermalReceiptRef.current
        : receiptRef.current;
    if (!printElement) return;

    setIsPrinting(true);

    try {
      if (receiptType === "thermal") {
        const saleWithPayments = { ...sale, payments: payments || [] };
        const receiptData = await generateThermalReceipt(
          saleWithPayments,
          activeSettings,
          displayCurrency,
        );

        // Always use public API (prefers bridge now)
        await print(receiptData, activeSettings.defaultPrinterName);

        if (isPrinting) return;
        return;
      }

      toast.success("Preparing receipt for printing...");

      if (isMobileDevice) {
        const baseDocumentName =
          sale.paymentStatus === "Quote"
            ? "Quotation"
            : sale.paymentStatus === "Paid"
            ? "Receipt"
            : "Invoice";

        directPrint(printElement, baseDocumentName);
        toast.success("Print dialog opened!");
      } else {
        const { generateReceiptVectorPDF } = await import(
          "@/utils/generateReceiptVectorPDF"
        );
        const receiptData = createReceiptData();
        const pdfBlob = await generateReceiptVectorPDF(receiptData, {
          returnBlob: true,
          saleId: sale.id, // Pass saleId
        });

        if (pdfBlob) {
          const blobUrl = URL.createObjectURL(pdfBlob);
          const printWindow = window.open(blobUrl, "_blank");

          if (printWindow) {
            printWindow.addEventListener("load", () => {
              setTimeout(() => {
                printWindow.focus();
                printWindow.print();
                printWindow.addEventListener("afterprint", () =>
                  printWindow.close(),
                );
              }, 500);
            });
          }

          setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
        }

        toast.success("Print dialog opened!");
      }
    } catch (error) {
      console.error("Error printing receipt:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to print receipt. Please try again.",
      );
    } finally {
      setIsPrinting(false);
    }
  };

  // Show loading state while business settings are loading
  if (settingsLoading) {
    return (
      <div
        className={`bg-white ${isMobile ? "p-2" : "p-6"} rounded-lg shadow-md`}>
        <div className="mb-4 flex justify-between items-center flex-wrap">
          <h2
            className={`${
              isMobile ? "text-xl" : "text-2xl"
            } font-bold text-sales-primary`}>
            {documentTitle}
          </h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Loading business settings...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white ${isMobile ? "p-2" : "p-6"} rounded-lg shadow-md`}>
      <div className="mb-4 flex justify-between items-center flex-wrap">
        <h2
          className={`${
            isMobile ? "text-xl" : "text-2xl"
          } font-bold text-sales-primary`}>
          {documentTitle}
        </h2>

        <div className="print:hidden flex space-x-2 mt-2 sm:mt-0">
          {/* Smart Print button - handles both Standard (System Print) and Thermal (Direct/Bridge) */}
          {!isMobile && (
            <Button
              variant="default"
              size="default"
              onClick={handlePrint}
              disabled={isPrinting || isDownloading || isSharing}
              className="flex items-center"
              title="Print">
              {isPrinting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
            </Button>
          )}

          {/* Other actions moved to a dropdown or kept separate? User said 'just one print button'. 
              I'll keep Download and Share but grouped to keep 'Print' as the ONE print action. */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size={isMobile ? "sm" : "default"}
              onClick={handleDownloadPDF}
              disabled={isPrinting || isDownloading || isSharing}
              className="flex items-center"
              title="Download PDF">
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size={isMobile ? "sm" : "default"}
              onClick={handleShare}
              disabled={isPrinting || isDownloading || isSharing}
              className="flex items-center"
              title="Share">
              {isSharing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
            </Button>

            {/* Mobile Bluetooth Print App Integration - Visible only on mobile for the app */}
            {isMobile && (
              <Button
                variant="outline"
                size={isMobile ? "sm" : "default"}
                onClick={async () => {
                  const ua = navigator.userAgent || "";
                  const isAndroidActual = /android/i.test(ua);
                  const isIOSActual =
                    !isAndroidActual &&
                    (/iPad|iPhone|iPod/.test(ua) ||
                      (navigator.platform === "MacIntel" &&
                        navigator.maxTouchPoints > 1));

                  // Diagnostics
                  console.warn("--- MOBILE PRINT START ---");
                  console.warn("User Agent:", ua);
                  console.warn("isAndroid (Direct Check):", isAndroidActual);
                  console.warn("isIOS (Direct Check):", isIOSActual);

                  const platformParam = isAndroidActual
                    ? "platform=android"
                    : isIOSActual
                    ? "platform=ios"
                    : "default";
                  const baseUrl = getBaseUrl();
                  const functionUrl = `${baseUrl}/api/print-receipt?id=${sale.id}&${platformParam}`;
                  setIsPrinting(true);
                  try {
                    console.log("Fetching from:", functionUrl);
                    const response = await fetch(functionUrl);

                    if (!response.ok) {
                      const errorBody = await response.text();
                      console.error(
                        "Print Function Error:",
                        response.status,
                        errorBody,
                      );
                      throw new Error(
                        `Server ${response.status}: ${
                          errorBody || "Bad Request"
                        }`,
                      );
                    }

                    const data = await response.json();
                    console.log("Data fetched successfully");

                    if (isAndroidActual) {
                      console.log(
                        "Redirecting to Android App using RAW URL...",
                      );
                      window.location.href = `my.bluetoothprint.scheme://${functionUrl}`;
                    } else if (isIOSActual) {
                      console.log("Redirecting to iOS App (Direct Push)...");
                      const encodedJSON = encodeURIComponent(
                        JSON.stringify(data),
                      );
                      window.location.href = `thermer://print?data=${encodedJSON}`;
                    } else {
                      toast.error(
                        "Mobile printing is optimized for iOS and Android",
                      );
                    }
                  } catch (error) {
                    console.error("Unified Print Error:", error);
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Failed to prepare receipt",
                    );
                  } finally {
                    setIsPrinting(false);
                    console.warn("--- MOBILE PRINT END ---");
                  }
                }}
                className="flex items-center text-blue-600 border-blue-200 hover:bg-blue-50"
                title="Print">
                {isPrinting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4 print:hidden">
        <div className="flex items-center space-x-3">
          <label htmlFor="receipt-type" className="text-sm font-medium">
            Receipt Format:
          </label>
          <Select
            value={receiptType}
            onValueChange={(value: ReceiptType) => setReceiptType(value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select receipt type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard Receipt</SelectItem>
              <SelectItem value="thermal">Thermal Receipt</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div ref={receiptRef}>
        {receiptType === "thermal" ? (
          <div ref={thermalReceiptRef}>
            <ThermalReceipt
              sale={sale}
              currency={displayCurrency}
              includePaymentInfo={includePaymentInfo}
            />
          </div>
        ) : (
          <div
            className={`border-[1.5px] border-black ${
              isMobile ? "p-3" : "p-6"
            } rounded-md`}>
            <div className="flex flex-col items-center mb-4 gap-2 text-center w-full">
              <div className="w-full">
                <div className="text-lg sm:text-2xl font-bold text-gray-900 mb-1">
                  {activeSettings.businessName?.toUpperCase()}
                </div>
                <div
                  className={`${
                    isMobile ? "text-xs" : "text-sm"
                  } text-gray-600 font-medium`}>
                  {activeSettings.businessAddress}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">
                  Phone: {activeSettings.businessPhone} | Email:{" "}
                  {activeSettings.businessEmail}
                </div>
              </div>
            </div>

            <Separator className="my-3 sm:my-4 border-black border-t-[1.5px]" />

            <div className="text-center mb-4">
              <h1
                className={`font-bold ${
                  isMobile ? "text-xl" : "text-2xl"
                } uppercase tracking-wider text-gray-900`}>
                {sale.paymentStatus === "Quote"
                  ? "QUOTATION"
                  : (sale.paymentStatus === "Paid" || sale.paymentStatus === "COMPLETED")
                  ? "SALES RECEIPT"
                  : "INVOICE"}
              </h1>
            </div>

            <div className="flex justify-between mb-4 sm:mb-6 text-sm flex-wrap gap-2">
              <div>
                <div className="font-semibold">
                  {documentNumberLabel} {sale.receiptNumber}
                </div>
                <div>Date: {format(receiptDate, "MMM dd, yyyy")}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{sale.paymentStatus}</div>
              </div>
            </div>

            <div className="mb-4 sm:mb-6">
              <h3 className="font-semibold mb-2 text-sm">
                Customer Information:
              </h3>
              <div className="text-sm">
                <div>{sale.customerName}</div>
                <div>{sale.customerAddress}</div>
                <div>{sale.customerContact}</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {/* Desktop Table View */}
              <div className="hidden sm:block">
                <table className="w-full mb-4 sm:mb-6 text-sm">
                  <thead>
                    <tr className="border-black border-b-[1.5px]">
                      <th className="py-2 text-left bg-gray-200 px-2">
                        Description
                      </th>
                      <th className="py-2 text-right bg-gray-200 px-2">Qty</th>
                      <th className="py-2 text-right bg-gray-200 px-2">
                        Unit Price
                      </th>
                      <th className="py-2 text-right bg-gray-200 px-2">
                        Discount
                      </th>
                      <th className="py-2 text-right bg-gray-200 px-2">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.items.map((item: any, index: any) => {
                      const itemPrice = toSafeNum(item.price);
                      const itemQty = toSafeNum(item.quantity);
                      const itemSubtotal = itemPrice * itemQty;

                      const discountAmount =
                        item.discountType === "amount"
                          ? toSafeNum(item.discountAmount)
                          : (itemSubtotal *
                              toSafeNum(item.discountPercentage)) /
                            100;
                      const finalAmount = itemSubtotal - discountAmount;

                      return (
                        <tr key={index} className="border-b border-black">
                          <td className="py-2 sm:py-3 break-all whitespace-normal">
                            {item.description}
                          </td>
                          <td className="py-2 sm:py-3 text-right">
                            {formatNumber(itemQty)}
                          </td>
                          <td className="py-2 sm:py-3 text-right">
                            {displayCurrency} {formatNumber(itemPrice)}
                          </td>
                          <td className="py-2 sm:py-3 text-right">
                            {item.discountType === "amount"
                              ? discountAmount > 0
                                ? `${displayCurrency} ${formatNumber(
                                    discountAmount,
                                  )}`
                                : "-"
                              : toSafeNum(item.discountPercentage) > 0
                              ? `${item.discountPercentage}%`
                              : "-"}
                          </td>
                          <td className="py-2 sm:py-3 text-right">
                            {displayCurrency} {formatNumber(finalAmount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot><tr className="border-black border-t-[1.5px]">
                        <td
                          colSpan={4}
                          className="py-2 text-right font-medium bg-gray-200 px-2">
                          Subtotal (before discount):
                        </td>
                        <td className="py-2 text-right bg-gray-200 px-2">
                          {displayCurrency}{" "}
                          {formatNumber(subtotal + totalDiscount)}
                        </td>
                      </tr>{totalDiscount > 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-2 text-right font-medium bg-orange-100 px-2">
                            Total Discount:
                          </td>
                          <td className="py-2 text-right bg-orange-100 px-2">
                            -{displayCurrency} {formatNumber(totalDiscount)}
                          </td>
                        </tr>
                      )}<tr>
                        <td
                          colSpan={4}
                          className="py-2 text-right font-medium bg-gray-200 px-2">
                          Subtotal:
                        </td>
                        <td className="py-2 text-right bg-gray-200 px-2">
                          {displayCurrency} {formatNumber(subtotal)}
                        </td>
                      </tr>{showTaxRow && (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-2 text-right font-medium bg-gray-200 px-2">
                            Tax ({taxRate}%):
                          </td>
                          <td className="py-2 text-right bg-gray-200 px-2">
                            {displayCurrency} {formatNumber(taxAmount)}
                          </td>
                        </tr>
                      )}<tr className="border-black border-t-[1.5px] font-bold">
                      <td
                        colSpan={4}
                        className="py-2 sm:py-3 text-right bg-gray-300 px-2">
                        Total:
                      </td>
                      <td className="py-2 sm:py-3 text-right bg-gray-300 px-2">
                        {displayCurrency} {formatNumber(totalAmount)}
                      </td>
                    </tr>{isInstallmentSale && (
                      <>
                        <tr>
                          <td
                            colSpan={4}
                            className="py-2 text-right font-medium bg-blue-100 px-2">
                            Amount Paid:
                          </td>
                          <td className="py-2 text-right bg-blue-100 px-2">
                            {displayCurrency} {formatNumber(displayAmountPaid)}
                          </td>
                        </tr>
                        <tr>
                          <td
                            colSpan={4}
                            className="py-2 text-right font-medium bg-red-100 px-2">
                            Amount Due:
                          </td>
                          <td className="py-2 text-right bg-red-100 px-2">
                            {displayCurrency} {formatNumber(displayAmountDue)}
                          </td>
                        </tr>
                      </>
                    )}<tr>
                      <td
                        colSpan={5}
                        className="py-2 sm:py-3 text-left border-t border-black px-2 italic">
                        <span className="font-medium">Amount in words:</span>{" "}
                        {displayCurrency} {totalAmountInWords} only
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile Stacked View */}
              <div className="block sm:hidden">
                <div className="border-b-2 border-black mb-2 pb-1 font-bold">
                  Items
                </div>
                {sale.items.map((item: any, index: any) => {
                  const itemPrice = toSafeNum(item.price);
                  const itemQty = toSafeNum(item.quantity);
                  const itemSubtotal = itemPrice * itemQty;

                  const discountAmount =
                    item.discountType === "amount"
                      ? toSafeNum(item.discountAmount)
                      : (itemSubtotal * toSafeNum(item.discountPercentage)) /
                        100;
                  const finalAmount = itemSubtotal - discountAmount;

                  return (
                    <div
                      key={index}
                      className="mb-3 border-b border-gray-200 pb-2 last:border-0">
                      <div className="font-bold text-sm mb-1 break-all whitespace-normal">
                        {item.description}
                      </div>
                      <div className="flex justify-between text-sm">
                        <div className="text-gray-600">
                          {formatNumber(itemQty)} x {displayCurrency}{" "}
                          {formatNumber(itemPrice)}
                        </div>
                        <div className="font-bold">
                          {displayCurrency} {formatNumber(finalAmount)}
                        </div>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-xs text-orange-600 italic mt-0.5">
                          <span>
                            Discount{" "}
                            {item.discountType === "percentage"
                              ? `(${item.discountPercentage}%)`
                              : ""}
                          </span>
                          <span>
                            -{displayCurrency} {formatNumber(discountAmount)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Mobile Totals */}
                <div className="mt-4 border-t-2 border-black pt-2 space-y-1">
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">
                        Subtotal (before disc):
                      </span>
                      <span>
                        {displayCurrency}{" "}
                        {formatNumber(subtotal + totalDiscount)}
                      </span>
                    </div>
                    {totalDiscount > 0 && (
                      <div className="flex justify-between text-sm text-orange-600">
                        <span className="font-medium">Total Discount:</span>
                        <span>
                          -{displayCurrency} {formatNumber(totalDiscount)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Subtotal:</span>
                      <span>
                        {displayCurrency} {formatNumber(subtotal)}
                      </span>
                    </div>
                  </>

                  {showTaxRow && (
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Tax ({taxRate}%):</span>
                      <span>
                        {displayCurrency} {formatNumber(taxAmount)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-base font-bold border-t border-black pt-1 mt-1">
                    <span>Total:</span>
                    <span>
                      {displayCurrency} {formatNumber(totalAmount)}
                    </span>
                  </div>

                  {isInstallmentSale && (
                    <>
                      <div className="flex justify-between text-sm text-blue-600 pt-1">
                        <span className="font-medium">Amount Paid:</span>
                        <span>
                          {displayCurrency} {formatNumber(displayAmountPaid)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-red-600">
                        <span className="font-medium">Amount Due:</span>
                        <span>
                          {displayCurrency} {formatNumber(displayAmountDue)}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="pt-2 text-xs italic border-t border-gray-200 mt-2">
                    <span className="font-medium">Words:</span>{" "}
                    {displayCurrency} {totalAmountInWords} only
                  </div>
                </div>
              </div>
            </div>

            {hasPaymentInfo && (
              <div className="mt-4 pt-3 border-t border-black">
                <h3 className="font-semibold text-sm mb-2">
                  Payment Information:
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-200">
                        <th className="font-medium py-1 px-2 text-left">
                          Payment Method
                        </th>
                        <th className="font-medium py-1 px-2 text-left">
                          Account Number
                        </th>
                        <th className="font-medium py-1 px-2 text-left">
                          Account Name
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentMethods
                        .filter(
                          (payment) =>
                            payment.method.trim() !== "" ||
                            payment.accountNumber.trim() !== "" ||
                            payment.accountName.trim() !== "",
                        )
                        .map((payment, index) => (
                          <tr key={index}>
                            <td className="py-1 px-2 font-medium">
                              {payment.method}
                            </td>
                            <td className="py-1 px-2">
                              {payment.accountNumber}
                            </td>
                            <td className="py-1 px-2">{payment.accountName}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {sale.notes && (
              <div className="mt-4 pt-3 border-t border-black">
                <h3 className="font-semibold text-sm mb-2">Notes:</h3>
                <div className="text-sm whitespace-pre-wrap">{sale.notes}</div>
              </div>
            )}

            <div className="text-center text-xs sm:text-sm mt-4 sm:mt-8">
              <p className="font-medium">Thank you for your business!</p>
              <p className="text-gray-600 text-xs mt-3">
                Created by Gonza Systems
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrintableReceipt;
