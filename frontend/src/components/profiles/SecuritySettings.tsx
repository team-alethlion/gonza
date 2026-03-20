"use client";
import React, { useState } from 'react';
import { useProfiles } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Check, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export const SecuritySettings: React.FC = () => {
    const { currentProfile, changePin } = useProfiles();
    const [formData, setFormData] = useState({
        oldPin: '',
        newPin: '',
        confirmPin: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!currentProfile) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.newPin !== formData.confirmPin) {
            toast.error('New PINs do not match');
            return;
        }

        if (formData.newPin.length !== 4 || !/^\d+$/.test(formData.newPin)) {
            toast.error('PIN must be exactly 4 digits');
            return;
        }

        setIsSubmitting(true);
        try {
            const success = await changePin(formData.oldPin, formData.newPin);
            if (success) {
                setFormData({ oldPin: '', newPin: '', confirmPin: '' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-md mx-auto space-y-6">
            <Card className="border-primary/20 shadow-sm">
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                        <Lock className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Change Your PIN</CardTitle>
                    <CardDescription>
                        Profiles default to <span className="font-mono font-bold text-foreground">0000</span>. We recommend changing it for security.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                        <div className="space-y-2">
                            <Label htmlFor="oldPin">Current PIN</Label>
                            <Input
                                id="oldPin"
                                type="password"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={4}
                                value={formData.oldPin}
                                onChange={(e) => setFormData({ ...formData, oldPin: e.target.value })}
                                placeholder="0000"
                                required
                                autoComplete="off"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newPin">New 4-Digit PIN</Label>
                            <Input
                                id="newPin"
                                type="password"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={4}
                                value={formData.newPin}
                                onChange={(e) => setFormData({ ...formData, newPin: e.target.value })}
                                placeholder="Enter new PIN"
                                required
                                autoComplete="new-password"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPin">Confirm New PIN</Label>
                            <Input
                                id="confirmPin"
                                type="password"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={4}
                                value={formData.confirmPin}
                                onChange={(e) => setFormData({ ...formData, confirmPin: e.target.value })}
                                placeholder="Confirm new PIN"
                                required
                                autoComplete="new-password"
                            />
                        </div>
                        <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                            {isSubmitting ? 'Updating...' : (
                                <>
                                    <ShieldCheck className="h-4 w-4" />
                                    Update PIN
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card className="border-muted bg-muted/20">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" /> Security Tip
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-xs text-muted-foreground">
                        Avoid simple patterns like 1234 or your birth year. Your PIN is required whenever you switch to this profile.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};
