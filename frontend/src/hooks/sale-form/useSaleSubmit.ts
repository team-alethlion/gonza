/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sale, mapSaleToDbSale, SaleItem } from "@/types";
import { upsertSaleAction } from "@/app/actions/sales";
import { queueOfflineSale } from "@/hooks/useOfflineSync";
import { updateSaleCashTransactionAction } from "@/app/actions/products";
import { localDb } from "@/lib/dexie";

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
  createCashTransactionForSale: (
    sale: any,
    total: number,
    link: boolean,
    account: string,
    date: Date,
    status: string,
  ) => Promise<any>;
  updateCashTransactionForSale: (
    sale: any,
    total: number,
    txId: string | null,
    oldStatus: string,
    newStatus: string,
    link: boolean,
    account: string,
    date: Date,
  ) => Promise<any>;
  createInstallmentPaymentWithCash: (
    saleId: string,
    amount: number,
    notes: string,
    link: boolean,
    account: string,
    businessId: string,
    createFn: any,
  ) => Promise<any>;
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
      const discountAmount =
        item.discountType === "amount"
          ? item.discountAmount || 0
          : (subtotal * (item.discountPercentage || 0)) / 100;
      const effectiveRevenue = subtotal - discountAmount;
      // Profit = Net Revenue (excluding tax) - Total Cost
      return total + (effectiveRevenue - item.cost * item.quantity);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ⚡️ FROZEN DRAFT SNAPSHOT PATTERN ⚡️
    // Deep clone the component state strictly at the moment of submission
    // to insulate it entirely against asynchronous React state purges.
    const frozenDraftState = JSON.parse(JSON.stringify(props.formData));
    const totalAmount = props.calculateTotalAmount(props.formData.items);
    const taxAmount = props.calculateTaxAmount(totalAmount);
    const grandTotal = totalAmount + taxAmount;

    if (!props.validateForm(grandTotal, props.selectedDate)) {
      if (props.errors.customerName) toast.error(props.errors.customerName);
      else toast.error("Please fill in all required fields correctly");
      return;
    }

    // ⚡️ INVENTORY AWARENESS: Pre-submit stock & link check
    // We only do this for REAL sales (not Quotes)
    if (props.formData.paymentStatus !== 'Quote') {
      const untiedItems = props.formData.items.filter((i: any) => !i.productId && (i.description || '').trim());
      
      const oversoldItems = [];
      for (const item of props.formData.items) {
        if (item.productId) {
          const p = await localDb.products.get(item.productId);
          if (p && item.quantity > p.quantity) {
            oversoldItems.push({ name: p.name, stock: p.quantity, sold: item.quantity });
          }
        }
      }

      if (untiedItems.length > 0 || oversoldItems.length > 0) {
        let warningMsg = "Inventory Warning:\n\n";
        if (untiedItems.length > 0) {
          warningMsg += `• ${untiedItems.length} item(s) are NOT linked to inventory (stock will not be tracked).\n`;
        }
        if (oversoldItems.length > 0) {
          warningMsg += `• ${oversoldItems.length} item(s) exceed current stock levels.\n`;
        }
        warningMsg += "\nAre you sure you want to proceed with this sale?";

        if (typeof window !== 'undefined' && !window.confirm(warningMsg)) {
          return; // Abort submission
        }
      }
    }

    setLoading(true);
    try {
      const receiptNumber =
        props.initialData?.receiptNumber ||
        (await import("@/utils/generateReceiptNumber").then((m) =>
          m.generateReceiptNumber(props.currentBusiness?.id || ""),
        ));
      const profit = calculateTotalProfit(props.formData.items);

      const saleDbData = {
        ...mapSaleToDbSale(
          props.formData,
          props.selectedDate,
          profit,
          receiptNumber || "",
          props.user?.id || "",
          props.currentBusiness?.id || "",
          props.cashTransactionId,
        ),
        linkToCash: props.linkToCash,
        cashAccountId: props.selectedCashAccountId,
      };

      const {
        success,
        data: saleResult,
        error,
      } = await upsertSaleAction(
        saleDbData,
        !!props.initialData,
        props.initialData?.id,
      );
      if (!success || !saleResult)
        throw new Error(error || "Failed to save sale");
      const result = saleResult as any;

      const sale: Sale = {
        id: result.id,
        receiptNumber: result.receipt_number || result.receiptNumber,
        customerName: props.formData.customerName || result.customer_name || result.customerName || "Valued Customer",
        customerAddress: props.formData.customerAddress || result.customer_address || result.customerAddress || "",
        customerContact: props.formData.customerContact || result.customer_phone || result.customerContact || "",
        customerId: props.formData.customerId || result.customer_id || result.customerId || undefined,
        items: (result.items || props.formData.items || []).map((si: any) => ({
          ...si,
          description: si.product_name || si.description || si.productName || "Product",
          price: Number(si.unit_price || si.price || 0),
          quantity: Number(si.quantity || 0),
          total: Number(si.total || 0),
          cost: Number(si.cost_price || si.cost || 0),
          discountType: si.discount_type || si.discountType || "percentage",
          discountPercentage: Number(si.discount_percentage || si.discountPercentage || 0),
          discountAmount: Number(si.discount || si.discountAmount || 0),
        })),
        paymentStatus: result.status || result.paymentStatus || props.formData.paymentStatus,
        profit: Number(result.profit || 0),
        date: new Date(result.date || result.created_at || props.selectedDate || Date.now()),
        taxRate: Number(result.tax_rate || result.taxRate || props.formData.taxRate || 0),
        cashTransactionId: result.cash_transaction_id || result.cashTransactionId || undefined,
        amountPaid: Number(props.formData.amountPaid || result.amount_paid || result.amountPaid || 0),
        amountDue: Number(props.formData.amountDue || result.balance_due || result.amountDue || 0),
        notes: props.formData.notes || result.notes || "",
        categoryId: props.formData.categoryId || result.category_id || result.categoryId || undefined,
        total: Number(result.total_amount || result.total || 0),
        totalCost: Number(result.total_cost || result.totalCost || 0),
        subtotal: Number(result.subtotal || 0),
        discount: Number(result.discount_amount || result.discount || 0),
        taxAmount: Number(result.tax_amount || result.taxAmount || 0),
        createdAt: new Date(result.created_at || result.createdAt || Date.now()),
        updatedAt: new Date(result.updated_at || result.updatedAt || result.created_at || result.createdAt || Date.now()),
      };

      if (props.initialData) {
        if (props.hasChanges) await props.processPendingPaymentChanges();
        if (
          props.formData.paymentStatus === "Installment Sale" &&
          props.formData.amountPaid
        ) {
          await props.createInstallmentPayment({
            saleId: sale.id,
            amount: props.formData.amountPaid,
            notes: sale.items.map((i) => i.description).join(", "),
            paymentDate: props.paymentDate,
            accountId: props.linkToCash
              ? props.selectedCashAccountId
              : undefined,
            locationId: props.currentBusiness?.id,
          });
        }
        if (props.initialData.date.getTime() !== props.selectedDate.getTime())
          await props.updateStockHistoryDatesBySaleId(
            sale.id,
            props.selectedDate,
          );
      } else {
        // ⚡️ ARCHITECTURAL UPDATE: 
        // We no longer manually create the initial Installment Payment over the network here!
        // The Django Backend now intercepts the 'amountPaid' property sequentially during 'upsertSaleAction'
        // and safely resolves the Installment Payment globally inside an @transaction.atomic block.
        // This guarantees database integrity by entirely eliminating partial-commit orphaned data risks.
      }

      if (props.onSaleComplete) {
        await props.onSaleComplete(
          sale,
          props.printAfterSave,
          props.includePaymentInfo,
          props.selectedCustomerCategoryId,
          props.onClearDraft,
          props.selectedDate,
          props.thermalPrintAfterSave,
        );
      }

      toast.success(
        props.initialData
          ? "Sale updated successfully!"
          : "Sale recorded successfully!",
      );

      if (
        props.sendSMS &&
        frozenDraftState.customerContact &&
        !props.initialData
      ) {
        try {
          await props.createMessage({
            phoneNumber: frozenDraftState.customerContact,
            content: props.smsMessage,
            customerId: props.customers.find(
              (c) => c.phoneNumber === frozenDraftState.customerContact,
            )?.id,
            metadata: {
              sale_id: sale.id,
              receipt_number: sale.receiptNumber,
              type: "thank_you",
            },
          });
          toast.success("Thank you SMS sent!");
        } catch (e) {
          toast.error("SMS failed");
        }
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
