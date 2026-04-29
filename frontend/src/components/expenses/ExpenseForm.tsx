/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarIcon, Upload, X, Plus, Tag, FileText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthProvider";
import { useCashAccounts } from "@/hooks/useCashAccounts";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { useToast } from "@/hooks/use-toast";
import ExpenseCategoriesManager from "./ExpenseCategoriesManager";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { expenseSchema, type ExpenseFormValues } from "@/lib/validations/expense";
import { useExpenseDraft } from "@/hooks/useExpenseDraft";
import Image from "next/image";

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
  title?: string;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  title = "Add New Expense",
}) => {
  const { hasDraft, saveDraft, loadDraft, clearDraft } = useExpenseDraft();
  const autoSaveTimeoutRef = React.useRef<NodeJS.Timeout>();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [receiptImage, setReceiptImage] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const { accounts } = useCashAccounts();
  const { categories, createCategory } = useExpenseCategories();
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: initialData?.amount || 0,
      description: initialData?.description || "",
      category: initialData?.category || "",
      date: initialData?.date ? new Date(initialData.date) : new Date(),
      paymentMethod: initialData?.paymentMethod || "",
      personInCharge: initialData?.personInCharge || "",
      linkToCash: initialData?.linkToCash || false,
      cashAccountId: initialData?.cashAccountId || "",
    },
  });

  const { watch, setValue, control, handleSubmit, reset } = form;
  const formValues = watch();

  // Load draft when opening for NEW expense
  useEffect(() => {
    if (open && !initialData && hasDraft) {
      const draft = loadDraft();
      if (draft) {
        Object.keys(draft.formData).forEach(key => {
          if (key === 'date') {
            setValue(key as any, new Date(draft.formData[key]));
          } else {
            setValue(key as any, draft.formData[key]);
          }
        });
        toast({
          title: "Draft Restored",
          description: "We've restored your unsaved expense details.",
        });
      }
    }
  }, [open, initialData, hasDraft, loadDraft, setValue, toast]);

  // Auto-save logic
  useEffect(() => {
    if (!open || initialData || isSubmitting) return;

    const data = { ...formValues, date: formValues.date?.toISOString() };
    const hasData = formValues.amount > 0 || formValues.description || formValues.category;

    if (hasData) {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      saveDraft(data, false);
      autoSaveTimeoutRef.current = setTimeout(() => saveDraft(data, true), 2000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [formValues, open, initialData, isSubmitting, saveDraft]);

  // Reset form when initialData changes
  useEffect(() => {
    if (open) {
      reset({
        amount: initialData?.amount || 0,
        description: initialData?.description || "",
        category: initialData?.category || "",
        date: initialData?.date ? new Date(initialData.date) : new Date(),
        paymentMethod: initialData?.paymentMethod || "",
        personInCharge: initialData?.personInCharge || "",
        linkToCash: initialData?.linkToCash || false,
        cashAccountId: initialData?.cashAccountId || "",
      });
      setReceiptImage(initialData?.receiptImage || "");
      setReceiptFile(null);
    }
  }, [open, initialData, reset]);

  const onFormSubmit = async (values: ExpenseFormValues) => {
    setIsSubmitting(true);
    try {
      const expenseData = {
        ...values,
        receiptImage: receiptImage || undefined,
      };

      await onSubmit(expenseData);
      if (!initialData) clearDraft();
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting expense:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isImage = file.type.startsWith("image/");
      const isPDF = file.type === "application/pdf";

      if (!isImage && !isPDF) {
        toast({
          title: "Error",
          description: "Please select an image or PDF file",
          variant: "destructive",
        });
        return;
      }

      setReceiptFile(file);
      const url = URL.createObjectURL(file);
      setReceiptImage(url);
    }
  };

  const handleCreateNewCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsCreatingCategory(true);
    try {
      const newCat = await createCategory(newCategoryName.trim());
      if (newCat) {
        setValue("category", newCat.name);
        setNewCategoryName("");
        toast({ title: "Success", description: "Category created" });
      }
    } finally {
      setIsCreatingCategory(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
              <FormField
                control={control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} placeholder="0.00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Enter expense description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <FormField
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        onClick={() => setShowCategoryDialog(true)}>
                        <Tag className="mr-2 h-4 w-4" />
                        {field.value || "Select Category"}
                      </Button>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <Label htmlFor="newCategory">Create New Category</Label>
                  <div className="flex gap-2">
                    <Input
                      id="newCategory"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Enter new category name"
                    />
                    <Button
                      type="button"
                      onClick={handleCreateNewCategory}
                      disabled={!newCategoryName.trim() || isCreatingCategory}
                      size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <FormField
                control={control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Cash, Card, Mobile Money" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="personInCharge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Person in Charge</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter person responsible" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label htmlFor="receipt">Receipt (Image or PDF)</Label>
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  disabled={isSubmitting}
                />
                {receiptImage && (
                  <div className="relative inline-block mt-2">
                    {receiptImage.includes("pdf") ? (
                      <div className="flex items-center gap-2 p-2 border rounded">
                        <FileText className="h-8 w-8 text-red-600" />
                        <span className="text-sm">PDF Receipt</span>
                        <Button type="button" variant="destructive" size="sm" className="h-6 w-6 rounded-full p-0" onClick={() => setReceiptImage("")}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Image src={receiptImage} alt="Receipt" width={80} height={80} className="w-20 h-20 object-cover rounded border" />
                        <Button type="button" variant="destructive" size="sm" className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0" onClick={() => setReceiptImage("")}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <FormField
                control={control}
                name="linkToCash"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Link to Cash Account</FormLabel>
                      <FormDescription>Deduct from selected account balance.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {formValues.linkToCash && (
                <FormField
                  control={control}
                  name="cashAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cash Account</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select cash account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Expense"}</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Select Category</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <ScrollArea className="h-64 rounded-md border p-4">
              <div className="space-y-2">
                {categories.map((cat) => (
                  <Button key={cat.id} variant="ghost" className="w-full justify-start" onClick={() => { setValue("category", cat.name); setShowCategoryDialog(false); }}>
                    <Tag className="mr-2 h-4 w-4" />
                    {cat.name}
                  </Button>
                ))}
              </div>
            </ScrollArea>
            <ExpenseCategoriesManager />
            <div className="flex justify-end"><Button variant="outline" onClick={() => setShowCategoryDialog(false)}>Cancel</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExpenseForm;
