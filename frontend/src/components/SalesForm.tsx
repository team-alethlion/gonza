"use client";
// SalesForm.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Sale, SaleFormData, SaleItem, mapSaleToDbSale, Customer, Product } from '@/types';
import { useAuth } from '@/components/auth/AuthProvider';
import { calculateProfit } from '@/utils/calculateProfit';
import { generateReceiptNumber } from '@/utils/generateReceiptNumber';
import { localDb } from '@/lib/dexie';
import { lookupProductByBarcodeAction, updateSaleCashTransactionAction } from '@/app/actions/products';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useProducts } from '@/hooks/useProducts';
import { useSaleProductSelection } from '@/hooks/useSaleProductSelection';
import { useCashAccounts } from '@/hooks/useCashAccounts';
import { useBusiness } from '@/contexts/BusinessContext';
import { useSaleDraft } from '@/hooks/useSaleDraft';
import { useSaleFormLogic } from '@/hooks/useSaleFormLogic';
import { useCashTransactionOperations } from '@/hooks/useCashTransactionOperations';
import { useInstallmentPayments } from '@/hooks/useInstallmentPayments';
import { useStockHistory } from '@/hooks/useStockHistory';
import { useMessages } from '@/hooks/useMessages'; // This is the key fix!
import { useQuery } from '@tanstack/react-query';
import { upsertSaleAction } from '@/app/actions/sales';
import { queueOfflineSale } from '@/hooks/useOfflineSync';

// Components
import SaleFormHeader from '@/components/sales/SaleFormHeader';
import SaleItemsManager from '@/components/sales/SaleItemsManager';
import SalePaymentSection from '@/components/sales/SalePaymentSection';
import SaleFormActions from '@/components/sales/SaleFormActions';
import SaleCategorySelector from '@/components/sales/SaleCategorySelector';
import { mapDbProductToProduct } from '@/types';

interface SalesFormProps {
  initialData?: Sale;
  onSaleComplete?: (sale: Sale, showReceipt?: boolean, includePaymentInfo?: boolean, selectedCustomerCategoryId?: string, onClearDraft?: () => void, saleDate?: Date, thermalPrintAfterSave?: boolean) => void;
  currency?: string;
  customers?: Customer[];
  onAddNewCustomer?: () => void;
  draftData?: any;
  onClearDraft?: () => void;
}

