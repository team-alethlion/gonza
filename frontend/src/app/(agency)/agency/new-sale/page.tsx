"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sale } from "@/types";
import { useAuth } from "@/components/auth/AuthProvider";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useBusiness } from "@/contexts/BusinessContext";
import { useNewSaleDraft } from "@/hooks/useNewSaleDraft";
import { useNewSaleActions } from "@/hooks/useNewSaleActions";
import NewSaleLoadingState from "@/components/sales/NewSaleLoadingState";
import NewSaleNoBusinessState from "@/components/sales/NewSaleNoBusinessState";
import NewSaleAuthWarning from "@/components/sales/NewSaleAuthWarning";
import NewSaleContent from "@/components/sales/NewSaleContent";
import { useProfiles } from "@/contexts/ProfileContext";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/LoadingSpinner";

const NewSale = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { settings } = useBusinessSettings();
  const { currentBusiness, isLoading: businessLoading } = useBusiness();
  const { hasPermission, isLoading: profilesLoading } = useProfiles();
  // In Next.js we don't have location.state, we only have ID via searchParams.
  // Realistically we also need to fetch the sale if editId is provided.
  // For now, this is a placeholder.
  const editId = searchParams.get("editId");
  const [editSale, setEditSale] = useState<Sale | undefined>(undefined);

  useEffect(() => {
    // If we have editId, we should fetch the sale from useSalesData or similar
    // and set it to editSale. This will be implemented separately.
  }, [editId]);

  // Use a key to force re-mounting of the form component to clear all state
  const [formKey, setFormKey] = useState(0);

  const handleResetForm = useCallback(() => {
    setFormKey((prev) => prev + 1);
  }, []);

  const {
    showDraftNotification,
    draftData,
    handleLoadDraft,
    handleDismissDraft,
    clearDraft,
  } = useNewSaleDraft(editSale);

  const {
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
  } = useNewSaleActions(editSale, handleResetForm);

  // Show loading while business context or profiles is loading
  if (businessLoading || profilesLoading) {
    return <NewSaleLoadingState />;
  }

  // Show message if no business is selected
  if (!currentBusiness) {
    return <NewSaleNoBusinessState />;
  }

  // Permission Check
  const canEdit = editSale ? hasPermission("sales", "edit") : true;
  const canCreate = !editSale ? hasPermission("sales", "create") : true;

  if (!canEdit || !canCreate) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to{" "}
            {editSale ? "edit this sale" : "create a new sale"}. Please contact
            your administrator if you believe this is an error.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => router.push("/sales")} variant="outline">
            Back to Sales
          </Button>
        </div>
      </div>
    );
  }

  const wrappedHandleSaleComplete = (
    sale: Sale,
    showReceipt?: boolean,
    includePaymentInfo?: boolean,
    selectedCategoryId?: string,
    onClearDraft?: () => void,
    saleDate?: Date,
    thermalPrintAfterSave?: boolean,
  ) => {
    return handleSaleComplete(
      sale,
      showReceipt,
      includePaymentInfo,
      selectedCategoryId,
      clearDraft || onClearDraft,
      saleDate,
      thermalPrintAfterSave,
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {!user && <NewSaleAuthWarning />}

      <NewSaleContent
        key={formKey}
        editSale={editSale}
        currency={settings.currency}
        showDraftNotification={showDraftNotification}
        draftData={draftData}
        onLoadDraft={handleLoadDraft}
        onDismissDraft={handleDismissDraft}
        onSaleComplete={wrappedHandleSaleComplete}
        onClearDraft={clearDraft}
        customers={customers || []}
        onAddNewCustomer={handleOpenNewCustomerDialog}
        isReceiptOpen={isReceiptOpen}
        completedSale={completedSale}
        includePaymentInfo={includePaymentInfo}
        onReceiptClose={handleReceiptClose}
        newCustomerDialogOpen={newCustomerDialogOpen}
        onCloseNewCustomerDialog={() => setNewCustomerDialogOpen(false)}
        onAddCustomer={handleAddCustomer}
      />
    </div>
  );
};

export default NewSale;
