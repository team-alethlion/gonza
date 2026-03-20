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
import { CashAccount } from '@/types/cash';

interface DeleteCashAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: CashAccount | null;
  transactionCount?: number;
  details?: string;
  onConfirm: (deleteTransactions: boolean) => void;
}

const DeleteCashAccountDialog: React.FC<DeleteCashAccountDialogProps> = ({
  open,
  onOpenChange,
  account,
  transactionCount = 0,
  details,
  onConfirm
}) => {
  if (!account) return null;

  const hasTransactions = transactionCount > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Cash Account</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Are you sure you want to delete the cash account "{account.name}"?
            </span>
            {hasTransactions && (
              <span className="block text-amber-600 font-medium">
                This account has {details || `${transactionCount} linked records`}.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className={hasTransactions ? "flex-col gap-2 sm:flex-col" : ""}>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {hasTransactions ? (
            <>
              <AlertDialogAction
                onClick={() => onConfirm(false)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Delete Account Only (Unlink Records)
              </AlertDialogAction>
              <AlertDialogAction
                onClick={() => onConfirm(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Account & All Records
              </AlertDialogAction>
            </>
          ) : (
            <AlertDialogAction
              onClick={() => onConfirm(false)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Account
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteCashAccountDialog;
