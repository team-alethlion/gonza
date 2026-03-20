import { format } from "date-fns";
import { formatNumber } from "@/lib/utils";
import { numberToWords } from "@/utils/numberToWords";
import { parsePaymentInfo } from "@/hooks/useBusinessSettings";

// ESC/POS Alignment Commands
const ALIGN_LEFT = "\x1Ba\x00";
const ALIGN_CENTER = "\x1Ba\x01";
const RESET_MARGIN = "\x1dL\x00\x00";
const SET_WIDTH_384 = "\x1dW\x80\x01";
const DOUBLE_WIDTH_ON = "\x1B!\x20";
const DOUBLE_WIDTH_OFF = "\x1B!\x00";

// Helpers
function padRight(text: string, width: number) {
  text = text || "";
  return text.length >= width ? text.slice(0, width) : text + " ".repeat(width - text.length);
}

function padLeft(text: string, width: number) {
  text = text || "";
  return text.length >= width ? text.slice(0, width) : " ".repeat(width - text.length) + text;
}

function centerText(text: string, width: number = 32) {
  text = text || "";
  if (text.length >= width) return text.slice(0, width);
  const padding = Math.floor((width - text.length) / 2);
  return " ".repeat(padding) + text;
}

export function generateThermalText(sale: any, settings: any, currency?: string) {
  const displayCurrency = currency || settings.currency || '';
  const is80mm = settings.printerPaperSize === '80mm';
  let currentPadding = ""; // Start with no padding for header
  let activeContentWidth = is80mm ? 42 : 32;
  const line = () => "-".repeat(activeContentWidth);
  const doubleLine = () => "=".repeat(activeContentWidth);
  let text = "";

  const addLine = (content: string) => {
    text += currentPadding + content + "\n";
  };

  // Hard Reset Everything
  text += RESET_MARGIN + SET_WIDTH_384;

  // ===== Business Header =====
  // 58mm: Align Left (0 margin)
  // 80mm: Align Center

  if (is80mm) {
    text += ALIGN_CENTER;
  } else {
    text += ALIGN_LEFT;
  }

  text += doubleLine() + "\n";
  if (settings.businessName) {
    text += DOUBLE_WIDTH_ON + settings.businessName.toUpperCase() + DOUBLE_WIDTH_OFF + "\n";
  }
  if (settings.businessAddress) text += settings.businessAddress + "\n";
  if (settings.businessPhone) text += `Tel: ${settings.businessPhone}` + "\n";
  if (settings.businessEmail) text += settings.businessEmail + "\n";
  text += doubleLine() + "\n";


  // ===== Document Title =====
  const titleMap: Record<string, string> = {
    "Quote": "QUOTATION",
    "Paid": "SALES RECEIPT",
    "Installment Sale": "INSTALLMENT SALE",
    "NOT PAID": "INVOICE",
  };
  const docTitle = titleMap[sale.paymentStatus] || "INVOICE";
  text += docTitle + "\n";
  text += line() + "\n";

  // ===== Receipt Info (Apply 10mm padding & Left Align) =====
  // For 80mm we might keep it left aligned or centered, usually detailed info is better left aligned even on 80mm
  // But user request was "80mm we have everything centered". 
  // Let's interpret "everything" as the main alignment mode.
  // However, tables (Item/Qty/Tot) look bad if centered line by line. 
  // Standard practice for 80mm is centered header/footer, left aligned body.
  // BUT the user specifically asked "80mm we have everything centered".
  // Let's try to center the Body too if requested, but table data usually stays left/structured.
  // actually, for 'text' based thermal (ESC/POS), centering table rows just centers the string.

  if (is80mm) {
    text += ALIGN_CENTER;
  } else {
    text += ALIGN_LEFT;
  }
  // currentPadding = "      ";
  // activeContentWidth = 26; // Reduce content width (32 - 6 spaces = 26)
  addLine(padRight("Receipt #:", 13) + padLeft(sale.receiptNumber || '', 13));
  addLine(padRight("Date:", 13) + padLeft(format(new Date(sale.date || Date.now()), "dd/MM/yy HH:mm"), 13));
  addLine(padRight("Status:", 13) + padLeft(sale.paymentStatus || '', 13));
  addLine(line());

  // ===== Customer Info =====
  if (sale.customerName) {
    addLine(padRight("Cust:", 10) + padLeft(sale.customerName || '', 16));
    if (sale.customerAddress) addLine(padRight("Addr:", 10) + padLeft(sale.customerAddress, 16));
    addLine(line());
  }

  // ===== Items =====
  // ===== Items =====
  // 58mm (32 chars): Item(12) + Gap(1) + Qty(5) + Tot(14) = 32
  // 80mm (42 chars): Item(21) + Gap(1) + Qty(6) + Tot(14) = 42
  const itemGap = is80mm ? " " : " ";
  const itemW = is80mm ? 21 : 12;
  const qtyW = is80mm ? 6 : 5;
  const totW = 14;

  addLine(padRight("Item", itemW) + itemGap + padLeft("Qty", qtyW) + padLeft("Tot", totW));
  addLine("-".repeat(activeContentWidth));

  let subtotalBeforeDiscount = 0;
  let totalDiscountAmount = 0;

  Array.isArray(sale.items) && sale.items.forEach((item: any) => {
    const quantity = item.quantity || 0;
    const price = item.price || 0;
    const subtotal = quantity * price;
    const discount = item.discountAmount ?? ((subtotal * (item.discountPercentage || 0)) / 100);
    const total = subtotal - discount;

    subtotalBeforeDiscount += subtotal;
    totalDiscountAmount += discount;

    addLine(padRight(item.description || '', itemW) + itemGap + padLeft(String(quantity), qtyW) + padLeft(formatNumber(total), totW));
    if (discount > 0) {
      const discText = item.discountType === "amount" ? "" : `(${item.discountPercentage || 0}%)`;
      addLine(padRight(`Disc ${discText}`, itemW) + itemGap + padLeft("", qtyW) + padLeft(`-${formatNumber(discount)}`, totW));
    }
  });

  addLine(line());

  // ===== Totals (Vertical Layout as requested) =====
  const subtotalAfterDiscount = subtotalBeforeDiscount - totalDiscountAmount;
  const taxRate = sale.taxRate || 0;
  const taxAmount = subtotalAfterDiscount * (taxRate / 100);
  const totalAmount = subtotalAfterDiscount + taxAmount;

  // For installment sales, sum up all payments from history if available
  const totalPaidFromHistory = Array.isArray(sale.payments)
    ? sale.payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
    : 0;

  const amountPaid = (sale.paymentStatus === 'Installment Sale' && totalPaidFromHistory > 0)
    ? totalPaidFromHistory
    : (Number(sale.amountPaid) || 0);

  const amountDue = sale.paymentStatus === 'Installment Sale'
    ? Math.max(0, totalAmount - totalPaidFromHistory)
    : Math.max(0, totalAmount - amountPaid);

  addLine("Subtotal:");
  addLine(`${displayCurrency} ${formatNumber(subtotalBeforeDiscount)}`);

  if (totalDiscountAmount > 0) {
    addLine("Total Discount:");
    addLine(`-${displayCurrency} ${formatNumber(totalDiscountAmount)}`);
  }

  if (taxRate > 0) {
    addLine(`Tax (${taxRate}%):`);
    addLine(`${displayCurrency} ${formatNumber(taxAmount)}`);
  }

  addLine("TOTAL:");
  addLine(`${displayCurrency} ${formatNumber(totalAmount)}`);

  if (sale.paymentStatus === "Installment Sale") {
    addLine("Amount Paid:");
    addLine(`${displayCurrency} ${formatNumber(amountPaid)}`);

    addLine("Amount Due:");
    addLine(`${displayCurrency} ${formatNumber(amountDue)}`);
  }

  text += currentPadding + `Words: ${numberToWords(totalAmount)} only\n`;
  addLine(line());

  // Reset padding and reset printer margin for the rest
  currentPadding = "";
  activeContentWidth = 32;
  text += RESET_MARGIN;

  // ===== Notes =====
  if (sale.notes) {
    text += currentPadding + "Notes:\n" + currentPadding + sale.notes + "\n";
    addLine(line());
  }

  // ===== Payment Info =====
  if (is80mm) text += ALIGN_CENTER; // Center payment methods if 80mm
  else text += ALIGN_LEFT;

  const paymentMethods = settings.paymentInfo ? parsePaymentInfo(settings.paymentInfo) : [];
  if (Array.isArray(paymentMethods) && paymentMethods.length > 0) {
    paymentMethods.forEach((p: any) => {
      if (p.method || p.accountNumber || p.accountName) {
        if (p.method) text += p.method + "\n";
        if (p.accountNumber) text += `Acc: ${p.accountNumber}` + "\n";
        if (p.accountName) text += `Name: ${p.accountName}` + "\n";
        text += line() + "\n";
      }
    });
  }


  // ===== Footer =====
  if (is80mm) text += ALIGN_CENTER; // Center footer if 80mm
  else text += ALIGN_LEFT;

  text += "Thank you for your business!" + "\n";
  text += "Created by Gonza Systems" + "\n";
  text += doubleLine() + "\n";

  return text;
}
