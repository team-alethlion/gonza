"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProfiles } from '@/contexts/ProfileContext';
import { Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export const FirstTimePinSetup: React.FC = () => {
    const { currentProfile, changePin, isFirstTimeSetupNeeded, dismissFirstTimeSetup } = useProfiles();
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const newPinRef = useRef<HTMLInputElement>(null);
    const confirmPinRef = useRef<HTMLInputElement>(null);

    if (!isFirstTimeSetupNeeded || !currentProfile) {
        return null;
    }

    const handleSetPin = async () => {
        if (newPin !== confirmPin) {
            toast.error('PINs do not match');
            return;
        }

        if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
            toast.error('PIN must be exactly 4 digits');
            return;
        }

        if (newPin === '0000') {
            toast.error('Please choose a PIN other than the default 0000');
            return;
        }

        setIsSubmitting(true);
        try {
            const success = await changePin('0000', newPin);
            if (success) {
                dismissFirstTimeSetup();
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSkip = () => {
        dismissFirstTimeSetup();
        toast.warning('Remember to change your PIN from Settings → Profiles → Security');
    };

    const handleNewPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 4);
        setNewPin(value);

        // Auto-focus confirm field when new PIN is complete
        if (value.length === 4) {
            setTimeout(() => confirmPinRef.current?.focus(), 100);
        }
    };

    const handleConfirmPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 4);
        setConfirmPin(value);

        // Auto-submit when both fields are complete and match
        if (value.length === 4 && newPin.length === 4) {
            setTimeout(() => handleSetPin(), 100);
        }
    };

    return (
        <Dialog open={true} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <div className="flex justify-center mb-6">
                        <img
                            src="/lovable-uploads/798d07d7-1db7-498c-92f3-6f6346827d59.png"
                            alt="Gonza Logo"
                            className="h-12 animate-in fade-in slide-in-from-bottom-2 duration-700"
                        />
                    </div>
                    <div className="mx-auto w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-4 border border-amber-100">
                        <Lock className="h-6 w-6 text-amber-600" />
                    </div>
                    <DialogTitle className="text-center text-2xl">Secure Your Account</DialogTitle>
                    <DialogDescription className="text-center">
                        You're currently using the default PIN <span className="font-mono font-bold">0000</span>.
                        For security, we recommend setting a custom PIN now.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="new_pin_setup">New 4-Digit PIN</Label>
                        <Input
                            ref={newPinRef}
                            id="new_pin_setup"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={4}
                            value={newPin}
                            onChange={handleNewPinChange}
                            placeholder="Enter new PIN"
                            autoComplete="one-time-code"
                            style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm_pin_setup">Confirm PIN</Label>
                        <Input
                            ref={confirmPinRef}
                            id="confirm_pin_setup"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={4}
                            value={confirmPin}
                            onChange={handleConfirmPinChange}
                            placeholder="Confirm new PIN"
                            autoComplete="one-time-code"
                            style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <Button
                        className="w-full gap-2 bg-primary hover:bg-primary/90"
                        onClick={handleSetPin}
                        disabled={isSubmitting || newPin.length !== 4 || confirmPin.length !== 4}
                    >
                        <ShieldCheck className="h-4 w-4" />
                        {isSubmitting ? 'Setting PIN...' : 'Set Custom PIN'}
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full text-muted-foreground"
                        onClick={handleSkip}
                        disabled={isSubmitting}
                    >
                        Skip for now
                    </Button>
                </div>

                <p className="text-[10px] text-muted-foreground/60 text-center">
                    You can change your PIN anytime from Settings → Profiles → Security
                </p>
            </DialogContent>
        </Dialog>
    );
};
