import { useCallback } from 'react';
import { SaleFormData, Customer } from '@/types';
import { toast } from 'sonner';
import { formatNumber } from '@/lib/utils';

interface UseCustomerSelectionProps {
  setFormData: React.Dispatch<React.SetStateAction<SaleFormData>>;
  setSelectedCustomerCategoryId: React.Dispatch<React.SetStateAction<string>>;
  formData: SaleFormData;
  settings: any;
}

export const useCustomerSelection = ({
  setFormData,
  setSelectedCustomerCategoryId,
  formData,
  settings
}: UseCustomerSelectionProps) => {
  const handleSelectCustomer = useCallback((customer: Customer) => {
    // 🛡️ DATA INTEGRITY: Check credit limit
    if (customer.creditLimit && customer.creditLimit > 0) {
      const currentBalance = Number(customer.lifetimeValue || 0); // Need to ensure this is the actual balance
      
      // Calculate current sale total
      const saleTotal = formData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const newTotalDebt = currentBalance + saleTotal;

      if (newTotalDebt > customer.creditLimit) {
        toast.error(`CREDIT LIMIT WARNING: This sale will put ${customer.fullName} over their credit limit of ${settings.currency} ${formatNumber(customer.creditLimit)}. Current Balance: ${settings.currency} ${formatNumber(currentBalance)}`, {
          duration: 6000,
        });
      }
    }

    setFormData(prev => ({
      ...prev,
      customerName: customer.fullName,
      customerAddress: customer.location || '',
      customerContact: customer.phoneNumber || '',
      customerId: customer.id, // Save customer ID
    }));
    setSelectedCustomerCategoryId(customer.categoryId || '');
  }, [setFormData, setSelectedCustomerCategoryId, formData.items, settings]);

  const handleCategoryChange = useCallback((categoryId: string) => {
    setSelectedCustomerCategoryId(categoryId);
  }, [setSelectedCustomerCategoryId]);

  return {
    handleSelectCustomer,
    handleCategoryChange,
  };
};