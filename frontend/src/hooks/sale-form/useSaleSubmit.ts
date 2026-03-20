import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sale, mapSaleToDbSale, SaleItem } from "@/types";
import { upsertSaleAction } from "@/app/actions/sales";
import { queueOfflineSale } from "@/hooks/useOfflineSync";
import { updateSaleCashTransactionAction } from "@/app/actions/products";

interface UseSaleSubmitProps {
  initialData?: Sale;
  formData: any;
  selectedDate: Date;
  currentBusiness: any;
  user: any;
  cashTransactionId: string | null;
  setCashTransactionId: (id: string | null) => void;
  originalPaymentStatus: string;
  linkToCash: boolean;
  selectedCashAccountId: string;
  calculateTotalAmount: (items: any[]) => number;
  calculateTaxAmount: (subtotal: number) => number;
  validateForm: (grandTotal: number, date: Date) => boolean;
  errors: any;
  hasChanges: boolean;
  processPendingPaymentChanges: () => Promise<void>;
  createInstallmentPayment: (data: any) => Promise<any>;
  updateStockHistoryDatesBySaleId: (id: string, date: Date) => Promise<any>;
  createCashTransactionForSale: (sale: any, total: number, link: boolean, account: string, date: Date, status: string) => Promise<any>;
  updateCashTransactionForSale: (sale: any, total: number, txId: string | null, oldStatus: string, newStatus: string, link: boolean, account: string, date: Date) => Promise<any>;
  createInstallmentPaymentWithCash: (saleId: string, amount: number, notes: string, link: boolean, account: string, businessId: string, createFn: any) => Promise<any>;
  onSaleComplete?: any;
  printAfterSave: boolean;
  includePaymentInfo: boolean;
  selectedCustomerCategoryId: string;
  onClearDraft?: () => void;
  thermalPrintAfterSave: boolean;
  sendSMS: boolean;
  smsMessage: string;
  createMessage: (data: any) => Promise<any>;
  customers: any[];
  paymentDate: Date;
}

