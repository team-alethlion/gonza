/* eslint-disable @typescript-eslint/no-explicit-any */
import { Sale } from "@/types";

/**
 * Mathematically rebuilds a completely valid Sale object explicitly for the Presentation View
 * bypassing the faulty `sale` object and safely bridging natively captured `formData`
 * explicitly over the backend `rawResult`.
 */
export function injectFrozenDraftToReceipt(props: any, result: any): Sale {
  const formData = props.formData || {};

  return {
    id: result.id,
    receiptNumber: result.receipt_number || result.receiptNumber || "",
    customerName: formData.customerName || result.customer_name || result.customerName || "Walking Customer",
    customerAddress: formData.customerAddress || result.customer_address || result.customerAddress || "",
    customerContact: formData.customerContact || result.customer_phone || result.customerContact || "",
    customerId: formData.customerId || result.customer_id || result.customerId || undefined,
    items: (result.items || formData.items || []).map((si: any) => ({
      ...si,
      id: si.id,
      productId: si.product_id || si.productId,
      productName: si.product_name || si.productName,
      description: si.product_name || si.description || si.productName || "Product",
      price: Number(si.unit_price || si.price || 0),
      quantity: Number(si.quantity || 0),
      total: Number(si.total || 0),
      cost: Number(si.cost_price || si.cost || 0),
      discountType: si.discount_type || si.discountType || "percentage",
      discountPercentage: Number(si.discount_percentage || si.discountPercentage || 0),
      discountAmount: Number(si.discount || si.discountAmount || 0),
    })),
    paymentStatus: result.status || result.paymentStatus || formData.paymentStatus,
    profit: Number(result.profit || 0),
    date: new Date(result.date || result.created_at || props.selectedDate || Date.now()),
    taxRate: Number(result.tax_rate || result.taxRate || formData.taxRate || 0),
    cashTransactionId: result.cash_transaction_id || result.cashTransactionId || undefined,
    amountPaid: Number(formData.amountPaid || result.amount_paid || result.amountPaid || 0),
    amountDue: Number(formData.amountDue || result.balance_due || result.amountDue || 0),
    notes: formData.notes || result.notes || "",
    categoryId: formData.categoryId || result.category_id || result.categoryId || undefined,
    total: Number(result.total_amount || result.total || 0),
    totalCost: Number(result.total_cost || result.totalCost || 0),
    subtotal: Number(result.subtotal || 0),
    discount: Number(result.discount_amount || result.discount || 0),
    taxAmount: Number(result.tax_amount || result.taxAmount || 0),
    createdAt: new Date(result.created_at || result.createdAt || Date.now()),
    updatedAt: new Date(result.updated_at || result.updatedAt || result.created_at || result.createdAt || Date.now()),
  };
}
