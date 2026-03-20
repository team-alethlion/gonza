"use client";
import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TopUpCreditsDialogProps {
  open: boolean;
  onClose: () => void;
  onTopUp: (credits: number, phoneNumber: string) => Promise<boolean>;
}

const TopUpCreditsDialog = ({ open, onClose, onTopUp }: TopUpCreditsDialogProps) => {
  const [credits, setCredits] = useState<number>(10);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const creditCost = Number(process.env.NEXT_PUBLIC_SMS_CREDIT_COST || 100);
  const totalCost = credits * creditCost;

  // Debug: Dialog opened / closed
  useEffect(() => {
    console.log('[TopUpCreditsDialog] Dialog open state:', open);
    if (open) {
      console.log('[TopUpCreditsDialog] Dialog opened — resetting form');
      setCredits(10);
      setPhoneNumber('');
      setIsProcessing(false);
    }
  }, [open]);

  // Debug: Form state changes
  useEffect(() => {
    console.log('[TopUpCreditsDialog] Current state → Credits:', credits, '| Phone:', phoneNumber, '| Total Cost: UGX', totalCost.toLocaleString());
  }, [credits, phoneNumber, totalCost]);

  const handleTopUp = async () => {
    console.log('[TopUpCreditsDialog] Top-up requested!');
    console.log('   → Credits:', credits);
    console.log('   → Phone Number:', phoneNumber);
    console.log('   → Total Cost: UGX', totalCost.toLocaleString());

    if (!phoneNumber || credits < 1) {
      console.warn('[TopUpCreditsDialog] Invalid input — blocking submit');
      return;
    }

    setIsProcessing(true);
    console.log('[TopUpCreditsDialog] Calling onTopUp...');

    try {
      const success = await onTopUp(credits, phoneNumber);
      console.log('[TopUpCreditsDialog] onTopUp result:', success ? 'SUCCESS' : 'FAILED');

      if (success) {
        console.log('[TopUpCreditsDialog] Payment successful → closing dialog');
        onClose();
      } else {
        console.error('[TopUpCreditsDialog] Payment failed (returned false)');
      }
    } catch (err) {
      console.error('[TopUpCreditsDialog] onTopUp threw an error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const quickAmounts = [10, 25, 50, 100];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Top Up SMS Credits
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Credit Amount Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Number of Credits *
            </label>
            <Input
              type="number"
              min="1"
              value={credits}
              onChange={(e) => {
                const val = Math.max(1, parseInt(e.target.value) || 1);
                console.log('[TopUpCreditsDialog] Credits input changed →', val);
                setCredits(val);
              }}
              className="text-lg font-semibold"
            />

            {/* Quick Amount Buttons */}
            <div className="mt-3 flex flex-wrap gap-2">
              {quickAmounts.map(amount => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => {
                    console.log('[TopUpCreditsDialog] Quick amount clicked →', amount, 'credits');
                    setCredits(amount);
                  }}
                  className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                    credits === amount
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {amount} credits
                </button>
              ))}
            </div>
          </div>

          {/* Cost Display */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Credit Cost:</span>
              <span className="text-sm font-medium">UGX {creditCost} per credit</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Quantity:</span>
              <span className="text-sm font-medium">{credits} credits</span>
            </div>
            <div className="border-t border-blue-300 pt-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-gray-900">Total Amount:</span>
                <span className="text-xl font-bold text-blue-600">
                  UGX {totalCost.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Phone Number for Payment */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Mobile Money Phone Number *
            </label>
            <Input
              type="tel"
              placeholder="+256700000000"
              value={phoneNumber}
              onChange={(e) => {
                console.log('[TopUpCreditsDialog] Phone number changed →', e.target.value);
                setPhoneNumber(e.target.value);
              }}
            />
            <p className="text-xs text-gray-500 mt-1">
              You will receive a payment prompt on this number
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              onClick={handleTopUp}
              disabled={!phoneNumber || credits < 1 || isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              {isProcessing ? 'Processing...' : `Pay UGX ${totalCost.toLocaleString()}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TopUpCreditsDialog;