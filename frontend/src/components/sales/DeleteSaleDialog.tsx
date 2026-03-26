"use client";

import React, { useState, useEffect } from 'react';
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogCancel, 
  AlertDialogAction 
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface DeleteSaleDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
  isDeleting?: boolean;
}

const DeleteSaleDialog: React.FC<DeleteSaleDialogProps> = ({ 
  isOpen, 
  onOpenChange, 
  onConfirm,
  isDeleting = false
}) => {
  const [reason, setReason] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [userInputCode, setUserInputCode] = useState('');
  const [error, setError] = useState('');

  // Generate random 4-digit code when dialog opens
  useEffect(() => {
    if (isOpen) {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setVerificationCode(code);
      setReason('');
      setUserInputCode('');
      setError('');
    }
  }, [isOpen]);

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (userInputCode !== verificationCode) {
      setError('Invalid verification code');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for deletion');
      return;
    }

    await onConfirm(reason);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">Confirm Sale Deletion</AlertDialogTitle>
          <AlertDialogDescription>
            This will soft-delete the sale and restore inventory. To proceed, please enter the verification code and a reason.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Deletion</Label>
            <Textarea 
              id="reason"
              placeholder="e.g., Customer returned items, Error in entry..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isDeleting}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="verification">Verification Code</Label>
              <span className="text-lg font-bold tracking-widest bg-muted px-2 py-1 rounded select-none">
                {verificationCode}
              </span>
            </div>
            <Input 
              id="verification"
              placeholder="Enter the 4-digit code above"
              value={userInputCode}
              onChange={(e) => setUserInputCode(e.target.value)}
              disabled={isDeleting}
              maxLength={4}
            />
          </div>

          {error && <p className="text-xs font-medium text-destructive">{error}</p>}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm} 
            disabled={isDeleting || !reason.trim() || userInputCode.length !== 4}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Confirm Deletion"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteSaleDialog;
