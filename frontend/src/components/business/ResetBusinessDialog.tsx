"use client";

import React from 'react';
import { RotateCcw } from 'lucide-react';
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

interface ResetBusinessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  businessName: string;
}

export const ResetBusinessDialog: React.FC<ResetBusinessDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  businessName,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="mx-4 max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <RotateCcw className="h-5 w-5 text-amber-600" />
            </div>
            <AlertDialogTitle>Reset Business Location</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm space-y-2">
            <p className="font-medium text-gray-900">
              Are you sure you want to reset "{businessName}"?
            </p>
            <p>
              This will permanently delete ALL data for this business location including:
            </p>
            <ul className="list-disc list-inside text-xs space-y-1 ml-2">
              <li>All products and inventory</li>
              <li>All sales records and receipts</li>
              <li>All customers and their data</li>
              <li>All expenses and transactions</li>
              <li>All cash accounts and balances</li>
              <li>All tasks and categories</li>
              <li>All business settings</li>
            </ul>
            <p className="font-medium text-red-600 mt-2">
              This action cannot be undone!
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col-reverse md:flex-row gap-2">
          <AlertDialogCancel className="w-full md:w-auto">Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            className="w-full md:w-auto bg-amber-600 hover:bg-amber-700 text-white"
          >
            Reset Business
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
