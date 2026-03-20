/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from "react";
import { useFormState } from "./sale-form/useFormState";
import { useFormHandlers } from "./sale-form/useFormHandlers";
import { useItemManagement } from "./sale-form/useItemManagement";
import { useCustomerSelection } from "./sale-form/useCustomerSelection";
import { useFormValidation } from "./sale-form/useFormValidation";
import { useFormCalculations } from "./sale-form/useFormCalculations";
import { usePaymentOperations } from "./sale-form/usePaymentOperations";

interface UseSaleFormLogicProps {
  initialData?: any;
  defaultPaymentStatus: string;
  cashAccounts: any[];
}

export const useSaleFormLogic = ({
  initialData,
  defaultPaymentStatus,
  cashAccounts: _cashAccounts, // Prefix with underscore to mark as intentionally unused for now
}: UseSaleFormLogicProps) => {
  // Form state management
  const {
    formData,
    errors,
    taxRateInput,
    printAfterSave,
    thermalPrintAfterSave,
    includePaymentInfo,
    selectedCustomerCategoryId,
    selectedDate, // Now correctly destructured
    paymentDate,
    linkToCash,
    selectedCashAccountId,
    cashTransactionId,
    originalPaymentStatus,
    formRecentlyCleared,
    isSubmitted,
    isLoading,
    setFormData,
    setErrors,
    setTaxRateInput,
    setPrintAfterSave,
    setThermalPrintAfterSave,
    setIncludePaymentInfo,
    setSelectedCustomerCategoryId,
    setSelectedDate,
    setPaymentDate,
    setLinkToCash,
    setSelectedCashAccountId,
    setCashTransactionId,
    setOriginalPaymentStatus,
    setFormRecentlyCleared,
    setIsSubmitted,
    setIsLoading,
    clearFormState,
  } = useFormState({ initialData, defaultPaymentStatus });

  // Alias for internal use
  const setLoading = setIsLoading;

  // Form handlers
  const {
    handleChange,
    handleSelectChange,
    handleAmountPaidChange,
    handlePaymentDateChange: _handlePaymentDateChange, // Mark as unused to fix ESLint
  } = useFormHandlers({
    formData,
    setFormData,
    errors,
    setErrors,
    setTaxRateInput,
    setLinkToCash,
  });

  // Item management
  const {
    handleAddItem,
    handleAddItemWithProduct,
    handleUpdateItem,
    handleRemoveItem,
  } = useItemManagement({ formData, setFormData });

  // Customer selection
  const { handleSelectCustomer, handleCategoryChange } = useCustomerSelection({
    setFormData,
    setSelectedCustomerCategoryId,
  });

  // Form validation
  const { validateForm } = useFormValidation({
    formData,
    linkToCash,
    selectedCashAccountId,
    initialData,
    formRecentlyCleared,
    setErrors,
  });

  // Calculations
  const { calculateTotalAmount, calculateTaxAmount } = useFormCalculations({
    taxRate: formData.taxRate || 0,
  });

  // Payment operations
  const {
    payments,
    pendingChanges,
    hasChanges,
    createInstallmentPayment,
    updateInstallmentPayment,
    deleteInstallmentPayment,
    addPaymentChange,
    clearChanges,
    getModifiedPayments,
    processPendingPaymentChanges,
  } = usePaymentOperations({ initialDataId: initialData?.id });

  // Enhanced payment date change handler
  const handlePaymentDateChangeEnhanced = useCallback(
    (date: Date) => {
      setPaymentDate(date);
    },
    [setPaymentDate],
  );

  // Enhanced clear form that can reset date and draft
  const clearForm = useCallback(
    (onDateReset?: () => void, onDraftClear?: () => void) => {
      clearFormState(onDateReset);
      clearChanges();
      if (onDraftClear) {
        onDraftClear();
      }
    },
    [clearFormState, clearChanges],
  );

  // Enhanced handlers that reset the formRecentlyCleared flag
  const handleChangeEnhanced = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (formRecentlyCleared) {
        setFormRecentlyCleared(false);
      }
      handleChange(e);
    },
    [formRecentlyCleared, setFormRecentlyCleared, handleChange],
  );

  const handleSelectChangeEnhanced = useCallback(
    (value: string) => {
      if (formRecentlyCleared) {
        setFormRecentlyCleared(false);
      }
      handleSelectChange(value);
    },
    [formRecentlyCleared, setFormRecentlyCleared, handleSelectChange],
  );

  // Enhanced item handlers that reset the formRecentlyCleared flag
  const handleAddItemEnhanced = useCallback(
    (product?: any) => {
      if (formRecentlyCleared) {
        setFormRecentlyCleared(false);
      }

      // Check if product is actually an event (from onClick) or a valid product object
      // Events have 'type' or 'target' properties, products have 'id' or 'name'
      const isEvent =
        product &&
        (product.nativeEvent ||
          product.preventDefault ||
          product.stopPropagation ||
          (product.type && product.target));

      if (product && !isEvent) {
        handleAddItemWithProduct(product);
      } else {
        handleAddItem();
      }
    },
    [
      formRecentlyCleared,
      setFormRecentlyCleared,
      handleAddItem,
      handleAddItemWithProduct,
    ],
  );

  const handleUpdateItemEnhanced = useCallback(
    (index: number, updatedItem: any) => {
      if (formRecentlyCleared) {
        setFormRecentlyCleared(false);
      }
      handleUpdateItem(index, updatedItem);
    },
    [formRecentlyCleared, setFormRecentlyCleared, handleUpdateItem],
  );

  const handleRemoveItemEnhanced = useCallback(
    (index: number) => {
      if (formRecentlyCleared) {
        setFormRecentlyCleared(false);
      }
      handleRemoveItem(index);
    },
    [formRecentlyCleared, setFormRecentlyCleared, handleRemoveItem],
  );

  // Enhanced customer handlers that reset the formRecentlyCleared flag
  const handleSelectCustomerEnhanced = useCallback(
    (customer: any) => {
      if (formRecentlyCleared) {
        setFormRecentlyCleared(false);
      }
      handleSelectCustomer(customer);
    },
    [formRecentlyCleared, setFormRecentlyCleared, handleSelectCustomer],
  );

  const handleCategoryChangeEnhanced = useCallback(
    (categoryId: string) => {
      if (formRecentlyCleared) {
        setFormRecentlyCleared(false);
      }
      handleCategoryChange(categoryId);
    },
    [formRecentlyCleared, setFormRecentlyCleared, handleCategoryChange],
  );

  // Sales category change handler
  const handleSalesCategoryChange = useCallback(
    (categoryId: string) => {
      if (formRecentlyCleared) {
        setFormRecentlyCleared(false);
      }
      setFormData((prev) => ({ ...prev, categoryId }));
    },
    [formRecentlyCleared, setFormRecentlyCleared, setFormData],
  );

  return {
    // State
    formData,
    errors,
    taxRateInput,
    printAfterSave,
    thermalPrintAfterSave,
    includePaymentInfo,
    selectedCustomerCategoryId,
    selectedDate,
    paymentDate,
    linkToCash,
    selectedCashAccountId,
    cashTransactionId,
    originalPaymentStatus,
    formRecentlyCleared,
    payments,
    pendingChanges,
    hasChanges,
    isSubmitted,
    setIsSubmitted,
    isLoading,
    setLoading: setIsLoading,

    // Setters
    setFormData,
    setTaxRateInput,
    setPrintAfterSave,
    setThermalPrintAfterSave,
    setIncludePaymentInfo,
    setSelectedDate,
    setLinkToCash,
    setSelectedCashAccountId,
    setCashTransactionId,
    setOriginalPaymentStatus,

    // Handlers
    handleChange: handleChangeEnhanced,
    handleSelectChange: handleSelectChangeEnhanced,
    handleAddItem: handleAddItemEnhanced,
    handleUpdateItem: handleUpdateItemEnhanced,
    handleRemoveItem: handleRemoveItemEnhanced,
    handleSelectCustomer: handleSelectCustomerEnhanced,
    handleCategoryChange: handleCategoryChangeEnhanced,
    handleSalesCategoryChange,
    handleAmountPaidChange,
    handlePaymentDateChange: handlePaymentDateChangeEnhanced,
    clearForm,

    // Utils
    calculateTotalAmount,
    calculateTaxAmount,
    validateForm,
    processPendingPaymentChanges,

    // Payment methods
    createInstallmentPayment,
    updateInstallmentPayment,
    deleteInstallmentPayment,
    addPaymentChange,
    clearChanges,
    getModifiedPayments,
  };
};
