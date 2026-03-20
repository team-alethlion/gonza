"use client";
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, Upload, X, Plus, Tag, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCashAccounts } from '@/hooks/useCashAccounts';
import { useExpenseCategories } from '@/hooks/useExpenseCategories';
import { useToast } from '@/hooks/use-toast';
import ExpenseCategoriesManager from './ExpenseCategoriesManager';

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
  title?: string;
}

import { useExpenseDraft } from '@/hooks/useExpenseDraft';

const ExpenseForm: React.FC<ExpenseFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  title = "Add New Expense"
}) => {
  const { hasDraft, saveDraft, loadDraft, clearDraft } = useExpenseDraft();
  const autoSaveTimeoutRef = React.useRef<NodeJS.Timeout>();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [paymentMethod, setPaymentMethod] = useState('');
  const [personInCharge, setPersonInCharge] = useState('');
  const [receiptImage, setReceiptImage] = useState('');
  const [linkToCash, setLinkToCash] = useState(false);
  const [cashAccountId, setCashAccountId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // Load draft when opening for NEW expense
  useEffect(() => {
    if (open && !initialData && hasDraft) {
      const draft = loadDraft();
      if (draft) {
        setAmount(draft.formData.amount || '');
        setDescription(draft.formData.description || '');
        setCategory(draft.formData.category || '');
        setDate(new Date(draft.formData.date));
        setPaymentMethod(draft.formData.paymentMethod || '');
        setPersonInCharge(draft.formData.personInCharge || '');
        setLinkToCash(draft.formData.linkToCash || false);
        setCashAccountId(draft.formData.cashAccountId || '');
        toast({
          title: "Draft Restored",
          description: "We've restored your unsaved expense details.",
        });
      }
    }
  }, [open, initialData]);

  // Auto-save logic
  useEffect(() => {
    if (!open || initialData || isSubmitting) return;

    const data = {
      amount,
      description,
      category,
      date: date.toISOString(),
      paymentMethod,
      personInCharge,
      linkToCash,
      cashAccountId
    };

    const hasData = amount || description || category || paymentMethod || personInCharge;

    if (hasData) {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      
      // Fast session save
      saveDraft(data, false);

      // Debounced persistent save
      autoSaveTimeoutRef.current = setTimeout(() => saveDraft(data, true), 2000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [amount, description, category, date, paymentMethod, personInCharge, linkToCash, cashAccountId, open, initialData, isSubmitting, saveDraft]);

  const { accounts } = useCashAccounts();
  const { categories, createCategory } = useExpenseCategories();
  const { toast } = useToast();

  const { user } = useAuth();
  const userId = user?.id || null;

  // Reset form when dialog opens/closes or initialData changes
  useEffect(() => {
    if (open && initialData) {
      setAmount(initialData.amount?.toString() || '');
      setDescription(initialData.description || '');
      setCategory(initialData.category || '');
      setDate(initialData.date || new Date());
      setPaymentMethod(initialData.paymentMethod || '');
      setPersonInCharge(initialData.personInCharge || '');
      setReceiptImage(initialData.receiptImage || '');
      setLinkToCash(initialData.linkToCash || false);
      setCashAccountId(initialData.cashAccountId || '');
      setReceiptFile(null);
    } else if (open && !initialData) {
      // Reset form for new expense
      setAmount('');
      setDescription('');
      setCategory('');
      setDate(new Date());
      setPaymentMethod('');
      setPersonInCharge('');
      setReceiptImage('');
      setLinkToCash(false);
      setCashAccountId('');
      setReceiptFile(null);
    }
  }, [open, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || !description) {
      toast({
        title: "Error",
        description: "Amount and description are required",
        variant: "destructive"
      });
      return;
    }

    if (linkToCash && !cashAccountId) {
      toast({
        title: "Error",
        description: "Please select a cash account when linking to cash",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('ExpenseForm: Submitting expense with linkToCash:', linkToCash, 'cashAccountId:', cashAccountId);

      const finalReceiptUrl = receiptImage;

      // Receipt file upload – storage backend not yet wired; skip for now
      if (receiptFile) {
        // TODO: wire up a server action for file uploads once a storage solution is in place.
        console.warn('Receipt file upload skipped – no storage backend configured.');
      }

      const expenseData = {
        amount: parseFloat(amount),
        description,
        category: category || undefined,
        date,
        paymentMethod: paymentMethod || undefined,
        personInCharge: personInCharge || undefined,
        receiptImage: finalReceiptUrl || undefined,
        linkToCash,
        cashAccountId: linkToCash ? cashAccountId : undefined
      };

      console.log('ExpenseForm: Final expense data:', expenseData);
      await onSubmit(expenseData);
      
      // Clear draft after successful submission
      if (!initialData) {
        clearDraft();
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      const isImage = file.type.startsWith('image/');
      const isPDF = file.type === 'application/pdf';

      if (!isImage && !isPDF) {
        toast({
          title: "Error",
          description: "Please select an image or PDF file",
          variant: "destructive"
        });
        return;
      }

      // Store the file for upload on submit
      setReceiptFile(file);

      // Create a temporary URL for preview
      const url = URL.createObjectURL(file);
      setReceiptImage(url);
    }
  };

  const removeImage = () => {
    setReceiptImage('');
  };

  const isReceiptPDF = (url: string) => {
    // Check if the file is a PDF based on the URL or stored file type
    return url && url.includes('pdf');
  };

  const handleCategorySelect = (selectedCategory: string) => {
    setCategory(selectedCategory);
    setShowCategoryDialog(false);
  };

  const handleCreateNewCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a category name",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingCategory(true);
    try {
      const newCategory = await createCategory(newCategoryName.trim());
      if (newCategory) {
        setCategory(newCategory.name);
        setNewCategoryName('');
        toast({
          title: "Success",
          description: "Category created successfully",
        });
      }
    } catch (error) {
      console.error('Error creating category:', error);
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('description')?.focus();
                  }
                }}
                placeholder="0.00"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    // Try to focus the category button
                    const categoryButton = document.querySelector('button[data-category-select="true"]') as HTMLElement;
                    if (categoryButton) {
                      categoryButton.focus();
                    } else {
                      // Skip to new category input
                      document.getElementById('newCategory')?.focus();
                    }
                  }
                }}
                placeholder="Enter expense description"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-3">
              <div>
                <Label>Category</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  onClick={() => setShowCategoryDialog(true)}
                  data-category-select="true"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      document.getElementById('newCategory')?.focus();
                    }
                  }}
                  disabled={isSubmitting}
                >
                  <Tag className="mr-2 h-4 w-4" />
                  {category || "Select Category"}
                </Button>
              </div>

              <div>
                <Label htmlFor="newCategory">Create New Category</Label>
                <div className="flex gap-2">
                  <Input
                    id="newCategory"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        // Focus the date picker button
                        const datePickerButton = document.querySelector('button[data-date-picker="true"]') as HTMLElement;
                        datePickerButton?.focus();
                      }
                    }}
                    placeholder="Enter new category name"
                    disabled={isSubmitting || isCreatingCategory}
                  />
                  <Button
                    type="button"
                    onClick={handleCreateNewCategory}
                    disabled={!newCategoryName.trim() || isSubmitting || isCreatingCategory}
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                    data-date-picker="true"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('paymentMethod')?.focus();
                      }
                    }}
                    disabled={isSubmitting}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(date) => date && setDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Input
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('personInCharge')?.focus();
                  }
                }}
                placeholder="Enter payment method (e.g., Cash, Credit Card, etc.)"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="personInCharge">Person in Charge</Label>
              <Input
                id="personInCharge"
                value={personInCharge}
                onChange={(e) => setPersonInCharge(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('receipt')?.focus();
                  }
                }}
                placeholder="Enter person responsible"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="receipt">Receipt (Image or PDF)</Label>
              <div className="space-y-2">
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  disabled={isSubmitting}
                />
                {receiptImage && (
                  <div className="relative inline-block">
                    {isReceiptPDF(receiptImage) ? (
                      <div className="flex items-center gap-2 p-2 border rounded">
                        <FileText className="h-8 w-8 text-red-600" />
                        <span className="text-sm">PDF Receipt</span>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="ml-auto h-6 w-6 rounded-full p-0"
                          onClick={removeImage}
                          disabled={isSubmitting}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <img
                          src={receiptImage}
                          alt="Receipt"
                          className="w-20 h-20 object-cover rounded border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                          onClick={removeImage}
                          disabled={isSubmitting}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="linkToCash"
                checked={linkToCash}
                onCheckedChange={setLinkToCash}
                disabled={isSubmitting}
              />
              <Label htmlFor="linkToCash">Link to Cash Account</Label>
            </div>

            {linkToCash && (
              <div>
                <Label htmlFor="cashAccount">Cash Account</Label>
                <Select value={cashAccountId} onValueChange={(value) => {
                  setCashAccountId(value);
                  setTimeout(() => {
                    const submitButton = document.querySelector('button[type="submit"]') as HTMLElement;
                    submitButton?.focus();
                  }, 100);
                }} disabled={isSubmitting}>
                  <SelectTrigger
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        setTimeout(() => {
                          const submitButton = document.querySelector('button[type="submit"]') as HTMLElement;
                          submitButton?.focus();
                        }, 100);
                      }
                    }}
                  >
                    <SelectValue placeholder="Select cash account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Expense'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Category Selection Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Category</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <ScrollArea className="h-64 rounded-md border p-4">
              <div className="space-y-2">
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleCategorySelect(cat.name)}
                  >
                    <Tag className="mr-2 h-4 w-4" />
                    {cat.name}
                  </Button>
                ))}
              </div>
            </ScrollArea>

            <ExpenseCategoriesManager />

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowCategoryDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExpenseForm;