export const useSaleSubmit = (props: UseSaleSubmitProps) => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const calculateTotalProfit = (items: any[]) => {
    return items.reduce((total, item: any) => {
      const subtotal = item.price * item.quantity;
      const discountAmount = item.discountType === "amount" ? item.discountAmount || 0 : (subtotal * (item.discountPercentage || 0)) / 100;
      const effectiveRevenue = subtotal - discountAmount;
      return total + (effectiveRevenue - (item.cost * item.quantity));
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = props.calculateTotalAmount(props.formData.items);
    const taxAmount = props.calculateTaxAmount(totalAmount);
    const grandTotal = totalAmount + taxAmount;

    if (!props.validateForm(grandTotal, props.selectedDate)) {
      if (props.errors.customerName) toast.error(props.errors.customerName);
      else toast.error("Please fill in all required fields correctly");
      return;
    }

    setLoading(true);
    try {
      const receiptNumber = props.initialData?.receiptNumber || (await import('@/utils/generateReceiptNumber').then(m => m.generateReceiptNumber(props.currentBusiness?.id || "")));
      const profit = calculateTotalProfit(props.formData.items);
      let finalCashTransactionId = props.cashTransactionId;

      if (props.initialData) {
        finalCashTransactionId = await props.updateCashTransactionForSale(
          { id: props.initialData.id, customerName: props.formData.customerName, receiptNumber: props.initialData.receiptNumber, items: props.formData.items },
          grandTotal, props.cashTransactionId, props.originalPaymentStatus, props.formData.paymentStatus, props.linkToCash, props.selectedCashAccountId, props.selectedDate
        );
        props.setCashTransactionId(finalCashTransactionId);
      }

      const saleDbData = mapSaleToDbSale(
        props.formData, 
        props.selectedDate, 
        profit, 
        receiptNumber || "", 
        props.user?.id || "", 
        props.currentBusiness?.id || "", 
        finalCashTransactionId
      );

      const { success, data: saleResult, error } = await upsertSaleAction(saleDbData, !!props.initialData, props.initialData?.id);
      if (!success || !saleResult) throw new Error(error || "Failed to save sale");
      const result = saleResult as any;

      const sale: Sale = {
        id: result.id,
        receiptNumber: result.receiptNumber,
        customerName: result.customerName,
        customerAddress: result.customerAddress || "",
        customerContact: result.customerContact || "",
        customerId: result.customerId || undefined,
        items: (result.items || []).map((si: any) => ({
          ...si,
          description: si.description || si.product_name || 'Product',
          price: Number(si.price || si.unit_price || 0),
          quantity: Number(si.quantity || 0),
          total: Number(si.total || 0),
          cost: Number(si.cost || si.cost_price || 0)
        })),
        paymentStatus: result.paymentStatus,
        profit: Number(result.profit || 0),
        date: new Date(result.date),
        taxRate: result.taxRate ? Number(result.taxRate) : 0,
        cashTransactionId: result.cashTransactionId || undefined,
        amountPaid: Number(result.amountPaid || result.amount_paid || 0),
        amountDue: Number(result.amountDue || result.balance_due || 0),
        notes: result.notes || '',
        categoryId: result.categoryId || undefined,
        total: Number(result.total || result.total_amount || 0),
        totalCost: Number(result.totalCost || result.total_cost || 0),
        subtotal: Number(result.subtotal || 0),
        discount: Number(result.discount || result.discount_amount || 0),
        taxAmount: Number(result.taxAmount || result.tax_amount || 0),
        createdAt: new Date(result.createdAt),
        updatedAt: new Date(result.updatedAt || result.createdAt),
      };

      if (props.initialData) {
        if (props.hasChanges) await props.processPendingPaymentChanges();
        if (props.formData.paymentStatus === "Installment Sale" && props.formData.amountPaid) {
          await props.createInstallmentPayment({ saleId: sale.id, amount: props.formData.amountPaid, notes: sale.items.map((i) => i.description).join(", "), paymentDate: props.paymentDate, accountId: props.linkToCash ? props.selectedCashAccountId : undefined, locationId: props.currentBusiness?.id });
        }
        if (props.initialData.date.getTime() !== props.selectedDate.getTime()) await props.updateStockHistoryDatesBySaleId(sale.id, props.selectedDate);
      } else {
        const newCashId = await props.createCashTransactionForSale(sale, grandTotal, props.linkToCash, props.selectedCashAccountId, props.selectedDate, props.formData.paymentStatus);
        if (newCashId) {
          await updateSaleCashTransactionAction(sale.id, newCashId);
          sale.cashTransactionId = newCashId;
        }
        if (props.formData.paymentStatus === "Installment Sale" && props.formData.amountPaid) {
          await props.createInstallmentPaymentWithCash(sale.id, props.formData.amountPaid, sale.items.map((i) => i.description).join(", "), props.linkToCash, props.selectedCashAccountId, props.currentBusiness?.id || "", props.createInstallmentPayment);
        }
      }

      if (props.onSaleComplete) {
        await props.onSaleComplete(sale, props.printAfterSave, props.includePaymentInfo, props.selectedCustomerCategoryId, props.onClearDraft, props.selectedDate, props.thermalPrintAfterSave);
      }

      toast.success(props.initialData ? "Sale updated successfully!" : "Sale recorded successfully!");

      if (props.sendSMS && props.formData.customerContact && !props.initialData) {
        try {
          await props.createMessage({
            phoneNumber: props.formData.customerContact,
            content: props.smsMessage,
            customerId: props.customers.find((c) => c.phoneNumber === props.formData.customerContact)?.id,
            metadata: { sale_id: sale.id, receipt_number: sale.receiptNumber, type: "thank_you" },
          });
          toast.success("Thank you SMS sent!");
        } catch (e) { toast.error("SMS failed"); }
      }

      if (!props.onSaleComplete) router.push("/agency/sales");
      return true;
    } catch (error: any) {
      toast.error(error.message || "An error occurred.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { loading, handleSubmit };
};
