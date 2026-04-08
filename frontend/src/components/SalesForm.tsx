/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
// SalesForm.tsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Sale,
  Customer,
} from "@/types";
import { useAuth } from "@/components/auth/AuthProvider";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useCashAccounts } from "@/hooks/useCashAccounts";
import { useBusiness } from "@/contexts/BusinessContext";
import { useSaleDraft } from "@/hooks/useSaleDraft";
import { useSaleFormLogic } from "@/hooks/useSaleFormLogic";
import { useCashTransactionOperations } from "@/hooks/useCashTransactionOperations";
import { useInstallmentPayments } from "@/hooks/useInstallmentPayments";
import { useStockHistory } from "@/hooks/useStockHistory";
import { useMessages } from "@/hooks/useMessages"; 
import { useBarcodeScanner } from "@/hooks/sale-form/useBarcodeScanner";
import { useSaleSubmit } from "@/hooks/sale-form/useSaleSubmit";
import { useSaleDraftAutoSave } from "@/hooks/sale-form/useSaleDraftAutoSave";

// Components
import SaleFormHeader from "@/components/sales/SaleFormHeader";
import CustomerInformation from "@/components/sales/CustomerInformation";
import SaleItemsManager from "@/components/sales/SaleItemsManager";
import SalePaymentSection from "@/components/sales/SalePaymentSection";
import SalesFormActions from "@/components/sales/SalesFormActions";
import SaleScannerSection from "@/components/sales/SaleScannerSection";
import { SaleSMSSection } from "@/components/sales/SaleSMSSection";

interface SalesFormProps {
  initialData?: Sale;
  onSaleComplete?: (
    sale: Sale,
    showReceipt?: boolean,
    includePaymentInfo?: boolean,
    selectedCustomerCategoryId?: string,
    onClearDraft?: () => void,
    saleDate?: Date,
    thermalPrintAfterSave?: boolean,
  ) => void;
  onPreviewReceipt?: (sale: Sale) => void;
  currency?: string;
  customers?: Customer[];
  onAddNewCustomer?: () => void;
  draftData?: any;
  onClearDraft?: () => void;
  isReceiptOpen?: boolean;
  initialAccounts?: any[];
  initialCustomerCategories?: any[];
  initialCategories?: any[];
}