const SalesForm: React.FC<SalesFormProps> = ({
  initialData,
  onSaleComplete,
  currency = 'USD',
  customers = [],
  onAddNewCustomer,
  draftData,
  onClearDraft,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(initialData?.date || new Date());

  // Note: defaultPaymentStatus might need to come from props since we don't have location.state
  const defaultPaymentStatus = initialData?.paymentStatus || 'Paid';

  const { settings } = useBusinessSettings();
  const { user } = useAuth();
  const { accounts: cashAccounts } = useCashAccounts();
  const { currentBusiness } = useBusiness();

  // DEBUG: Check if initialData has categoryId
  useEffect(() => {
    if (initialData) {
      console.log('SalesForm initialData:', initialData);
      console.log('SalesForm initialData.categoryId:', initialData.categoryId);
      console.log('SalesForm initialData.notes:', initialData.notes);
    }
  }, [initialData]);

  const { saveDraft } = useSaleDraft();
  const { updateStockHistoryDatesBySaleId } = useStockHistory(user?.id);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const isClearingRef = useRef(false);

  const [isSubmitted, setIsSubmitted] = useState(false);

  // Key: Use the proper messaging hook
  const { createMessage, templates = [] } = useMessages(user?.id);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [sendSMS, setSendSMS] = useState(true);

  // Comprehensive default SMS template
  // Comprehensive default SMS template
  const defaultSMSTemplate = "Thank you for your purchase from {business_name} We truly appreciate your support and trust in our Business. If you need any assistance or have any questions about your order, please feel free to reach out, on {business_number} We look forward to serving you again!";

  const [smsMessage, setSMSMessage] = useState(defaultSMSTemplate);

  // Custom hooks
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
    setOriginalPaymentStatus,
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
    updateInstallmentPayment,
    deleteInstallmentPayment,
    addPaymentChange,
    clearChanges,
    getModifiedPayments,
    clearForm,
  } = useSaleFormLogic({
    initialData,
    defaultPaymentStatus,
    cashAccounts
  });

  const {
    createCashTransactionForSale,
    updateCashTransactionForSale,
    createInstallmentPaymentWithCash,
    findCashTransactionForSale,
  } = useCashTransactionOperations();

  const {
    payments: installmentPayments,
    linkPaymentToCashAccount,
    unlinkPaymentFromCashAccount,
    updatePayment: updatePaymentOriginal
  } = useInstallmentPayments(initialData?.id);

  const updatePayment = async (paymentId: string, updates: { amount?: number; notes?: string; paymentDate?: Date }) => {
    await updatePaymentOriginal(paymentId, updates);
  };

  const [saleCompleted, setSaleCompleted] = useState(false);

  // Wrapper for clear form to manage the ref and prevent race conditions
  const handleClearForm = () => {
    isClearingRef.current = true;
    if (clearForm) {
      clearForm(() => setSelectedDate(new Date()), onClearDraft);
    }
  };

  // Reset ref after render
  useEffect(() => {
    isClearingRef.current = false;
  });

  // Auto-save draft
  const autoSaveDraft = React.useCallback((isPersistent = true) => {
    // Check ref to prevent saving during clear operation
    if (isClearingRef.current) return;

    if (!initialData && !loading && !saleCompleted && !formRecentlyCleared) {
      const hasData = formData.customerName.trim() ||
        formData.customerAddress.trim() ||
        formData.customerContact.trim() ||
        formData.items.some(item => item.description.trim() || item.quantity !== 1 || item.price !== 0);

      if (hasData) {
        saveDraft(formData, selectedDate, isPersistent);
      }
    }
  }, [formData, selectedDate, initialData, loading, saveDraft, saleCompleted, formRecentlyCleared]);

  useEffect(() => {
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    
    // ⚡️ SPEED: Immediate session save (no timeout) for critical data loss prevention
    autoSaveDraft(false); 

    // ⚡️ PERSISTENCE: Debounced persistent save (localStorage) every 2s
    autoSaveTimeoutRef.current = setTimeout(() => autoSaveDraft(true), 2000);
    
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      autoSaveDraft(true); // Save on unmount
    };
  }, [autoSaveDraft]);

  useEffect(() => {
    const handleBeforeUnload = () => autoSaveDraft();
    const handleVisibilityChange = () => document.hidden && autoSaveDraft();
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoSaveDraft]);

  useEffect(() => {
    if (draftData && !initialData) {
      setFormData(draftData.formData);
      setSelectedDate(draftData.selectedDate);
      setTaxRateInput(draftData.formData.taxRate?.toString() || '');
      // Removed onClearDraft call to keep draft until sale is saved/completed
    }
  }, [draftData, initialData, setFormData, setTaxRateInput]);

  useEffect(() => {
    (async () => {
      if (initialData?.cashTransactionId) {
        setLinkToCash(true);
        setCashTransactionId(initialData.cashTransactionId);
        const accountId = await findCashTransactionForSale(initialData.cashTransactionId);
        if (accountId) setSelectedCashAccountId(accountId);
      }
      if (cashAccounts.length > 0 && !selectedCashAccountId && !initialData?.cashTransactionId) {
        const defaultAccount = cashAccounts.find(acc => acc.isDefault) || cashAccounts[0];
        setSelectedCashAccountId(defaultAccount.id);
      }
    })();
  }, [initialData, cashAccounts, findCashTransactionForSale, setSelectedCashAccountId]);

  const calculateTotalProfit = (items: SaleItem[]) => {
    return items.reduce((total, item) => {
      // Calculate the effective price after discount (same logic as revenue calculation)
      const subtotal = item.price * item.quantity;
      const discountAmount = item.discountType === 'amount'
        ? (item.discountAmount || 0)
        : (subtotal * (item.discountPercentage || 0)) / 100;
      const effectiveRevenue = subtotal - discountAmount;
      const totalCost = item.cost * item.quantity;
      const itemProfit = effectiveRevenue - totalCost;

      return total + itemProfit;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const totalAmount = calculateTotalAmount(formData.items);
    const taxAmount = calculateTaxAmount(totalAmount);
    const grandTotal = totalAmount + taxAmount;

    if (!validateForm(grandTotal, selectedDate)) {
      // Show specific error from errors object if available
      if (errors.customerName) {
        toast.error(errors.customerName);
      } else if (errors.taxRate) {
        toast.error(errors.taxRate);
      } else {
        toast.error('Please fill in all required fields correctly');
      }
      return;
    }

    if (formData.items.length === 0 || formData.items.every(item => !item.description.trim())) {
      toast.error('Please add at least one valid item');
      return;
    }

    setLoading(true);
    try {
      const receiptNumber = initialData?.receiptNumber || await generateReceiptNumber(currentBusiness?.id || '');
      const profit = calculateTotalProfit(formData.items);
      let finalCashTransactionId = cashTransactionId;

      if (initialData) {
        finalCashTransactionId = await updateCashTransactionForSale(
          { id: initialData.id, customerName: formData.customerName, receiptNumber: initialData.receiptNumber, items: formData.items },
          grandTotal, cashTransactionId, originalPaymentStatus, formData.paymentStatus, linkToCash, selectedCashAccountId, selectedDate
        );
        setCashTransactionId(finalCashTransactionId);
      }

      const saleDbData = mapSaleToDbSale(
        formData,
        selectedDate,
        profit,
        receiptNumber,
        user?.id || '',
        currentBusiness?.id || '',
        finalCashTransactionId
      );

      if (!navigator.onLine) {
        // Offline handling
        const offlineSaleData = {
          ...formData,
          date: selectedDate.toISOString(),
          receiptNumber,
          taxRate: formData.taxRate,
          amountPaid: formData.amountPaid,
          amountDue: formData.amountDue,
          items: formData.items,
          notes: formData.notes
        };

        await queueOfflineSale(
          offlineSaleData,
          currentBusiness?.id || '',
          user?.id || ''
        );

        toast.success('Offline! Sale queued for sync when connection returns.');
        setIsSubmitted(true);
        if (draftData && onClearDraft) onClearDraft();
        if (!onSaleComplete) router.push('/agency/sales');
        return;
      }

      const { success, data: saleResult, error } = await upsertSaleAction(saleDbData, !!initialData, initialData?.id);

      if (!success || !saleResult) throw new Error(error || 'Failed to save sale');
      const result = saleResult as any;

      const sale: Sale = {
        id: result.id,
        receiptNumber: result.receiptNumber,
        customerName: result.customerName,
        customerAddress: result.customerAddress || '',
        customerContact: result.customerContact || '',
        customerId: result.customerId || undefined,
        items: result.items,
        paymentStatus: result.paymentStatus,
        profit: result.profit,
        date: new Date(result.date),
        taxRate: result.taxRate ? Number(result.taxRate) : 0,
        cashTransactionId: result.cashTransactionId || undefined,
        amountPaid: result.amountPaid ? Number(result.amountPaid) : undefined,
        amountDue: result.amountDue ? Number(result.amountDue) : undefined,
        notes: result.notes || '',
        categoryId: result.categoryId || undefined,
        total: result.total || 0,
        totalCost: result.totalCost || 0,
        subtotal: result.subtotal || 0,
        discount: result.discount || 0,
        taxAmount: result.taxAmount || 0,
        createdAt: new Date(result.createdAt),
      };

      // Handle inventory, payments, etc.
      if (initialData) {
        // Inventory updates for edits are now handled in onSaleComplete callback in useNewSaleActions.ts
        // This prevents double deduction bug where stock was reduced twice for edited sales

        if (hasChanges) await processPendingPaymentChanges();
        if (formData.paymentStatus === 'Installment Sale' && formData.amountPaid) {
          await createInstallmentPayment({ saleId: sale.id, amount: formData.amountPaid, notes: sale.items.map(i => i.description).join(', '), paymentDate, accountId: linkToCash ? selectedCashAccountId : undefined, locationId: currentBusiness?.id });
          setFormData(prev => ({ ...prev, amountPaid: 0 }));
        }


        if (initialData.date.getTime() !== selectedDate.getTime()) {
          await updateStockHistoryDatesBySaleId(sale.id, selectedDate);
        }
      } else {
        const newCashId = await createCashTransactionForSale(sale, grandTotal, linkToCash, selectedCashAccountId, selectedDate, formData.paymentStatus);
        if (newCashId) {
          await updateSaleCashTransactionAction(sale.id, newCashId);
          sale.cashTransactionId = newCashId;
        }
        if (formData.paymentStatus === 'Installment Sale' && formData.amountPaid) {
          await createInstallmentPaymentWithCash(sale.id, formData.amountPaid, sale.items.map(i => i.description).join(', '), linkToCash, selectedCashAccountId, currentBusiness?.id || '', createInstallmentPayment);
        }
        // Inventory update removed from here - it's handled by onSaleComplete callback in useNewSaleActions.ts
        // This prevents double deduction bug where stock was reduced twice for new sales
      }

      // Clear draft
      if (draftData && onClearDraft) onClearDraft();

      // IMPORTANT: execute onSaleComplete (which updates inventory) BEFORE showing success
      // If inventory fails, it will throw, identifying the sale as failed
      if (onSaleComplete) {
        await onSaleComplete(sale, printAfterSave, includePaymentInfo, selectedCustomerCategoryId, undefined, selectedDate, thermalPrintAfterSave);
      }

      toast.success(initialData ? 'Sale updated successfully!' : 'Sale recorded successfully!');

      // Send Thank You SMS with comprehensive template
      if (sendSMS && formData.customerContact && !initialData) {
        // Generate items list
        const itemsList = formData.items
          .map(item => `• ${item.description} (Qty: ${item.quantity})`)
          .join('\r\n');

        const personalizedMessage = smsMessage
          .replace(/\{customer_name\}/gi, formData.customerName || 'Valued Customer')
          .replace(/\{receipt_number\}/gi, sale.receiptNumber)
          .replace(/\{items_list\}/gi, itemsList)
          .replace(/\{currency\}/gi, settings.currency || 'UGX')
          .replace(/\{amount\}/gi, grandTotal.toLocaleString())
          .replace(/\{business_contact\}/gi, settings.businessPhone || 'our office')
          .replace(/\{business_name\}/gi, currentBusiness?.name || 'Our Business');

        try {
          await createMessage({
            phoneNumber: formData.customerContact,
            content: personalizedMessage,
            customerId: customers.find(c => c.phoneNumber === formData.customerContact)?.id,
            metadata: { sale_id: sale.id, receipt_number: sale.receiptNumber, type: 'thank_you' }
          });
          toast.success('Thank you SMS sent successfully!');
        } catch (smsError: any) {
          toast.error('Sale saved, but failed to send SMS: ' + smsError.message);
        }
      }

      setSaleCompleted(true);
      setIsSubmitted(true);

      setSaleCompleted(true);
      setIsSubmitted(true);

      if (!onSaleComplete) {
        router.push('/agency/sales');
      }

    } catch (error: any) {
      console.error('Error submitting sale:', error);
      setIsSubmitted(false);
      toast.error(error.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ⚡️ Performance: Memoize expensive calculations to prevent recomputing on every render
  const totalAmount = useMemo(
    () => calculateTotalAmount(formData.items),
    [formData.items]
  );

  const taxAmount = useMemo(
    () => calculateTaxAmount(totalAmount),
    [totalAmount, formData.taxRate]
  );

  const grandTotal = useMemo(
    () => totalAmount + taxAmount,
    [totalAmount, taxAmount]
  );

  const scannerBufferRef = useRef('');
  const lastKeyTimeRef = useRef(Date.now());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const currentTime = Date.now();
      const delay = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // Ignore special keys
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
        return;
      }

      // Threshold increased to 60ms for broader scanner compatibility
      const isRapidTyping = delay < 60;
      const isAlphanumeric = /^[a-zA-Z0-9\-_]$/.test(e.key);

      // Aggressive Interception: If NOT in an input field, suppress ALL alphanumeric keys
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true';
      if (!isInput && isAlphanumeric) {
        e.preventDefault();
        e.stopPropagation();
      }

      // Handle Enter key - this is typically the suffix of a scan
      if (e.key === 'Enter') {
        const scannedBarcode = scannerBufferRef.current.trim();
        if (scannedBarcode.length >= 2) {
          e.preventDefault();
          e.stopPropagation();

          console.log(`[Scanner] Processing: "${scannedBarcode}"`);

          const handleScan = async () => {
            // 1. Try Local Lookup (Dexie) - Instant
            let product = await localDb.products
              .where('barcode').equals(scannedBarcode)
              .or('itemNumber').equals(scannedBarcode)
              .first();

            // 2. Fallback to Server if not in local cache
            if (!product) {
              console.log(`[Scanner] 🔍 Not in local DB, trying server lookup...`);
              const serverResult = await lookupProductByBarcodeAction(scannedBarcode, currentBusiness?.id || '');
              if (serverResult) {
                // serverResult is already formatted as Product by our refactored action
                product = {
                  ...serverResult,
                  createdAt: new Date(serverResult.createdAt),
                  updatedAt: new Date(serverResult.updatedAt)
                } as Product;
                // Background update local cache for future scans
                localDb.products.put(product);
              }
            }

            if (product) {
              const referenceCode = product.barcode || product.itemNumber || scannedBarcode;
              console.log(`[Scanner] ✅ Match Found: ${product.name}`);
              handleAddItem(product);
              toast.success(`Scanned: ${product.name} (${referenceCode})`);
            } else {
              console.warn(`[Scanner] ❌ No match for: "${scannedBarcode}"`);
              toast.error(`Product not found: ${scannedBarcode}`);
            }
          };

          handleScan();
          scannerBufferRef.current = '';
          return;
        }
        scannerBufferRef.current = '';
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Add character to buffer
      if (e.key.length === 1) {
        // Only prevent default if this is rapid typing (scanner) AND in an input field
        // OR if not in an input field at all
        if (isRapidTyping && isInput && isAlphanumeric) {
          e.preventDefault();
          e.stopPropagation();
        }

        // Update buffer
        if (delay > 100) {
          scannerBufferRef.current = e.key;
        } else {
          scannerBufferRef.current += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [user?.id, currentBusiness?.id]);

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
        currency={settings.currency}
        saleDate={selectedDate.toISOString()}
      />

      <SalePaymentSection
        paymentStatus={formData.paymentStatus}
        onPaymentStatusChange={handleSelectChange}
        isInstallmentSale={formData.paymentStatus === 'Installment Sale'}
        amountPaid={formData.amountPaid || 0}
        amountDue={formData.amountDue || 0}
        grandTotal={grandTotal}
        currency={settings.currency}
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
        hasPaidWithHistory={formData.paymentStatus === 'Paid' && payments.length > 0}
        onLinkPaymentToCash={(paymentId, accountId) => linkPaymentToCashAccount(paymentId, accountId)}
        onUpdatePayment={updatePayment}
        onPaymentStatusChangeFromInstallment={async (newStatus) => handleSelectChange(newStatus)}
        notes={formData.notes}
        onNotesChange={handleChange}
        categoryId={formData.categoryId || ''}
        onCategoryChange={handleSalesCategoryChange}
      />

      <SaleFormActions
        loading={loading}
        isEditing={!!initialData}
        onCancel={() => router.push('/agency/sales')}
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