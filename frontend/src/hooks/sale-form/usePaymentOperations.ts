import { useCallback } from 'react';
import { useInstallmentPayments } from '@/hooks/useInstallmentPayments';
import { useLocalPaymentChanges } from '@/hooks/useLocalPaymentChanges';

interface UsePaymentOperationsProps {
  initialDataId?: string;
}

export const usePaymentOperations = ({ initialDataId }: UsePaymentOperationsProps) => {
  const { 
    payments, 
    createPayment: createInstallmentPayment, 
    updatePayment: updateInstallmentPayment, 
    deletePayment: deleteInstallmentPayment 
  } = useInstallmentPayments(initialDataId);

  const { 
    pendingChanges, 
    addPaymentChange, 
    clearChanges, 
    getModifiedPayments, 
    hasChanges 
  } = useLocalPaymentChanges();

  const processPendingPaymentChanges = useCallback(async () => {
    for (const change of pendingChanges) {
      if (change.type === 'update') {
        await updateInstallmentPayment(change.id, change.updatedData || {});
      } else if (change.type === 'delete') {
        await deleteInstallmentPayment(change.id);
      }
    }
    clearChanges();
  }, [pendingChanges, updateInstallmentPayment, deleteInstallmentPayment, clearChanges]);

  return {
    // Payment state
    payments,
    pendingChanges,
    hasChanges,
    
    // Payment methods
    createInstallmentPayment,
    updateInstallmentPayment,
    deleteInstallmentPayment,
    addPaymentChange,
    clearChanges,
    getModifiedPayments,
    processPendingPaymentChanges,
  };
};