import { z } from "zod";

export const expenseSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  description: z.string().min(1, "Description is required"),
  category: z.string().optional().or(z.literal("")),
  date: z.date({
    required_error: "Please select a date",
  }),
  paymentMethod: z.string().optional().or(z.literal("")),
  personInCharge: z.string().optional().or(z.literal("")),
  linkToCash: z.boolean().default(false),
  cashAccountId: z.string().optional().or(z.literal("")),
}).refine((data) => {
  if (data.linkToCash && (!data.cashAccountId || data.cashAccountId === "")) {
    return false;
  }
  return true;
}, {
  message: "Please select a cash account when linking to cash",
  path: ["cashAccountId"],
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;
