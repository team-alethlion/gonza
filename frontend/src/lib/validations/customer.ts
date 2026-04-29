import { z } from "zod";

export const customerSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phoneNumber: z.string().optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  creditLimit: z.coerce.number().min(0, "Credit limit cannot be negative").default(0),
  gender: z.string().optional().or(z.literal("")),
  categoryId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  birthday: z.date().optional().nullable(),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
