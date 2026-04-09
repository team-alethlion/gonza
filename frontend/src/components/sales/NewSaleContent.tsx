/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import SalesForm from "@/components/SalesForm";
import ReceiptDialog from "@/components/sales/ReceiptDialog";
import NewCustomerDialog from "@/components/customers/NewCustomerDialog";
import DraftNotification from "@/components/sales/DraftNotification";
import { Sale } from "@/types";

interface NewSaleContentProps {
  editSale?: Sale;
  currency: string;
  showDraftNotification: boolean;
  draftData: any;
  onLoadDraft: () => void;
  onDismissDraft: () => void;
  onSaleComplete: (
    sale: Sale,
    showReceipt?: boolean,
    includePaymentInfo?: boolean,
    selectedCategoryId?: string,
    onClearDraft?: () => void,
    saleDate?: Date,
    thermalPrintAfterSave?: boolean,
  ) => void;
  onPreviewReceipt: (sale: Sale) => void;
  onClearDraft: () => void;
  customers: any[];
  onAddNewCustomer: () => void;
  isReceiptOpen: boolean;
  completedSale: Sale | null;
  includePaymentInfo: boolean;
  onReceiptClose: () => void;
  newCustomerDialogOpen: boolean;
  onCloseNewCustomerDialog: () => void;
  onAddCustomer: (customerData: any) => Promise<boolean>;
  initialAccounts?: any[];
  initialCustomerCategories?: any[];
  initialCategories?: any[];
  initialMessages?: any[];
  initialTemplates?: any[];
  initialStockHistory?: any[];
  initialTransactions?: any[];
}

const NewSaleContent: React.FC<NewSaleContentProps> = ({
  editSale,
  currency,
  showDraftNotification,
  draftData,
  onLoadDraft,
  onDismissDraft,
  onSaleComplete,
  onPreviewReceipt,
  onClearDraft,
  customers,
  onAddNewCustomer,
  isReceiptOpen,
  completedSale,
  includePaymentInfo,
  onReceiptClose,
  newCustomerDialogOpen,
  onCloseNewCustomerDialog,
  onAddCustomer,
  initialAccounts = [],
  initialCustomerCategories = [],
  initialCategories = [],
  initialMessages = [],
  initialTemplates = [],
  initialStockHistory = [],
  initialTransactions = [],
}) => {
  return (
    <>
      {showDraftNotification && draftData && (
        <DraftNotification
          onLoadDraft={onLoadDraft}
          onDismiss={onDismissDraft}
          savedAt={draftData.savedAt}
        />
      )}

      <SalesForm
        initialData={editSale}
        onSaleComplete={onSaleComplete}
        onPreviewReceipt={onPreviewReceipt}
        currency={currency}
        customers={customers}
        onAddNewCustomer={onAddNewCustomer}
        draftData={draftData}
        onClearDraft={onClearDraft}
        isReceiptOpen={isReceiptOpen}
        initialAccounts={initialAccounts}
        initialCustomerCategories={initialCustomerCategories}
        initialCategories={initialCategories}
        initialMessages={initialMessages}
        initialTemplates={initialTemplates}
        initialStockHistory={initialStockHistory}
        initialTransactions={initialTransactions}
      />

      <ReceiptDialog
        isOpen={isReceiptOpen}
        sale={completedSale}
        currency={currency}
        onOpenChange={onReceiptClose}
        includePaymentInfo={includePaymentInfo}
      />

      <NewCustomerDialog
        open={newCustomerDialogOpen}
        onClose={onCloseNewCustomerDialog}
        onAddCustomer={onAddCustomer}
      />
    </>
  );
};

export default NewSaleContent;
