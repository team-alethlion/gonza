import * as z from "zod";

// --- BASE SCHEMAS ---

export const saleItemSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1, "Item description is required"),
  quantity: z.number().min(0.01, "Quantity must be at least 0.01"),
  price: z.number().min(0, "Price cannot be negative"),
  cost: z.number().min(0, "Cost cannot be negative").default(0),
  discountPercentage: z.number().min(0).max(100).default(0),
  discountAmount: z.number().min(0).default(0),
  discountType: z.enum(["percentage", "amount"]).default("percentage"),
});

export const saleSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(1, "Customer name is required"),
  customerContact: z.string().optional().nullable(),
  customerAddress: z.string().optional().nullable(),
  items: z.array(saleItemSchema).min(1, "At least one item is required"),
  paymentStatus: z.enum(["Paid", "NOT PAID", "Quote", "Installment Sale"]),
  paymentMethod: z.string().default("CASH"),
  taxRate: z.number().min(0).max(100).default(0),
  amountPaid: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
  date: z.date().default(() => new Date()),
  categoryId: z.string().optional().nullable(),
  locationId: z.string().min(1, "Branch/Location is required"),
});

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  sellingPrice: z.number().min(0, "Selling price cannot be negative"),
  costPrice: z.number().min(0, "Cost price cannot be negative"),
  stock: z.number().int().min(0, "Stock cannot be negative"),
  minStock: z.number().int().min(0).default(0),
  categoryId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  imageUrl: z.string().url("Invalid image URL").optional().nullable().or(z.literal("")),
});

export const expenseSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than zero"),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  date: z.date().default(() => new Date()),
  paymentMethod: z.string().min(1, "Payment method is required"),
  cashAccountId: z.string().optional().nullable(),
  personInCharge: z.string().optional().nullable(),
});

export const customerSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  phoneNumber: z.string().optional().nullable(),
  email: z.string().email("Invalid email address").optional().nullable().or(z.literal("")),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
});

// --- TYPES DERIVED FROM SCHEMAS ---

export type SaleInput = z.infer<typeof saleSchema>;
export type SaleItemInput = z.infer<typeof saleItemSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
