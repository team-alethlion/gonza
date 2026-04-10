/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { useCustomers, Customer } from "@/hooks/useCustomers";
import { useSalesData } from "@/hooks/useSalesData";
import { Sale } from "@/types";
import { toast } from "sonner";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { useBusiness } from "@/contexts/BusinessContext";
import { generateThermalReceipt } from "@/utils/generateThermalReceipt";
import { print } from "@/utils/thermalPrinterPlug";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { getCustomerByNameAction, updateSaleCustomerAction } from "@/app/actions/sales";

export const useNewSaleActions = (
  editSale?: Sale,
  onSaveSuccess?: () => void,
  initialData?: {
    initialCustomers?: any[];
    initialCategories?: any[];
    initialAccounts?: any[];
  }
) => {
  const router = useRouter();
  const { user } = useAuth();
  const { toast: uiToast } = useToast();
  const { customers, createCustomer } = useCustomers(50, { 
    customers: initialData?.initialCustomers || [], 
    count: initialData?.initialCustomers?.length || 0 
  });
  const { addSale, updateSale } = useSalesData(user?.id, 'desc', undefined, true, undefined, { disableFetch: true });
  const { logActivity } = useActivityLogger();
  const { currentBusiness } = useBusiness();
  const { settings } = useBusinessSettings();

  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [newCustomerDialogOpen, setNewCustomerDialogOpen] = useState(false);
  const [includePaymentInfo, setIncludePaymentInfo] = useState(true);

  const handleSaleComplete = useCallback(
    async (
      sale: Sale,
      showReceipt: boolean = false,
      includePaymentInfo: boolean = true,
      selectedCategoryId?: string,
      clearDraft?: () => void,
      saleDate?: Date,
      thermalPrintAfterSave: boolean = false,
    ) => {
      // Clear draft when sale is completed
      if (!editSale && clearDraft) {
        clearDraft();
      }

      // ⚡️ NOTE: Inventory sync is now handled globally by SyncManager.
      // No need to trigger manual sync here after sale.

      // Only save customer to customers database if they don't exist already
      if (user?.id && sale.customerName && typeof sale.customerName === 'string' && sale.customerName.trim()) {
        let customerId = sale.customerId;

        // If no customerId provided, check if customer already exists by name
        if (!customerId) {
          const existingCustomer = await getCustomerByNameAction(
            currentBusiness?.id || "",
            sale.customerName.trim(),
          );

          if (existingCustomer) {
            customerId = existingCustomer.id;
          } else {
            try {
              const newCustomer = await createCustomer({
                fullName: sale.customerName,
                phoneNumber: sale.customerContact || null,
                location: sale.customerAddress || null,
                email: null,
                birthday: null,
                gender: null,
                categoryId: sale.categoryId || null,
                notes: null,
                tags: null,
                socialMedia: null,
                branchId: currentBusiness?.id || ''
                });
              if (newCustomer) {
                customerId = newCustomer.id;
                toast.success(
                  `Added ${sale.customerName} to your customers list`,
                );
              }
            } catch (error) {
              console.error("Error adding customer:", error);
            }
          }
        }

        if (customerId && sale.id) {
          try {
            await updateSaleCustomerAction(sale.id, customerId, currentBusiness?.id || "");
          } catch (error) {
            console.error("Error associating sale with customer:", error);
          }
        }
      }

      // NOTE: Inventory updates are now handled atomically on the server
      // inside upsertSaleAction and createReceiptAction.
      // The client no longer manages inventory deductions or rollbacks.

      // Calculate total amount from items for accurate logging
      const itemsTotal = sale.items.reduce((sum, item) => {
        const itemTotal = item.price * item.quantity;
        const discountAmount =
          item.discountType === "amount"
            ? item.discountAmount || 0
            : (itemTotal * (item.discountPercentage || 0)) / 100;
        return sum + (itemTotal - discountAmount);
      }, 0);

      const taxAmount = sale.taxRate ? (itemsTotal * sale.taxRate) / 100 : 0;
      const grandTotal = itemsTotal + taxAmount;

      // Attempt to load the explicitly validated visual preview
      let finalReceiptSale = sale;
      try {
        const storedPreview = sessionStorage.getItem("last_completed_preview_sale");
        if (storedPreview) {
          finalReceiptSale = JSON.parse(storedPreview);
        }
      } catch (e) {
        console.error("Failed to retrieve isolated session preview:", e);
      }

      // Log activity with comprehensive details
      await logActivity({
        activityType: editSale ? "UPDATE" : "CREATE",
        module: "SALES",
        entityType: "sale",
        entityId: sale.id, // the backend ID is valid
        entityName: `Sale #${finalReceiptSale.receiptNumber}`,
        description: `${editSale ? "Updated" : "Created"} sale for ${
          finalReceiptSale.customerName
        } - Total: UGX ${grandTotal.toLocaleString()}`,
        metadata: {
          receiptNumber: finalReceiptSale.receiptNumber,
          customerName: finalReceiptSale.customerName,
          customerAddress: finalReceiptSale.customerAddress,
          customerContact: finalReceiptSale.customerContact,
          totalAmount: grandTotal,
          amountPaid: sale.amountPaid,
          profit: sale.profit,
          paymentStatus: sale.paymentStatus,
          taxRate: sale.taxRate,
          itemCount: sale.items.length,
          items: sale.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            price: item.price,
            cost: item.cost,
            total: item.quantity * item.price,
            discountPercentage: item.discountPercentage,
            discountAmount: item.discountAmount,
          })),
          notes: sale.notes,
        },
      });

      uiToast({
        title: editSale ? "Sale Updated" : "Sale Created",
        description: `${editSale ? "Updated" : "Created"} sale for ${
          finalReceiptSale.customerName
        }. ${
          finalReceiptSale.paymentStatus === "NOT PAID"
            ? "Inventory has been updated for this credit sale."
            : ""
        }`,
      });

      // Clear sold items cache to force refresh
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith("soldItems_")) {
          localStorage.removeItem(key);
        }
      });

      // Store the completed sale
      setCompletedSale(sale);

      // ⚡️ INSTANT UPDATE: Add/update sale in cache immediately (like your campaign example)
      if (editSale) {
        updateSale(sale);
      } else {
        addSale(sale);
      }

      // Store payment info preference
      setIncludePaymentInfo(includePaymentInfo);

      // Show receipt dialog if requested
      if (showReceipt) {
        setIsReceiptOpen(true);

        // If thermal auto-print is enabled, trigger it
        if (thermalPrintAfterSave) {
          try {
            const thermalData = await generateThermalReceipt(finalReceiptSale, settings);
            await print(thermalData, settings.defaultPrinterName);
          } catch (printErr) {
            console.error("Auto-print failed:", printErr);
            toast.error("Automated thermal printing failed");
          }
        }
      } else {
        // If it's a new sale and we have a success callback, use it (to clear form)
        // Otherwise navigate to sales list
        if (!editSale && onSaveSuccess) {
          onSaveSuccess();
        } else {
          router.push("/agency/sales");
        }
      }
    },
    [
      user?.id,
      createCustomer,
      editSale,
      uiToast,
      router,
      logActivity,
      addSale,
      updateSale,
      onSaveSuccess,
      currentBusiness,
      settings,
    ],
  );

  const handleReceiptClose = useCallback(() => {
    const isPreview = completedSale?.id === "preview";
    setIsReceiptOpen(false);

    // If it was just a preview, don't reset the form or navigate
    if (isPreview) {
      setCompletedSale(null);
      return;
    }

    // If it's a new sale and we have a success callback, use it (to clear form)
    // Otherwise navigate to sales list
    if (!editSale && onSaveSuccess) {
      onSaveSuccess();
    } else {
      router.push("/agency/sales");
    }
  }, [router, editSale, onSaveSuccess, completedSale]);

  const handleAddCustomer = useCallback(
    async (customerData: Omit<Customer, "id" | "createdAt" | "updatedAt">) => {
      if (!user?.id) return false;
      try {
        const newCustomer = await createCustomer(customerData);
        if (newCustomer) {
          setNewCustomerDialogOpen(false);
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error adding customer:", error);
        return false;
      }
    },
    [user?.id, createCustomer],
  );

  const handleOpenNewCustomerDialog = useCallback(() => {
    setNewCustomerDialogOpen(true);
  }, []);

  const handlePreviewReceipt = useCallback((sale: Sale) => {
    setCompletedSale(sale);
    setIsReceiptOpen(true);
  }, []);

  return {
    isReceiptOpen,
    completedSale,
    newCustomerDialogOpen,
    includePaymentInfo,
    customers,
    handleSaleComplete,
    handleReceiptClose,
    handleAddCustomer,
    handleOpenNewCustomerDialog,
    setNewCustomerDialogOpen,
    handlePreviewReceipt,
    setCompletedSale,
    setIsReceiptOpen
  };
};
