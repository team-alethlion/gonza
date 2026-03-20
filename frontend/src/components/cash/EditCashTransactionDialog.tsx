"use client";
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CashTransaction, CashTransactionFormData, CashAccount } from '@/types/cash';
import { useIsMobile } from '@/hooks/use-mobile';
import { Eye, FileText, X } from 'lucide-react';
import ImageViewer from '@/components/ui/ImageViewer';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';

interface EditCashTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (id: string, data: Partial<CashTransactionFormData>) => void;
  transaction: CashTransaction | null;
  accounts: CashAccount[];
}

const EditCashTransactionDialog: React.FC<EditCashTransactionDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  transaction,
  accounts
}) => {
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<CashTransactionFormData>();
  const isMobile = useIsMobile();
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (open && transaction) {
      // Format date as YYYY-MM-DD for the date input
      const formattedDate = transaction.date.toISOString().split('T')[0];
      
      reset({
        accountId: transaction.accountId || '',
        amount: transaction.amount,
        transactionType: transaction.transactionType === 'transfer_in' || transaction.transactionType === 'transfer_out' 
          ? 'transfer' 
          : transaction.transactionType,
        category: transaction.category,
        description: transaction.description,
        personInCharge: transaction.personInCharge || '',
        tags: [],
        date: transaction.date, // Keep as Date object for the form
        paymentMethod: transaction.paymentMethod || '',
        receiptImage: transaction.receiptImage || ''
      });
      
      // Set the date input value to the formatted string
      setValue('date', formattedDate as any);
    }
  }, [open, transaction, reset, setValue]);

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
    if (!transaction) return;
    
    setIsSubmitting(true);
    
    try {
      // Handle date conversion properly - ensure exact date is preserved
      let formDate: Date;
      
      // If data.date is a string (from the date input), parse it correctly
      if (typeof data.date === 'string') {
        // Parse date string to ensure we get the exact date selected
        const [year, month, day] = data.date.split('-').map(Number);
        formDate = new Date(year, month - 1, day, 12, 0, 0); // Set to noon to avoid timezone issues
      } else if (data.date instanceof Date) {
        formDate = data.date;
      } else {
        formDate = new Date();
      }

      const formData: Partial<CashTransactionFormData> = {
        amount: Number(data.amount),
        category: data.category,
        description: data.description,
        personInCharge: data.personInCharge,
        tags: [],
        date: formDate,
        paymentMethod: data.paymentMethod,
        receiptImage: data.receiptImage
      };
      
      await onSubmit(transaction.id, formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!transaction) return null;

  // Format date for the input field display
  const inputDateValue = transaction.date.toISOString().split('T')[0];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={`${isMobile ? 'max-h-[85vh] w-[95vw] max-w-none' : 'sm:max-w-[500px]'}`}>
          <DialogHeader className={isMobile ? 'pb-2' : ''}>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className={isMobile ? 'h-[calc(85vh-120px)] pr-4' : 'max-h-[70vh]'}>
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="transactionType">Transaction Type</Label>
                <Input
                  value={transaction.transactionType.replace('_', ' ')}
                  disabled
                  className="bg-gray-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="1"
                  {...register('amount', { 
                    required: 'Amount is required',
                    min: { value: 1, message: 'Amount must be at least 1' }
                  })}
                  placeholder="0"
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
                  placeholder="e.g., Sales, Expense, Investment"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description', { required: 'Description is required' })}
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
                  placeholder="e.g., John Doe, Manager"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method (Optional)</Label>
                <Input
                  id="paymentMethod"
                  {...register('paymentMethod')}
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
                {watch('receiptImage') && (
                  <div className="mt-2 relative">
                    {isReceiptPDF(watch('receiptImage')) ? (
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
                          src={watch('receiptImage')} 
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
                <Label htmlFor="edit-date">Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  {...register('date', { required: 'Date is required' })}
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
                      <span>Updating Transaction...</span>
                    </div>
                  ) : (
                    'Update Transaction'
                  )}
                </Button>
              </div>
            </form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {watch('receiptImage') && !isReceiptPDF(watch('receiptImage')) && (
        <ImageViewer
          isOpen={imageViewerOpen}
          onOpenChange={setImageViewerOpen}
          imageUrl={watch('receiptImage')}
          imageAlt="Receipt preview"
        />
      )}
    </>
  );
};

export default EditCashTransactionDialog;
