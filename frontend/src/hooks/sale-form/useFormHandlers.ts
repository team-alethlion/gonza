/* eslint-disable @typescript-eslint/no-explicit-any */

import { SaleFormData, FormErrors } from '@/types';
import { useCallback } from 'react';

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
      setFormData((prev: any) => ({ ...prev, taxRate: isNaN(numValue) ? 0 : numValue }));
    } else {
      setFormData((prev: any) => ({ ...prev, [name]: value }));
    }

    if (errors[name as keyof FormErrors]) {
      setErrors((prev: any) => ({ ...prev, [name]: undefined }));
    }
  }, [errors, setFormData, setErrors, setTaxRateInput]);

  const handleSelectChange = useCallback((value: string) => {
    const newPaymentStatus = value as 'Paid' | 'NOT PAID' | 'Quote' | 'Installment Sale';
    
    if (value !== 'Paid' && value !== 'Installment Sale') {
      setLinkToCash(false);
    }

    setFormData((prev) => {
      // Calculate total for the current items to set correct defaults
      const subtotal = prev.items.reduce((sum: number, item: any) => {
        const itemSubtotal = item.price * item.quantity;
        const discountAmount = item.discountType === 'amount' 
          ? (item.discountAmount || 0)
          : (itemSubtotal * (item.discountPercentage || 0)) / 100;
        return sum + (itemSubtotal - discountAmount);
      }, 0);
      const taxAmount = subtotal * ((prev.taxRate || 0) / 100);
      const grandTotal = subtotal + taxAmount;

      let amountPaid = prev.amountPaid;
      let amountDue = prev.amountDue;

      if (newPaymentStatus === 'Paid') {
        amountPaid = grandTotal;
        amountDue = 0;
      } else if (newPaymentStatus === 'Quote') {
        // 🚀 LOGIC REFINEMENT: Quotes should not carry debt
        amountPaid = 0;
        amountDue = 0;
      } else if (newPaymentStatus === 'NOT PAID') {
        amountPaid = 0;
        amountDue = grandTotal;
      } else if (newPaymentStatus === 'Installment Sale') {
        // Keep existing amountPaid, but update amountDue
        amountDue = Math.max(0, grandTotal - (amountPaid || 0));
      }

      return {
        ...prev,
        paymentStatus: newPaymentStatus,
        amountPaid,
        amountDue
      };
    });
  }, [setFormData, setLinkToCash]);

  const handleAmountPaidChange = useCallback((amount: number, grandTotal: number, totalPaidFromHistory: number = 0) => {
    const amountDue = Math.max(0, grandTotal - (totalPaidFromHistory + amount));
    setFormData((prev) => {
      // 🚀 INTELLIGENT AUTO-SWITCH:
      // If user types a payment while in 'NOT PAID' mode, switch them to 'Installment Sale'
      // so their payment isn't wiped by the 'NOT PAID' logic.
      let newStatus = prev.paymentStatus;
      if (prev.paymentStatus === 'NOT PAID' && amount > 0) {
        newStatus = 'Installment Sale';
      } else if (prev.paymentStatus === 'Installment Sale' && amount >= grandTotal) {
        // Optional: could auto-promote to Paid here if preferred, 
        // but keeping it as Installment is safer for user intent.
      }

      return {
        ...prev,
        paymentStatus: newStatus,
        amountPaid: amount,
        amountDue: amountDue,
      };
    });
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