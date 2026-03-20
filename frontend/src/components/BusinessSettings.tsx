"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from './auth/AuthProvider';
import BusinessProfileForm from '@/components/settings/BusinessProfileForm';
import PaymentMethodsManager from '@/components/settings/PaymentMethodsManager';
import SignatureManager from '@/components/settings/SignatureManager';
import PrivacySettings from '@/components/settings/PrivacySettings';
import { useBusinessSettingsForm } from '@/hooks/useBusinessSettingsForm';
import PrinterBridgeSettings from '@/components/settings/PrinterBridgeSettings';


const BusinessSettings = () => {
  const { user } = useAuth();
  const {
    localSettings,
    paymentMethods,
    loading,
    settingsLoading,
    handleBusinessChange,
    handleLogoChange,
    handleSignatureChange,
    handleSignaturePadSave,
    handleRemoveSignature,
    handlePaymentMethodChange,
    addPaymentMethod,
    removePaymentMethod,
    saveBusinessSettings,
  } = useBusinessSettingsForm();

  if (!user) {
    return <div className="text-center py-8">Please log in to access settings</div>;
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {settingsLoading ? (
        <Card>
          <CardContent className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <>
          <BusinessProfileForm
            settings={localSettings}
            onSettingsChange={handleBusinessChange}
            onLogoChange={handleLogoChange}
          />

          <SignatureManager
            signature={localSettings.signature}
            onSignatureChange={handleSignatureChange}
            onSignaturePadSave={handleSignaturePadSave}
            onRemoveSignature={handleRemoveSignature}
          />

          <PaymentMethodsManager
            paymentMethods={paymentMethods}
            onPaymentMethodChange={handlePaymentMethodChange}
            onAddPaymentMethod={addPaymentMethod}
            onRemovePaymentMethod={removePaymentMethod}
          />

          <PrinterBridgeSettings />

          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Account Email Address</Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  readOnly
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <Button
                onClick={saveBusinessSettings}
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Business Settings'
                )}
              </Button>
            </CardContent>
          </Card>

          <PrivacySettings onRequestDataDeletion={() => {
            const subject = encodeURIComponent(`Data Deletion Request - ${user?.email}`);
            const body = encodeURIComponent(
              `Hello,\n\nI would like to request deletion of all my data associated with the account ${user?.email}.\n\nThank you.`
            );
            const mailtoUrl = `mailto:gonzabrands@gmail.com?subject=${subject}&body=${body}`;
            window.location.href = mailtoUrl;
            toast.success('Email client opened for data deletion request');
          }} />
        </>
      )}
    </div>
  );
};

export default BusinessSettings;
