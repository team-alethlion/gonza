import { z } from "zod";

const requiredNumberSchema = (name: string, min = 0) => 
  z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : val),
    z.coerce
      .number({
        required_error: `${name} is required`,
        invalid_type_error: `${name} must be a number`,
      })
      .min(min, `${name} cannot be less than ${min}`)
  );

export const saleItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: requiredNumberSchema("Quantity", 0.01),
  price: requiredNumberSchema("Price", 0),
  cost: requiredNumberSchema("Cost", 0),
  productId: z.string().optional(),
  discountPercentage: z.coerce.number().min(0).max(100).optional(),
  discountType: z.enum(['percentage', 'amount']).optional(),
  discountAmount: z.coerce.number().min(0).optional(),
});

export const saleSchema = z.object({
  customerName: z.string().min(1, "Customer name is required").max(100, "Name is too long"),
  customerAddress: z.string().optional().or(z.literal("")),
  customerContact: z.string().optional().or(z.literal("")),
  customerId: z.string().optional(),
  items: z.array(saleItemSchema).min(1, "Add at least one item"),
  paymentStatus: z.enum([
    "Paid", "NOT PAID", "Quote", "Installment Sale", 
    "COMPLETED", "UNPAID", "INSTALLMENT", "QUOTE", "PENDING", 
    "REFUNDED", "PARTIAL_REFUND"
  ]),
  receiptNumber: z.string().optional(),
  taxRate: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? 0 : val),
    z.coerce.number().min(0, "Tax rate cannot be negative")
  ).optional(),
  amountPaid: z.coerce.number().min(0).optional(),
  amountDue: z.coerce.number().min(0).optional(),
  notes: z.string().optional().or(z.literal("")),
  categoryId: z.string().optional(),
  shippingCost: z.coerce.number().min(0).optional(),
  discountReason: z.string().optional().or(z.literal("")),
  paymentReference: z.string().optional().or(z.literal("")),
}).refine((data) => {
  if (data.paymentStatus === 'Installment Sale') {
    return (data.amountPaid || 0) > 0;
  }
  return true;
}, {
  message: "Initial payment is required for installment sales",
  path: ["amountPaid"]
});

export type SaleFormValues = z.infer<typeof saleSchema>;
export type SaleItemValues = z.infer<typeof saleItemSchema>;
