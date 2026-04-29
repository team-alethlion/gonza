import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  barcode: z.string().optional().or(z.literal("")),
  manufacturerBarcode: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  category: z.string().optional().or(z.literal("")),
  quantity: z.coerce.number().default(0),
  costPrice: z.coerce.number().min(0, "Cost price cannot be negative").optional(),
  sellingPrice: z.coerce.number().min(0, "Selling price cannot be negative").optional(),
  supplier: z.string().optional().or(z.literal("")),
  minimumStock: z.coerce.number().min(0, "Minimum stock cannot be negative").optional(),
  createdAt: z.date().default(new Date()),
  autoPrintLabel: z.boolean().default(false),
  printQuantity: z.coerce.number().min(1).default(1),
  imageUrl: z.string().nullable().optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;
