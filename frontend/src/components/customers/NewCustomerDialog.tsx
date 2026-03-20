"use client";

import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Customer } from '@/types';
import CustomerForm from './CustomerForm';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NewCustomerDialogProps {
  open: boolean;
  onClose: () => void;
  onAddCustomer: (data: any) => Promise<boolean> | void;
  initialData?: Customer;
}

const NewCustomerDialog: React.FC<NewCustomerDialogProps> = ({ 
  open, 
  onClose, 
  onAddCustomer, 
  initialData 
}) => {
  const handleSubmit = async (data: any): Promise<boolean> => {
    const result = await onAddCustomer(data);
    return result !== false;
  };

  const isEditing = !!initialData;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
          <DialogDescription>
            Fill in the customer details below. Only name is required.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[calc(80vh-8rem)]">
          <div className="px-1">
            <CustomerForm 
              onSubmit={handleSubmit}
              onCancel={onClose}
              initialData={initialData}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default NewCustomerDialog;
