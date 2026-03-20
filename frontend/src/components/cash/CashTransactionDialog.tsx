"use client";
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CashTransactionFormData, CashAccount } from '@/types/cash';
import { useIsMobile } from '@/hooks/use-mobile';
import { Eye, FileText, X } from 'lucide-react';
import ImageViewer from '@/components/ui/ImageViewer';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';

interface CashTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CashTransactionFormData) => void;
  accounts: CashAccount[];
  defaultAccountId?: string;
  presetTransactionType?: 'cash_in' | 'cash_out' | 'transfer';
}

const CashTransactionDialog: React.FC<CashTransactionDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  accounts,
  defaultAccountId,
  presetTransactionType
}) => {
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<CashTransactionFormData>({
    defaultValues: {
      accountId: defaultAccountId || '',
      transactionType: presetTransactionType || 'cash_in',
      category: '',
      description: '',
      personInCharge: '',
      tags: [],
      date: new Date(),
      paymentMethod: '',
      receiptImage: ''
    }
  });

  const transactionType = watch('transactionType');
  const receiptImage = watch('receiptImage');
  const isMobile = useIsMobile();
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (open) {
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];

      reset({
        accountId: defaultAccountId || '',
        amount: undefined as any,
        transactionType: presetTransactionType || 'cash_in',
        category: '',
        description: '',
        personInCharge: '',
        tags: [],
        date: today,
        paymentMethod: '',
        receiptImage: ''
      });

      // Set the preset transaction type if provided
      if (presetTransactionType) {
        setValue('transactionType', presetTransactionType);
      }

      // Set today's date in the date input with proper string format
      setValue('date', todayString as any);
    }
  }, [open, defaultAccountId, presetTransactionType, reset, setValue]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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

      // Create a local URL for the uploaded file
      const fileUrl = URL.createObjectURL(file);
      setValue('receiptImage', fileUrl);
    }
  };

  const isReceiptPDF = (url: string) => {
    // Check if the file is a PDF based on the URL or stored file type
    return url && url.includes('pdf');
  };

  const removeReceipt = () => {
    setValue('receiptImage', '');
  };

  const handleFormSubmit = async (data: any) => {
    console.log('Raw form data:', data);

    setIsSubmitting(true);

    try {
      // Ensure we have a proper date
      let formDate: Date;
      if (data.date instanceof Date) {
        formDate = data.date;
      } else if (typeof data.date === 'string') {
        formDate = new Date(data.date);
      } else {
        formDate = new Date();
      }

      const formData: CashTransactionFormData = {
        accountId: data.accountId,
        amount: Number(data.amount),
        transactionType: data.transactionType,
        toAccountId: data.toAccountId,
        category: data.category,
        description: data.description,
        personInCharge: data.personInCharge,
        tags: [],
        date: formDate,
        paymentMethod: data.paymentMethod,
        receiptImage: data.receiptImage
      };

      console.log('Processed form data being submitted:', formData);
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={`${isMobile ? 'max-h-[85vh] w-[95vw] max-w-none' : 'sm:max-w-[500px]'}`}>
          <DialogHeader className={isMobile ? 'pb-2' : ''}>
            <DialogTitle>New Transaction</DialogTitle>
          </DialogHeader>

          <ScrollArea className={isMobile ? 'h-[calc(85vh-120px)] pr-4' : 'max-h-[70vh]'}>
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accountId">Account</Label>
                <Select
                  value={watch('accountId')}
                  onValueChange={(value) => {
                    setValue('accountId', value);
                    // Focus transaction type after selection
                    setTimeout(() => {
                      const transactionTypeSelect = document.querySelectorAll('[role="combobox"]')[1] as HTMLElement;
                      transactionTypeSelect?.focus();
                    }, 100);
                  }}
                >
                  <SelectTrigger
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        setTimeout(() => {
                          const transactionTypeSelect = document.querySelectorAll('[role="combobox"]')[1] as HTMLElement;
                          transactionTypeSelect?.focus();
                        }, 100);
                      }
                    }}
                  >
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.accountId && (
                  <p className="text-sm text-red-600">{errors.accountId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="transactionType">Transaction Type</Label>
                <Select
                  value={transactionType}
                  onValueChange={(value) => {
                    setValue('transactionType', value as 'cash_in' | 'cash_out' | 'transfer');
                    // Focus next field after selection
                    setTimeout(() => {
                      if (value === 'transfer') {
                        const toAccountSelect = document.querySelectorAll('[role="combobox"]')[2] as HTMLElement;
                        toAccountSelect?.focus();
                      } else {
                        document.getElementById('amount')?.focus();
                      }
                    }, 100);
                  }}
                >
                  <SelectTrigger
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        setTimeout(() => {
                          if (transactionType === 'transfer') {
                            const toAccountSelect = document.querySelectorAll('[role="combobox"]')[2] as HTMLElement;
                            toAccountSelect?.focus();
                          } else {
                            document.getElementById('amount')?.focus();
                          }
                        }, 100);
                      }
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash_in">Cash In</SelectItem>
                    <SelectItem value="cash_out">Cash Out</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {transactionType === 'transfer' && (
                <div className="space-y-2">
                  <Label htmlFor="toAccountId">To Account</Label>
                  <Select
                    value={watch('toAccountId') || ''}
                    onValueChange={(value) => {
                      setValue('toAccountId', value);
                      // Focus amount after selection
                      setTimeout(() => {
                        document.getElementById('amount')?.focus();
                      }, 100);
                    }}
                  >
                    <SelectTrigger
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          setTimeout(() => {
                            document.getElementById('amount')?.focus();
                          }, 100);
                        }
                      }}
                    >
                      <SelectValue placeholder="Select destination account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        .filter(account => account.id !== watch('accountId'))
                        .map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  {...register('amount', {
                    required: 'Amount is required',
                    min: { value: 0.01, message: 'Amount must be greater than 0' }
                  })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      document.getElementById('category')?.focus();
                    }
                  }}
                  placeholder="0.00"
                />
                {errors.amount && (
                  <p className="text-sm text-red-600">{errors.amount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category (Optional)</Label>
                <Input
                  id="category"
                  {...register('category')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      document.getElementById('description')?.focus();
                    }
                  }}
                  placeholder="e.g., Sales, Expense, Investment"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description', { required: 'Description is required' })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      document.getElementById('personInCharge')?.focus();
                    }
                  }}
                  placeholder="Transaction description"
                  rows={3}
                  className={isMobile ? 'min-h-[80px]' : ''}
                />
                {errors.description && (
                  <p className="text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="personInCharge">Person in Charge (Optional)</Label>
                <Input
                  id="personInCharge"
                  {...register('personInCharge')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      document.getElementById('paymentMethod')?.focus();
                    }
                  }}
                  placeholder="e.g., John Doe, Manager"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method (Optional)</Label>
                <Input
                  id="paymentMethod"
                  {...register('paymentMethod')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      document.getElementById('date')?.focus();
                    }
                  }}
                  placeholder="e.g., Cash, Credit Card, Bank Transfer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receiptImage">Receipt (Image or PDF) (Optional)</Label>
                <Input
                  id="receiptImage"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="cursor-pointer"
                />
                {receiptImage && (
                  <div className="mt-2 relative">
                    {isReceiptPDF(receiptImage) ? (
                      <div className="flex items-center gap-2 p-3 border rounded">
                        <FileText className="h-8 w-8 text-red-600" />
                        <span className="text-sm">PDF Receipt</span>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="ml-auto h-6 w-6 rounded-full p-0"
                          onClick={removeReceipt}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <img
                          src={receiptImage}
                          alt="Receipt preview"
                          className="max-w-full h-32 object-contain border rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setImageViewerOpen(true)}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="absolute top-2 right-2 opacity-80 hover:opacity-100"
                          onClick={() => setImageViewerOpen(true)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  {...register('date', { required: 'Date is required' })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const submitButton = document.querySelector('button[type="submit"]') as HTMLElement;
                      submitButton?.focus();
                    }
                  }}
                />
                {errors.date && (
                  <p className="text-sm text-red-600">{errors.date.message}</p>
                )}
              </div>

              <div className={`flex ${isMobile ? 'flex-col gap-2' : 'justify-end space-x-2'} pt-4`}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className={isMobile ? 'w-full' : ''}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className={isMobile ? 'w-full' : ''}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <LoadingSpinner size="sm" className="!space-y-0" />
                      <span>Creating Transaction...</span>
                    </div>
                  ) : (
                    'Create Transaction'
                  )}
                </Button>
              </div>
            </form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {receiptImage && !isReceiptPDF(receiptImage) && (
        <ImageViewer
          isOpen={imageViewerOpen}
          onOpenChange={setImageViewerOpen}
          imageUrl={receiptImage}
          imageAlt="Receipt preview"
        />
      )}
    </>
  );
};

export default CashTransactionDialog;
