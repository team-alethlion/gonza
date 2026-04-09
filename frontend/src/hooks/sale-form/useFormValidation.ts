import { useCallback } from 'react';
import { SaleFormData, FormErrors } from '@/types';

interface UseFormValidationProps {
  formData: SaleFormData;
  linkToCash: boolean;
  selectedCashAccountId: string;
  initialData?: any;
  formRecentlyCleared: boolean;
  setErrors: React.Dispatch<React.SetStateAction<FormErrors>>;
}

export const useFormValidation = ({
  formData,
  linkToCash,
  selectedCashAccountId,
  initialData,
  formRecentlyCleared,
  setErrors,
}: UseFormValidationProps) => {
  const validateForm = useCallback((grandTotal: number, saleDate?: Date): boolean => {
    const newErrors: FormErrors = {};

    if (!(formData.customerName || '').trim()) {
      newErrors.customerName = 'Customer name is required';
    }

    if (formData.taxRate != null && formData.taxRate < 0) {
      newErrors.taxRate = 'Tax rate cannot be negative';
    }

    // Filter out completely empty items (placeholder items)
    const nonEmptyItems = formData.items.filter(item =>
      (item.description || '').trim() !== '' || item.quantity > 0 || item.price > 0
    );

    const hasInvalidItems = nonEmptyItems.some(item =>
      !(item.description || '').trim() ||
      item.quantity <= 0 ||
      item.price < 0 ||
      item.cost < 0
    );

    if (hasInvalidItems) {
      (newErrors as any).items = 'All items must have a description, positive quantity, and non-negative price/cost';
    }

    // Note: Removed product creation date validation as it was too strict
    // and prevented loading drafts. Products can exist before a sale is backdated.
    // The validation was: if product createdAt > saleDate, reject the sale
    // This is overly restrictive for legitimate use cases like loading drafts.


    if (linkToCash && (formData.paymentStatus === 'Paid' || formData.paymentStatus === 'Installment Sale') && !selectedCashAccountId) {
      (newErrors as any).cashAccount = 'Select a cash account when linking payments';
    }

    if (formData.paymentStatus === 'Installment Sale' && !initialData) {
      const initialPaid = Number(formData.amountPaid || 0);
      if (initialPaid <= 0) {
        (newErrors as any).amountPaid = 'Please enter an initial payment amount for the installment sale';
      }
      if (initialPaid > grandTotal) {
        (newErrors as any).amountPaid = `Initial payment (${initialPaid}) cannot exceed the total sale amount (${grandTotal})`;
      }
    }

    if (formData.paymentStatus === 'Installment Sale' && initialData && formData.amountPaid) {
      if (formData.amountPaid > grandTotal) {
        (newErrors as any).amountPaid = 'Current payment amount cannot exceed the total sale amount';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, linkToCash, selectedCashAccountId, initialData, formRecentlyCleared, setErrors]);

  return {
    validateForm,
  };
};