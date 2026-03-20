import { useCallback } from 'react';
import { SaleFormData, Customer } from '@/types';

interface UseCustomerSelectionProps {
  setFormData: React.Dispatch<React.SetStateAction<SaleFormData>>;
  setSelectedCustomerCategoryId: React.Dispatch<React.SetStateAction<string>>;
}

export const useCustomerSelection = ({
  setFormData,
  setSelectedCustomerCategoryId,
}: UseCustomerSelectionProps) => {
  const handleSelectCustomer = useCallback((customer: Customer) => {
    setFormData(prev => ({
      ...prev,
      customerName: customer.fullName,
      customerAddress: customer.location || '',
      customerContact: customer.phoneNumber || '',
      customerId: customer.id, // Save customer ID
    }));
    setSelectedCustomerCategoryId(customer.categoryId || '');
  }, [setFormData, setSelectedCustomerCategoryId]);

  const handleCategoryChange = useCallback((categoryId: string) => {
    setSelectedCustomerCategoryId(categoryId);
  }, [setSelectedCustomerCategoryId]);

  return {
    handleSelectCustomer,
    handleCategoryChange,
  };
};