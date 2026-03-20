
import { useState } from 'react';
import { InstallmentPayment } from '@/hooks/useInstallmentPayments';

export interface PaymentChange {
  id: string;
  type: 'update' | 'delete';
  originalPayment: InstallmentPayment;
  updatedData?: { amount?: number; notes?: string; paymentDate?: Date; };
}

export const useLocalPaymentChanges = () => {
  const [pendingChanges, setPendingChanges] = useState<PaymentChange[]>([]);

  const addPaymentChange = (change: PaymentChange) => {
    setPendingChanges(prev => {
      // Remove any existing change for this payment
      const filtered = prev.filter(c => c.id !== change.id);
      return [...filtered, change];
    });
  };

  const removePaymentChange = (paymentId: string) => {
    setPendingChanges(prev => prev.filter(c => c.id !== paymentId));
  };

  const clearChanges = () => {
    setPendingChanges([]);
  };

  const getModifiedPayments = (originalPayments: InstallmentPayment[]): InstallmentPayment[] => {
    return originalPayments
      .filter(payment => {
        // Filter out deleted payments
        const deleteChange = pendingChanges.find(c => c.id === payment.id && c.type === 'delete');
        return !deleteChange;
      })
      .map(payment => {
        // Apply updates to payments
        const updateChange = pendingChanges.find(c => c.id === payment.id && c.type === 'update');
        if (updateChange && updateChange.updatedData) {
          return {
            ...payment,
            amount: updateChange.updatedData.amount ?? payment.amount,
            notes: updateChange.updatedData.notes ?? payment.notes,
            paymentDate: updateChange.updatedData.paymentDate ?? payment.paymentDate,
          };
        }
        return payment;
      });
  };

  const hasChanges = pendingChanges.length > 0;

  return {
    pendingChanges,
    addPaymentChange,
    removePaymentChange,
    clearChanges,
    getModifiedPayments,
    hasChanges
  };
};
