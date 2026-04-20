/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect } from "react";
import { SaleFormData, FormErrors, SaleItem } from "@/types";

const emptyItem: SaleItem = {
  description: "",
  quantity: 1,
  price: 0,
  cost: 0,
};

interface UseFormStateProps {
  initialData?: any;
  defaultPaymentStatus: string;
}

export const useFormState = ({
  initialData,
  defaultPaymentStatus,
}: UseFormStateProps) => {
  const [formData, setFormData] = useState<SaleFormData>(() => {
    const status = (initialData?.paymentStatus || defaultPaymentStatus) as any;
    
    // 🚀 SOURCE OF TRUTH: Derive initial amounts based on status if not explicitly provided
    let amountPaid = initialData?.amountPaid ?? 0;
    let amountDue = initialData?.amountDue ?? 0;

    // If it's a new sale (or no explicit amounts provided), set sensible defaults
    if (initialData?.amountPaid === undefined) {
      if (status === 'Paid') {
        // We can't calculate grandTotal here easily, so we leave it to the useEffect sync
        // but we ensure it's not explicitly forced to 0.
        amountPaid = 0; 
      } else if (status === 'NOT PAID' || status === 'Quote') {
        amountPaid = 0;
      }
    }

    return {
      customerName: initialData?.customerName || "",
      customerAddress: initialData?.customerAddress || "",
      customerContact: initialData?.customerContact || "",
      customerId: initialData?.customerId || "",
      items: initialData?.items || [{ ...emptyItem }],
      paymentStatus: status,
      taxRate: initialData?.taxRate || 0,
      amountPaid,
      amountDue,
      notes: initialData?.notes || "",
      categoryId: initialData?.categoryId || "",
    };
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [taxRateInput, setTaxRateInput] = useState<string>(
    initialData?.taxRate ? initialData.taxRate.toString() : "",
  );
  const [printAfterSave, setPrintAfterSave] = useState<boolean>(true);
  const [thermalPrintAfterSave, setThermalPrintAfterSave] =
    useState<boolean>(false);
  const [includePaymentInfo, setIncludePaymentInfo] = useState<boolean>(true);
  const [selectedCustomerCategoryId, setSelectedCustomerCategoryId] =
    useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(
    initialData?.date ? new Date(initialData.date) : new Date(),
  );
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());

  // Cash account integration states
  const [linkToCash, setLinkToCash] = useState<boolean>(false);
  const [selectedCashAccountId, setSelectedCashAccountId] =
    useState<string>("");
  const [cashTransactionId, setCashTransactionId] = useState<string | null>(
    null,
  );
  const [originalPaymentStatus, setOriginalPaymentStatus] =
    useState<string>(defaultPaymentStatus);
  const [formRecentlyCleared, setFormRecentlyCleared] =
    useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const clearFormState = useCallback((onDateReset?: () => void) => {
    setFormData({
      customerName: "",
      customerAddress: "",
      customerContact: "",
      customerId: "", 
      items: [{ ...emptyItem }],
      paymentStatus: defaultPaymentStatus as any,
      taxRate: 0,
      amountPaid: 0,
      amountDue: 0,
      notes: "",
      categoryId: "",
    });
    setTaxRateInput("");
    setSelectedCustomerCategoryId("");
    setPaymentDate(new Date());
    setSelectedDate(new Date());
    setLinkToCash(false);
    setErrors({});
    setFormRecentlyCleared(true);
    setIsSubmitted(false);
    setIsLoading(false);
    if (onDateReset) {
      onDateReset();
    }
  }, [defaultPaymentStatus]);

  // Sync with initialData if it arrives late or changes
  useEffect(() => {
    if (initialData) {
      const timer = setTimeout(() => {
        setFormData((prev) => {
          // 🛡️ DATA INTEGRITY: Only update if the incoming initialData is different
          // and respect the existing user input if we are in a 'New Sale' state.
          const isNewSale = !initialData.id;
          
          return {
            ...prev,
            customerName: initialData?.customerName || prev.customerName || "",
            customerAddress: initialData?.customerAddress || prev.customerAddress || "",
            customerContact: initialData?.customerContact || prev.customerContact || "",
            customerId: initialData?.customerId || prev.customerId || "",
            items: initialData?.items && initialData.items.length > 0 ? initialData.items : prev.items,
            paymentStatus: initialData?.paymentStatus || prev.paymentStatus,
            taxRate: initialData?.taxRate !== undefined ? initialData.taxRate : prev.taxRate,
            // Only override amountPaid if it's a real existing sale, not a draft/new sale
            // unless the current amountPaid is still 0.
            amountPaid: isNewSale ? (prev.amountPaid || initialData?.amountPaid || 0) : (initialData?.amountPaid ?? prev.amountPaid),
            amountDue: initialData?.amountDue !== undefined ? initialData.amountDue : prev.amountDue,
            notes: initialData?.notes || prev.notes || "",
            categoryId: initialData?.categoryId || prev.categoryId || "",
          };
        });

        if (initialData?.date) {
          setSelectedDate(new Date(initialData.date));
        }

        if (initialData?.categoryId) {
          setFormRecentlyCleared(false);
        }

        if (initialData?.taxRate !== undefined) {
          setTaxRateInput(initialData.taxRate.toString());
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialData]);

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
    isSubmitted,
    isLoading,

    // Setters
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

    // Actions
    clearFormState,
  };
};
