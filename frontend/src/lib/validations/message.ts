import { z } from "zod";

export const messageSchema = z.object({
  channel: z.enum(["sms", "whatsapp"]),
  selectedCustomer: z.string().default("none"),
  phoneNumber: z.string().min(5, "Phone number is required"),
  content: z.string().min(1, "Message content is required"),
  selectedTemplate: z.string().default("none"),
});

export type MessageFormValues = z.infer<typeof messageSchema>;

export const messageTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  content: z.string().min(1, "Template content is required"),
  category: z.string().optional().or(z.literal("")),
});

export type MessageTemplateFormValues = z.infer<typeof messageTemplateSchema>;
