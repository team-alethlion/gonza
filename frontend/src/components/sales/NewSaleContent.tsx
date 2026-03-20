import React from 'react';
import SalesForm from '@/components/SalesForm';
import ReceiptDialog from '@/components/sales/ReceiptDialog';
import NewCustomerDialog from '@/components/customers/NewCustomerDialog';
import DraftNotification from '@/components/sales/DraftNotification';
import { Sale } from '@/types';

interface NewSaleContentProps {
  editSale?: Sale;
  currency: string;
  showDraftNotification: boolean;
  draftData: any;
  onLoadDraft: () => void;
  onDismissDraft: () => void;
  onSaleComplete: (sale: Sale, showReceipt?: boolean, includePaymentInfo?: boolean, selectedCategoryId?: string, onClearDraft?: () => void, saleDate?: Date, thermalPrintAfterSave?: boolean) => void;
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
}

const NewSaleContent: React.FC<NewSaleContentProps> = ({
  editSale,
  currency,
  showDraftNotification,
  draftData,
  onLoadDraft,
  onDismissDraft,
  onSaleComplete,
  onClearDraft,
  customers,
  onAddNewCustomer,
  isReceiptOpen,
  completedSale,
  includePaymentInfo,
  onReceiptClose,
  newCustomerDialogOpen,
  onCloseNewCustomerDialog,
  onAddCustomer
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
        currency={currency}
        customers={customers}
        onAddNewCustomer={onAddNewCustomer}
        draftData={draftData}
        onClearDraft={onClearDraft}
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