import { format } from "date-fns";
import { formatNumber } from "@/lib/utils";
import { numberToWords } from "@/utils/numberToWords";
import { parsePaymentInfo } from "@/hooks/useBusinessSettings";
import { Sale, BusinessSettings } from "@/types";

export interface BluetoothPrintItem {
    type: number; // 0: text, 1: image, 2: barcode, 3: QR, 4: HTML
    content?: string;
    path?: string; // for image
    value?: string; // for barcode/QR
    bold?: number; // 0: no, 1: yes
    align?: number; // 0: left, 1: center, 2: right
    format?: number; // 0: normal, 1: double height, 2: double height + width, 3: double width, 4: small
    width?: number; // for barcode
    height?: number; // for barcode
    size?: number; // for QR
}

export function generateBluetoothPrintJSON(sale: Sale, settings: BusinessSettings, currency?: string): BluetoothPrintItem[] {
    const displayCurrency = currency || settings.currency || '';
    const result: BluetoothPrintItem[] = [];

    // Redefine formatNumber locally to ensure 0 fraction digits
    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(num);
    };

    // Helper to add text
    const addText = (content: string, bold: number = 0, align: number = 0, format: number = 0) => {
        result.push({
            type: 0,
            content,
            bold,
            align,
            format
        });
    };

    // Helper for separator
    const addSeparator = (char: string = '-') => {
        addText(char.repeat(32)); // Standard 58mm width approx
    };

    // Business Header
    addSeparator('=');
    if (settings.businessName) {
        addText(settings.businessName.toUpperCase(), 1, 1, 2); // Bold, Center, Double Height+Width
    }
    addSeparator('=');

    if (settings.businessAddress) addText(settings.businessAddress, 0, 1);
    if (settings.businessPhone) addText(`Tel: ${settings.businessPhone}`, 0, 1);
    if (settings.businessEmail) addText(settings.businessEmail, 0, 1);
    addSeparator('-');

    // Document Title
    const titleMap: Record<string, string> = {
        "Quote": "QUOTATION",
        "Paid": "SALES RECEIPT",
        "Installment Sale": "INSTALLMENT SALE",
        "NOT PAID": "INVOICE",
    };
    const docTitle = titleMap[sale.paymentStatus] || "INVOICE";
    addText(docTitle, 1, 1, 1); // Bold, Center, Double Height
    addSeparator('-');

    // Receipt Info
    addText(`Receipt #: ${sale.receiptNumber || ''}`);
    addText(`Date: ${format(new Date(sale.date || Date.now()), "dd/MM/yy HH:mm")}`);
    addText(`Status: ${sale.paymentStatus || ''}`);
    addSeparator('-');

    // Customer Info
    if (sale.customerName) {
        addText(`Customer: ${sale.customerName}`);
        if (sale.customerAddress) addText(`Address: ${sale.customerAddress}`);
        if (sale.customerContact) addText(`Contact: ${sale.customerContact}`);
        addSeparator('-');
    }

    // Items Header
    // Item (12) + Qty (5) + Total (14) = 31 chars approx
    // Item (13) + Qty (8) + Total (11) = 32 chars
    addText("Item          Qty       Total", 1, 1);
    addSeparator('-');

    let subtotalBeforeDiscount = 0;
    let totalDiscountAmount = 0;

    sale.items.forEach((item) => {
        const quantity = item.quantity || 0;
        const price = item.price || 0;
        const subtotal = quantity * price;
        const discount = item.discountAmount ?? ((subtotal * (item.discountPercentage || 0)) / 100);
        const total = subtotal - discount;

        subtotalBeforeDiscount += subtotal;
        totalDiscountAmount += discount;

        // Format: "Description (trimmed)   Qty   Total"
        // Format: "Description (trimmed)   Qty   Total"
        const desc = (item.description || '').substring(0, 12).padEnd(13);
        const qty = String(quantity).padStart(4).padEnd(8);
        const tot = formatNumber(total).padStart(8).padEnd(11);
        addText(`${desc}${qty}${tot}`);

        if (discount > 0) {
            const discText = item.discountType === "amount" ? "" : `(${item.discountPercentage || 0}%)`;
            addText(`  Disc ${discText}: -${formatNumber(discount)}`, 0, 0, 4); // Small text
        }
    });

    addSeparator('-');

    // Totals
    const subtotalAfterDiscount = subtotalBeforeDiscount - totalDiscountAmount;
    const taxRate = sale.taxRate || 0;
    const taxAmount = subtotalAfterDiscount * (taxRate / 100);
    const totalAmount = subtotalAfterDiscount + taxAmount;

    const totalPaid = Number(sale.amountPaid) || 0;
    const totalDue = Number(sale.amountDue) || 0;

    addText(`Subtotal: ${displayCurrency} ${formatNumber(subtotalBeforeDiscount)}`, 0, 2);
    if (totalDiscountAmount > 0) {
        addText(`Discount: -${displayCurrency} ${formatNumber(totalDiscountAmount)}`, 0, 2);
    }
    if (taxRate > 0) {
        addText(`Tax (${taxRate}%): ${displayCurrency} ${formatNumber(taxAmount)}`, 0, 2);
    }
    addText(`TOTAL: ${displayCurrency} ${formatNumber(totalAmount)}`, 1, 2, 1);

    if (sale.paymentStatus === "Installment Sale") {
        addText(`Paid: ${displayCurrency} ${formatNumber(totalPaid)}`, 0, 2);
        addText(`Due: ${displayCurrency} ${formatNumber(totalDue)}`, 0, 2);
    }

    addSeparator('-');
    addText(`Amount in words:`, 1);
    addText(`${numberToWords(totalAmount)} only`);
    addSeparator('-');

    // Payment Info
    const paymentMethods = settings.paymentInfo ? parsePaymentInfo(settings.paymentInfo) : [];
    if (paymentMethods.length > 0) {
        paymentMethods.forEach((p) => {
            if (p.method || p.accountNumber || p.accountName) {
                addText(p.method || '', 1);
                if (p.accountNumber) addText(`Acc: ${p.accountNumber}`);
                if (p.accountName) addText(`Name: ${p.accountName}`);
                addSeparator('.');
            }
        });
    }

    // Signature area
    addText("\n\n__________________________", 0, 1);
    addText("Authorized Signature", 0, 1);
    addText("\n");

    // Footer
    addText("Thank you for your business!", 0, 1);
    addText("Created by Gonza Systems", 0, 1, 4); // Small
    addSeparator('=');

    // Empty lines at the end for cutting
    addText("\n\n\n");

    return result;
}
