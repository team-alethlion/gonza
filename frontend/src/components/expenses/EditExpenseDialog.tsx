"use client";

import React from 'react';
import { Expense } from '@/hooks/useExpenses';
import ExpenseForm from './ExpenseForm';

interface EditExpenseDialogProps {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
}

const EditExpenseDialog: React.FC<EditExpenseDialogProps> = ({
  expense,
  open,
  onOpenChange,
  onSubmit
}) => {
  if (!expense) return null;

  const initialData = {
    amount: expense.amount,
    description: expense.description,
    category: expense.category || '',
    date: expense.date,
    paymentMethod: expense.paymentMethod || '',
    personInCharge: expense.personInCharge || '',
    receiptImage: expense.receiptImage || '',
    linkToCash: !!expense.cashAccountId,
    cashAccountId: expense.cashAccountId || ''
  };

  const handleSubmit = async (data: any) => {
    console.log('EditExpenseDialog handleSubmit data:', data);
    
    // Pass the complete form data including both linkToCash and cashAccountId
    await onSubmit(data);
  };

  return (
    <ExpenseForm
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={handleSubmit}
      initialData={initialData}
      title="Edit Expense"
    />
  );
};

export default EditExpenseDialog;
