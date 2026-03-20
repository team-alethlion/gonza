"use client";

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Expense } from '@/hooks/useExpenses';

interface DeleteExpenseDialogProps {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  formatCurrency: (amount: number) => string;
}

const DeleteExpenseDialog: React.FC<DeleteExpenseDialogProps> = ({
  expense,
  open,
  onOpenChange,
  onConfirm,
  formatCurrency
}) => {
  if (!expense) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Expense</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <div>Are you sure you want to delete this expense?</div>
            <div className="p-3 bg-muted rounded-md">
              <div className="font-medium">{expense.description}</div>
              <div className="text-sm text-muted-foreground">
                {formatCurrency(expense.amount)} • {expense.date.toLocaleDateString()}
              </div>
            </div>
            <div className="text-sm text-destructive">
              This action cannot be undone.
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">
            Delete Expense
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteExpenseDialog;
