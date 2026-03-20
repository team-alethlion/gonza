import { useCallback } from 'react';
import { SaleFormData, FormErrors } from '@/types';

interface UseFormHandlersProps {
  formData: SaleFormData;
  setFormData: React.Dispatch<React.SetStateAction<SaleFormData>>;
  errors: FormErrors;
  setErrors: React.Dispatch<React.SetStateAction<FormErrors>>;
  setTaxRateInput: React.Dispatch<React.SetStateAction<string>>;
  setLinkToCash: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useFormHandlers = ({
  formData,
  setFormData,
  errors,
  setErrors,
  setTaxRateInput,
  setLinkToCash,
}: UseFormHandlersProps) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'taxRate') {
      setTaxRateInput(value);
      const normalizedValue = value.replace(/,/g, '');
      const numValue = normalizedValue === '' ? 0 : parseFloat(normalizedValue);
      setFormData(prev => ({ ...prev, taxRate: isNaN(numValue) ? 0 : numValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }, [errors, setFormData, setErrors, setTaxRateInput]);

  const handleSelectChange = useCallback((value: string) => {
    const newPaymentStatus = value as 'Paid' | 'NOT PAID' | 'Quote' | 'Installment Sale';
    setFormData(prev => ({ ...prev, paymentStatus: newPaymentStatus }));

    if (value !== 'Paid' && value !== 'Installment Sale') {
      setLinkToCash(false);
    }

    if (value !== 'Installment Sale') {
      setFormData(prev => ({
        ...prev,
        paymentStatus: newPaymentStatus,
        amountPaid: 0,
        amountDue: 0
      }));
    }
  }, [setFormData, setLinkToCash]);

  const handleAmountPaidChange = useCallback((amount: number, grandTotal: number) => {
    const amountDue = Math.max(0, grandTotal - amount);
    setFormData(prev => ({
      ...prev,
      amountPaid: amount,
      amountDue: amountDue,
    }));
  }, [setFormData]);

  const handlePaymentDateChange = useCallback((date: Date) => {
    // This will be handled by the parent component's setPaymentDate
  }, []);

  return {
    handleChange,
    handleSelectChange,
    handleAmountPaidChange,
    handlePaymentDateChange,
  };
};