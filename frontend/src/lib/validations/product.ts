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

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required").max(100, "Name is too long"),
  barcode: z.string().optional().or(z.literal("")),
  manufacturerBarcode: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  category: z.string().optional().or(z.literal("")),
  quantity: requiredNumberSchema("Initial stock"),
  costPrice: requiredNumberSchema("Cost price"),
  sellingPrice: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : val),
    z.coerce
      .number({
        required_error: "Selling price is required",
        invalid_type_error: "Selling price must be a number",
      })
      .min(0.01, "Selling price must be greater than 0")
  ),
  supplier: z.string().optional().or(z.literal("")),
  minimumStock: requiredNumberSchema("Minimum stock"),
  createdAt: z.date({
    required_error: "Please select a date",
  }).default(() => new Date()),
  autoPrintLabel: z.boolean().default(false),
  printQuantity: z.coerce
    .number()
    .min(1, "Print quantity must be at least 1")
    .default(1),
  imageUrl: z.string().nullable().optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;
