"use client";
import React, { useState, useEffect } from 'react';
import { FileText, Save } from 'lucide-react';
import { MessageTemplate } from '@/hooks/useMessages';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { messageTemplateSchema, type MessageTemplateFormValues } from "@/lib/validations/message";

interface MessageTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<MessageTemplate, 'id' | 'userId' | 'locationId' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  initialData?: MessageTemplate;
}

const TEMPLATE_CATEGORIES = [
  { value: "ThankYou", label: "Thank You (After Sale)" },
  { value: "Birthday", label: "Birthday Wishes" },
  { value: "PaymentReminder", label: "Payment Reminder" },
  { value: "Holiday", label: "Public Holiday" },
  { value: "Inactive", label: "We Miss You / Inactive Customer" },
  { value: "Custom", label: "Custom" }
];

const MessageTemplateDialog = ({ open, onClose, onSave, initialData }: MessageTemplateDialogProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [variables, setVariables] = useState<string[]>(initialData?.variables || []);
  const [customCategory, setCustomCategory] = useState('');

  const form = useForm<MessageTemplateFormValues>({
    resolver: zodResolver(messageTemplateSchema),
    mode: "onChange",
    defaultValues: {
      name: initialData?.name || "",
      content: initialData?.content || "",
      category: initialData?.category || "",
    },
  });

  const { control, handleSubmit, reset, watch, setValue } = form;
  const categoryValue = watch("category");

  useEffect(() => {
    if (open) {
      reset({
        name: initialData?.name || "",
        content: initialData?.content || "",
        category: initialData?.category || "",
      });
      setVariables(initialData?.variables || []);
      
      const isCustom = initialData?.category && !TEMPLATE_CATEGORIES.some(c => c.value === initialData.category);
      if (isCustom) {
        setValue("category", "Custom");
        setCustomCategory(initialData?.category || "");
      }
    }
  }, [open, initialData, reset, setValue]);

  const onFormSubmit = async (values: MessageTemplateFormValues) => {
    setIsSaving(true);
    try {
      const finalCategory = values.category === "Custom" ? customCategory : values.category;
      
      const success = await onSave({
        name: values.name,
        content: values.content,
        category: finalCategory || null,
        variables,
        isDefault: false
      });
      
      if (success) {
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const extractVariables = (text: string) => {
    const regex = /\{([^}]+)\}/g;
    const matches = text.match(regex);
    if (matches) {
      const vars = matches.map(m => m.slice(1, -1));
      setVariables([...new Set(vars)]);
    } else {
      setVariables([]);
    }
  };

  return (
    <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) onClose();
        }}
      >
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <FileText className="w-5 h-5 text-primary" />
            {initialData ? 'Edit Template' : 'Create New Template'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
            <FormField
              control={control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Welcome Message"
                      {...field}
                      rows={1}
                      className="resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TEMPLATE_CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.value === "Custom" && (
                    <Textarea
                      placeholder="Type custom category..."
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      rows={1}
                      className="mt-2 resize-none"
                    />
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message Content *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Type your template here... Use {variable} for dynamic content"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        extractVariables(e.target.value);
                      }}
                      rows={6}
                      className="resize-none text-sm leading-relaxed"
                    />
                  </FormControl>
                  <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-tight font-medium">
                    Use curly braces for variables: {'{customer_name}'}, {'{customer_phone}'}, etc.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {variables.length > 0 && (
              <div className="space-y-2">
                <FormLabel>Detected Variables</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {variables.map(v => (
                    <span key={v} className="text-xs px-2 py-1 bg-primary/5 text-primary rounded border border-primary/10 font-bold uppercase tracking-tight">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3">
              <p className="text-[10px] font-bold text-blue-900 mb-2 uppercase tracking-widest">
                Available Variables
              </p>
              <div className="text-[11px] text-blue-800 space-y-1 font-medium">
                <p>• <code className="bg-blue-100/50 px-1 rounded text-blue-900">{'{customer_name}'}</code> - Full customer name</p>
                <p>• <code className="bg-blue-100/50 px-1 rounded text-blue-900">{'{first_name}'}</code> - Customer first name</p>
                <p>• <code className="bg-blue-100/50 px-1 rounded text-blue-900">{'{last_name}'}</code> - Customer last name</p>
                <p>• <code className="bg-blue-100/50 px-1 rounded text-blue-900">{'{customer_phone}'}</code> - Customer phone number</p>
                <p>• <code className="bg-blue-100/50 px-1 rounded text-blue-900">{'{customer_email}'}</code> - Customer email</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" type="button" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!form.formState.isValid || isSaving || (categoryValue === "Custom" && !customCategory)}
                className="bg-primary hover:bg-primary/90"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Template'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default MessageTemplateDialog;
