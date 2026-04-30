import { useCallback, useMemo } from 'react';
import { SaleFormData, FormErrors } from '@/types';
import { saleSchema } from '@/lib/validations/sale';

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
  // 🛡️ DATA INTEGRITY: Real-time validation state
  const validationResult = useMemo(() => {
    return saleSchema.safeParse(formData);
  }, [formData]);

  const isValid = useMemo(() => {
    const zodValid = validationResult.success;
    
    // Additional business rules
    const cashAccountValid = !linkToCash || 
      (formData.paymentStatus !== 'Paid' && formData.paymentStatus !== 'Installment Sale') || 
      !!selectedCashAccountId;

    return zodValid && cashAccountValid;
  }, [validationResult, linkToCash, formData.paymentStatus, selectedCashAccountId]);

  const validateForm = useCallback((grandTotal: number, saleDate?: Date): boolean => {
    const newErrors: FormErrors = {};

    if (!validationResult.success) {
      validationResult.error.errors.forEach((err) => {
        const path = err.path[0] as keyof FormErrors;
        if (path) {
          newErrors[path] = err.message;
        }
        
        // Handle nested item errors
        if (err.path[0] === 'items') {
          (newErrors as any).items = err.message;
        }
      });
    }

    // Additional complex business logic validation
    if (linkToCash && (formData.paymentStatus === 'Paid' || formData.paymentStatus === 'Installment Sale') && !selectedCashAccountId) {
      (newErrors as any).cashAccount = 'Select a cash account when linking payments';
    }

    if (formData.paymentStatus === 'Installment Sale' && formData.amountPaid) {
      if (formData.amountPaid > grandTotal) {
        (newErrors as any).amountPaid = `Payment (${formData.amountPaid}) cannot exceed total (${grandTotal})`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && isValid;
  }, [validationResult, linkToCash, formData.paymentStatus, formData.amountPaid, selectedCashAccountId, isValid, setErrors]);

  return {
    validateForm,
    isValid,
  };
};