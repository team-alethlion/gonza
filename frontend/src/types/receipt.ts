
export interface ReceiptData {
  // Document info
  documentTitle: string;
  documentNumberLabel: string;
  receiptNumber: string;
  date: string;
  time: string;
  status: string;

  // Business info
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  businessLogo?: string;
  signature?: string;

  // Customer info
  customerName: string;
  customerAddress?: string;
  customerContact?: string;

  // Items
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    discountPercentage?: number;
    discountAmount?: number;
    discountType?: 'percentage' | 'amount';
    amount: number;
  }>;

  // Totals
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  totalAmount: number;
  amountPaid?: number;
  amountDue?: number;
  isInstallmentSale: boolean;
  totalAmountInWords: string;

  // Payment info
  paymentMethods?: Array<{
    method: string;
    accountNumber: string;
    accountName: string;
  }>;

  // Display settings
  currency: string;
  showTaxRow: boolean;
  hasPaymentInfo: boolean;
  notes?: string;
}