const SalesForm: React.FC<SalesFormProps> = ({
  initialData,
  onSaleComplete,
  onPreviewReceipt,
  currency = "USD",
  customers = [],
  onAddNewCustomer,
  draftData,
  onClearDraft,
  isReceiptOpen = false,
  initialAccounts = [],
  initialCustomerCategories = [],
  initialCategories = [],
}) => {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  const { settings } = useBusinessSettings();

  useEffect(() => {
    setMounted(true);
  }, []);
  const { user } = useAuth();
  const { accounts: cashAccounts } = useCashAccounts(initialAccounts);
  const { currentBusiness } = useBusiness();

  const { saveDraft } = useSaleDraft();
  const { updateStockHistoryDatesBySaleId } = useStockHistory(user?.id);
  const isClearingRef = useRef(false);

  const { createMessage } = useMessages(user?.id);
  const [sendSMS, setSendSMS] = useState(true);
  const [smsMessage, setSMSMessage] = useState("");

  const {
    formData,
    errors,
    taxRateInput,
    printAfterSave,
    thermalPrintAfterSave,
    includePaymentInfo,
    selectedCustomerCategoryId,
    paymentDate,
    linkToCash,
    selectedCashAccountId,
    cashTransactionId,
    originalPaymentStatus,
    formRecentlyCleared,
    payments,
    pendingChanges,
    hasChanges,
    setFormData,
    setTaxRateInput,
    setPrintAfterSave,
    setThermalPrintAfterSave,
    setIncludePaymentInfo,
    setLinkToCash,
    setSelectedCashAccountId,
    setCashTransactionId,
    handleChange,
    handleSelectChange,
    handleAddItem,
    handleUpdateItem,
    handleRemoveItem,
    handleSelectCustomer,
    handleCategoryChange,
    handleSalesCategoryChange,
    handleAmountPaidChange,
    handlePaymentDateChange,
    calculateTotalAmount,
    calculateTaxAmount,
    validateForm,
    processPendingPaymentChanges,
    createInstallmentPayment,
    addPaymentChange,
    getModifiedPayments,
    clearForm,
    selectedDate,
    setSelectedDate,
    isSubmitted,
    isLoading: logicLoading,
    setLoading
  } = useSaleFormLogic({
    initialData,
    defaultPaymentStatus: initialData?.paymentStatus || "Paid",
    cashAccounts,
    initialCategories,
  }) as any;
  const {
    createCashTransactionForSale,
    updateCashTransactionForSale,
    createInstallmentPaymentWithCash,
    findCashTransactionForSale,
  } = useCashTransactionOperations();

  const {
    linkPaymentToCashAccount,
    updatePayment: updatePaymentOriginal,
  } = useInstallmentPayments(initialData?.id);

  const { loading, handleSubmit } = useSaleSubmit({
    initialData,
    formData,
    selectedDate,
    currentBusiness,
    user,
    cashTransactionId,
    setCashTransactionId,
    originalPaymentStatus,
    linkToCash,
    selectedCashAccountId,
    calculateTotalAmount,
    calculateTaxAmount,
    validateForm,
    errors,
    hasChanges,
    processPendingPaymentChanges,
    createInstallmentPayment,
    updateStockHistoryDatesBySaleId,
    createCashTransactionForSale,
    updateCashTransactionForSale,
    createInstallmentPaymentWithCash,
    onSaleComplete,
    printAfterSave,
    includePaymentInfo,
    selectedCustomerCategoryId,
    onClearDraft,
    thermalPrintAfterSave,
    sendSMS,
    smsMessage,
    createMessage,
    customers,
    paymentDate
  });

  useSaleDraftAutoSave({
    initialData,
    loading,
    isSubmitted,
    formRecentlyCleared,
    formData,
    selectedDate,
    saveDraft,
    isClearingRef,
    isReceiptOpen,
  });

  const { scannerBufferRef } = useBarcodeScanner({
    currentBusinessId: currentBusiness?.id,
    handleAddItem,
    isFormDisabled: isSubmitted
  });

  const handlePreview = () => {
    if (!onPreviewReceipt) return;
    if (formData.items.length === 0 || !formData.items[0].description.trim()) {
      toast.error("Add at least one item to preview the receipt");
      return;
    }

    // ⚡️ PERSISTENCE: Save draft before preview to ensure latest changes are in storage
    saveDraft(formData, selectedDate, true);

    const subtotal = calculateTotalAmount(formData.items);
    const taxAmt = calculateTaxAmount(subtotal);
    const total = subtotal + taxAmt;

    const previewSale: Sale = {
      id: "preview",
      receiptNumber: initialData?.receiptNumber || "PREVIEW",
      customerName: formData.customerName || "Valued Customer",
      customerAddress: formData.customerAddress,
      customerContact: formData.customerContact,
      items: formData.items.map((item: any) => ({
        ...item,
        price: Number(item.price),
        quantity: Number(item.quantity),
      })) as any,
      paymentStatus: formData.paymentStatus,
      profit: 0,
      total: total,
      totalCost: 0,
      subtotal: subtotal,
      discount: 0,
      taxAmount: taxAmt,
      date: new Date(),
      taxRate: formData.taxRate || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      amountPaid: formData.amountPaid,
      amountDue: total - (formData.amountPaid || 0),
    };
    onPreviewReceipt(previewSale);
  };

  const updatePayment = async (paymentId: string, updates: { amount?: number; notes?: string; paymentDate?: Date }) => {
    await updatePaymentOriginal(paymentId, updates);
  };

  const handleClearForm = () => {
    isClearingRef.current = true;
    if (clearForm) {
      clearForm(() => setSelectedDate(new Date()), onClearDraft);
    }
  };

  useEffect(() => { isClearingRef.current = false; });

  useEffect(() => {
    // Only load draft if we have data, we are in a new sale, 
    // AND the form is currently empty (not partially filled)
    if (draftData && !initialData) {
      const isFormEmpty = 
        !formData.customerName.trim() && 
        !formData.customerAddress.trim() && 
        !formData.customerContact.trim() &&
        formData.items.length === 1 &&
        !formData.items[0].description.trim();

      if (isFormEmpty) {
        setFormData(draftData.formData);
        setSelectedDate(draftData.selectedDate);
        setTaxRateInput(draftData.formData.taxRate?.toString() || "");
      }
    }
  }, [draftData, initialData, setFormData, setTaxRateInput, setSelectedDate]);

  useEffect(() => {
    (async () => {
      if (initialData?.cashTransactionId) {
        setLinkToCash(true);
        setCashTransactionId(initialData.cashTransactionId);
        const accountId = await findCashTransactionForSale(initialData.cashTransactionId);
        if (accountId) setSelectedCashAccountId(accountId);
      }
      if (cashAccounts.length > 0 && !selectedCashAccountId && !initialData?.cashTransactionId) {
        const defaultAccount = cashAccounts.find((acc) => acc.isDefault) || cashAccounts[0];
        setSelectedCashAccountId(defaultAccount.id);
      }
    })();
  }, [initialData, cashAccounts, findCashTransactionForSale, setSelectedCashAccountId, setLinkToCash, setCashTransactionId, selectedCashAccountId]);

  const totalAmount = useMemo(() => calculateTotalAmount(formData.items), [formData.items, calculateTotalAmount]);
  const taxAmount = useMemo(() => calculateTaxAmount(totalAmount), [totalAmount, calculateTaxAmount]);
  const grandTotal = useMemo(() => totalAmount + taxAmount, [totalAmount, taxAmount]);

  if (!mounted) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-64 bg-gray-100 rounded-lg"></div>
        <div className="h-48 bg-gray-100 rounded-lg"></div>
        <div className="h-24 bg-gray-100 rounded-lg"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <SaleFormHeader
        isEditing={!!initialData}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        customerName={formData.customerName}
        customerAddress={formData.customerAddress}
        customerContact={formData.customerContact}
        notes={formData.notes}
        onCustomerInfoChange={handleChange}
        errors={errors}
        customers={customers}
        onAddNewCustomer={onAddNewCustomer}
        onSelectCustomer={handleSelectCustomer}
        selectedCategoryId={selectedCustomerCategoryId}
        onCategoryChange={handleCategoryChange}
        onClearForm={!initialData ? handleClearForm : undefined}
        onPreview={handlePreview}
        initialCustomerCategories={initialCustomerCategories}
      />

      <SaleScannerSection 
        onBarcodeScan={(code) => {
          scannerBufferRef.current = code;
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        }}
      />

      <SaleItemsManager
        items={formData.items}
        onAddItem={handleAddItem}
        onUpdateItem={handleUpdateItem}
        onRemoveItem={handleRemoveItem}
        taxRateInput={taxRateInput}
        onTaxRateChange={handleChange}
        errors={errors}
        totalAmount={totalAmount}
        taxAmount={taxAmount}
        grandTotal={grandTotal}
        taxRate={formData.taxRate || 0}
        currency={currency}
        saleDate={selectedDate.toISOString()}
      />

      <SalePaymentSection
        paymentStatus={formData.paymentStatus}
        onPaymentStatusChange={handleSelectChange}
        isInstallmentSale={formData.paymentStatus === "Installment Sale"}
        amountPaid={formData.amountPaid || 0}
        amountDue={formData.amountDue || 0}
        grandTotal={grandTotal}
        currency={currency}
        onAmountPaidChange={(amount) => handleAmountPaidChange(amount, grandTotal)}
        onPaymentDateChange={handlePaymentDateChange}
        paymentDate={paymentDate}
        saleId={initialData?.id}
        isEditing={!!initialData}
        payments={getModifiedPayments(payments)}
        pendingChanges={pendingChanges}
        onStagePaymentChange={initialData ? addPaymentChange : undefined}
        linkToCash={linkToCash}
        onLinkToCashChange={setLinkToCash}
        selectedCashAccountId={selectedCashAccountId}
        onCashAccountChange={setSelectedCashAccountId}
        cashAccounts={cashAccounts}
        hasPaidWithHistory={formData.paymentStatus === "Paid" && payments.length > 0}
        onLinkPaymentToCash={(paymentId, accountId) => linkPaymentToCashAccount(paymentId, accountId)}
        onUpdatePayment={updatePayment}
        onPaymentStatusChangeFromInstallment={async (newStatus) => handleSelectChange(newStatus)}
        notes={formData.notes}
        onNotesChange={handleChange}
        categoryId={formData.categoryId || ""}
        onCategoryChange={handleSalesCategoryChange}
        initialCategories={initialCategories}
      />

      <SalesFormActions
        loading={loading}
        onSubmit={handleSubmit}
        onPreview={handlePreview}
        isEditing={!!initialData}
        onCancel={() => router.push("/agency/sales")}
        onClearForm={!initialData ? handleClearForm : undefined}
        printAfterSave={printAfterSave}
        onPrintAfterSaveChange={setPrintAfterSave}
        thermalPrintAfterSave={thermalPrintAfterSave}
        onThermalPrintAfterSaveChange={setThermalPrintAfterSave}
        paymentStatus={formData.paymentStatus}
        includePaymentInfo={includePaymentInfo}
        onIncludePaymentInfoChange={setIncludePaymentInfo}
        hasPendingPaymentChanges={hasChanges}
        sendSMS={sendSMS}
        onSendSMSChange={setSendSMS}
        smsMessage={smsMessage}
        onSMSMessageChange={setSMSMessage}
        customerHasPhone={!!formData.customerContact}
        customerName={formData.customerName}
        disabled={isSubmitted}
      />
    </form>
  );
};

export default SalesForm;
