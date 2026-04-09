/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo } from "react";
import { useFormState } from "./sale-form/useFormState";
import { useFormHandlers } from "./sale-form/useFormHandlers";
import { useItemManagement } from "./sale-form/useItemManagement";
import { useCustomerSelection } from "./sale-form/useCustomerSelection";
import { useFormValidation } from "./sale-form/useFormValidation";
import { useFormCalculations } from "./sale-form/useFormCalculations";
import { usePaymentOperations } from "./sale-form/usePaymentOperations";
import { useBusinessSettings } from "./useBusinessSettings";

interface UseSaleFormLogicProps {
  initialData?: any;
  defaultPaymentStatus: string;
  cashAccounts: any[];
  initialCategories?: any[];
}

export const useSaleFormLogic = ({
  initialData,
  defaultPaymentStatus,
  cashAccounts: _cashAccounts, // Prefix with underscore to mark as intentionally unused for now
  initialCategories = [],
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

  const { settings } = useBusinessSettings();

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
    formData,
    settings
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

  // 🚀 DATA INTEGRITY: Pure helper to resolve financials based on current state
  // This can be used by both state sync effects AND immediate previews to avoid race conditions.
  const resolveFinancials = useCallback((items: any[], taxRate: number, status: string, paidInput?: number) => {
    const subtotal = calculateTotalAmount(items);
    const taxAmount = calculateTaxAmount(subtotal);
    const total = subtotal + taxAmount;

    let resolvedPaid = paidInput ?? 0;
    let resolvedDue = total;

    // 🛡️ DATA INTEGRITY: Handle all status variations (Human-readable and Backend-enums)
    const isPaid = status === 'Paid' || status === 'COMPLETED';
    const isQuote = status === 'Quote' || status === 'QUOTE';
    const isNotPaid = status === 'NOT PAID' || status === 'UNPAID' || status === 'PENDING';
    const isInstallment = status === 'Installment Sale' || status === 'INSTALLMENT';

    if (isPaid) {
      resolvedPaid = total;
      resolvedDue = 0;
    } else if (isQuote) {
      resolvedPaid = 0;
      resolvedDue = 0;
    } else if (isNotPaid) {
      resolvedPaid = 0;
      resolvedDue = total;
    } else if (isInstallment) {
      resolvedPaid = Math.min(paidInput ?? 0, total);
      resolvedDue = Math.max(0, total - resolvedPaid);
    }

    return { total, subtotal, taxAmount, amountPaid: resolvedPaid, amountDue: resolvedDue };
  }, [calculateTotalAmount, calculateTaxAmount]);

  // 🚀 PERFORMANCE: Memoize totals to avoid heavy recalculations in hooks
  const subtotal = useMemo(() => calculateTotalAmount(formData.items), [formData.items, calculateTotalAmount]);
  const taxAmount = useMemo(() => calculateTaxAmount(subtotal), [subtotal, calculateTaxAmount]);
  const grandTotal = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount]);

  // 🚀 DATA INTEGRITY: Centralized sync for amountPaid and amountDue
  // This solves the "Item-Addition Blind Spot" by ensuring that when items, tax OR status changes,
  // the financial fields in formData are recalculated based on the payment status.
  useEffect(() => {
    // We use the functional updater to avoid having formData in the dependency array
    setFormData(prev => {
      // Recalculate using the resolver with CURRENT values from state
      const { amountPaid, amountDue } = resolveFinancials(
        prev.items, 
        prev.taxRate || 0, 
        prev.paymentStatus, 
        prev.amountPaid
      );

      // 🛡️ INTELLIGENT AUTO-SWITCH: 
      // If we are in 'NOT PAID' mode but a payment is detected, promote to Installment.
      let finalStatus = prev.paymentStatus;
      if ((prev.paymentStatus === 'NOT PAID' || prev.paymentStatus === 'UNPAID') && amountPaid > 0) {
        finalStatus = 'Installment Sale';
      }

      // Avoid infinite loops by checking if values actually need to change
      if (amountPaid === prev.amountPaid && amountDue === prev.amountDue && finalStatus === prev.paymentStatus) {
        return prev;
      }

      return {
        ...prev,
        paymentStatus: finalStatus,
        amountPaid,
        amountDue
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grandTotal, formData.paymentStatus, resolveFinancials]); // Removed amountPaid from deps, it's accessed via updater

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
    resolveFinancials,
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
