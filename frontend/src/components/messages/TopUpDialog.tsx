
"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreditCard, Zap, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { initiateCreditPurchaseAction } from '@/app/actions/messaging';
import { useAuth } from '@/components/auth/AuthProvider';
import { useBusiness } from '@/contexts/BusinessContext';
import { toast } from 'sonner';

interface TopUpDialogProps {
  open: boolean;
  onClose: () => void;
  currency?: string;
}

const PACKAGES = [
  { credits: 500, price: 50000, label: "Starter", icon: Zap, color: "text-blue-600", bg: "bg-blue-50" },
  { credits: 2000, price: 180000, label: "Business", icon: ShieldCheck, color: "text-purple-600", bg: "bg-purple-50", recommended: true },
  { credits: 5000, price: 400000, label: "Enterprise", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
];

const TopUpDialog: React.FC<TopUpDialogProps> = ({ open, onClose, currency = "UGX" }) => {
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();
  const [selectedPkg, setSelectedPkg] = useState(PACKAGES[1]);
  const [isRedirecting, setIsSending] = useState(false);

  const handlePurchase = async () => {
    if (!user || !currentBusiness?.id) return;
    setIsSending(true);
    
    try {
      const reference = `TOPUP-${Date.now()}-${user.id.substring(0, 5)}`;
      const result = await initiateCreditPurchaseAction({
        amount: selectedPkg.price,
        credits_amount: selectedPkg.credits,
        description: `Purchase of ${selectedPkg.credits} SMS Credits`,
        reference: reference,
        locationId: currentBusiness.id
      });

      if (result.success && result.redirectUrl) {
        toast.info("Redirecting to Pesapal securely...");
        window.location.href = result.redirectUrl;
      } else {
        throw new Error(result.error || "Failed to get payment URL");
      }
    } catch (error: any) {
      toast.error(error.message);
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" />
            Top Up SMS Credits
          </DialogTitle>
          <DialogDescription>
            Choose a package to add credits to your account. Credits never expire.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6">
          {PACKAGES.map((pkg) => (
            <div 
              key={pkg.credits}
              onClick={() => setSelectedPkg(pkg)}
              className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all hover:shadow-md ${
                selectedPkg.credits === pkg.credits 
                  ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                  : 'border-gray-100 bg-white hover:border-gray-200'
              }`}
            >
              {pkg.recommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shadow-sm">
                  Best Value
                </span>
              )}
              <div className="flex flex-col items-center text-center space-y-2">
                <div className={`p-2 rounded-full ${pkg.bg}`}>
                  <pkg.icon className={`w-5 h-5 ${pkg.color}`} />
                </div>
                <div className="space-y-0.5">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-tight">{pkg.label}</p>
                    <p className="text-xl font-bold text-gray-900">{pkg.credits}</p>
                    <p className="text-[10px] text-muted-foreground">Credits</p>
                </div>
                <div className="pt-2 border-t w-full border-gray-100">
                    <p className="text-sm font-bold text-primary">
                        {currency} {pkg.price.toLocaleString()}
                    </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-muted-foreground">Selected Package:</span>
                <span className="text-sm font-bold">{selectedPkg.label} ({selectedPkg.credits} Credits)</span>
            </div>
            <div className="flex justify-between items-center text-lg font-bold border-t border-slate-200/50 pt-2 mt-2">
                <span>Total Due:</span>
                <span className="text-primary">{currency} {selectedPkg.price.toLocaleString()}</span>
            </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" type="button" onClick={onClose} disabled={isRedirecting}>Cancel</Button>
          <Button 
            onClick={handlePurchase} 
            disabled={isRedirecting}
            className="font-bold bg-primary hover:bg-primary/90"
          >
            {isRedirecting ? "Connecting..." : "Proceed to Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TopUpDialog;
