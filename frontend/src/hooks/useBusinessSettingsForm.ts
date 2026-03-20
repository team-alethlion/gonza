import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  useBusinessSettings,
  parsePaymentInfo,
  convertPaymentMethodsToString
} from '@/hooks/useBusinessSettings';

interface PaymentMethod {
  method: string;
  accountNumber: string;
  accountName: string;
}

export const useBusinessSettingsForm = () => {
  const { settings, isLoading: settingsLoading, updateSettings } = useBusinessSettings();
  const [loading, setLoading] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentMethodsInitialized, setPaymentMethodsInitialized] = useState(false);

  // Update local settings when hook settings change
  useEffect(() => {
    setLocalSettings(settings);
    setPaymentMethodsInitialized(false);
  }, [settings]);

  // Parse payment methods from the payment info text
  useEffect(() => {
    if (!paymentMethodsInitialized) {
      if (localSettings.paymentInfo) {
        const parsedMethods = parsePaymentInfo(localSettings.paymentInfo);
        setPaymentMethods(parsedMethods);
      } else {
        setPaymentMethods([]);
      }
      setPaymentMethodsInitialized(true);
    }
  }, [localSettings.paymentInfo, paymentMethodsInitialized]);

  const handleBusinessChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: { name: string; value: any } }) => {
    const { name, value } = e.target;
    setLocalSettings(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalSettings(prev => ({ ...prev, businessLogo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleSignatureChange = useCallback((signature: string) => {
    setLocalSettings(prev => ({ ...prev, signature }));
  }, []);

  const handleSignaturePadSave = useCallback(async (signatureDataUrl: string) => {
    try {
      const updatedSettings = { ...localSettings, signature: signatureDataUrl };
      setLocalSettings(updatedSettings);
      const success = await updateSettings(updatedSettings);
      
      if (success) {
        toast.success('Business settings and signature saved successfully');
      } else {
        setLocalSettings(prev => ({ ...prev, signature: settings.signature }));
        toast.error('Failed to save signature');
      }
    } catch (error) {
      console.error('Error saving signature:', error);
      setLocalSettings(prev => ({ ...prev, signature: settings.signature }));
      toast.error('Failed to save signature');
    }
  }, [updateSettings, settings.signature, localSettings]);

  const handleRemoveSignature = useCallback(async () => {
    try {
      setLocalSettings(prev => ({ ...prev, signature: undefined }));
      const success = await updateSettings({ signature: undefined });
      
      if (success) {
        toast.success('Business signature removed successfully');
      } else {
        setLocalSettings(prev => ({ ...prev, signature: settings.signature }));
        toast.error('Failed to remove signature');
      }
    } catch (error) {
      console.error('Error removing signature:', error);
      setLocalSettings(prev => ({ ...prev, signature: settings.signature }));
      toast.error('Failed to remove signature');
    }
  }, [updateSettings, settings.signature]);

  const handlePaymentMethodChange = useCallback((index: number, field: 'method' | 'accountNumber' | 'accountName', value: string) => {
    const updatedPaymentMethods = [...paymentMethods];
    updatedPaymentMethods[index] = {
      ...updatedPaymentMethods[index],
      [field]: value
    };
    setPaymentMethods(updatedPaymentMethods);
    
    const newPaymentInfoStr = convertPaymentMethodsToString(updatedPaymentMethods);
    setLocalSettings(prev => ({ ...prev, paymentInfo: newPaymentInfoStr }));
  }, [paymentMethods]);

  const addPaymentMethod = useCallback(() => {
    const newPaymentMethods = [...paymentMethods, { method: '', accountNumber: '', accountName: '' }];
    setPaymentMethods(newPaymentMethods);
    
    const newPaymentInfoStr = convertPaymentMethodsToString(newPaymentMethods);
    setLocalSettings(prev => ({ ...prev, paymentInfo: newPaymentInfoStr }));
  }, [paymentMethods]);

  const removePaymentMethod = useCallback((index: number) => {
    const updatedPaymentMethods = [...paymentMethods];
    updatedPaymentMethods.splice(index, 1);
    setPaymentMethods(updatedPaymentMethods);
    
    const newPaymentInfoStr = convertPaymentMethodsToString(updatedPaymentMethods);
    setLocalSettings(prev => ({ ...prev, paymentInfo: newPaymentInfoStr }));
  }, [paymentMethods]);

  const saveBusinessSettings = useCallback(async () => {
    setLoading(true);
    try {
      const success = await updateSettings(localSettings);
      if (success) {
        toast.success('Business settings saved successfully!');
      }
    } catch (error) {
      console.error('Error saving business settings:', error);
      toast.error('Failed to save business settings');
    } finally {
      setLoading(false);
    }
  }, [localSettings, updateSettings]);

  return {
    // State
    localSettings,
    paymentMethods,
    loading,
    settingsLoading,

    // Handlers
    handleBusinessChange,
    handleLogoChange,
    handleSignatureChange,
    handleSignaturePadSave,
    handleRemoveSignature,
    handlePaymentMethodChange,
    addPaymentMethod,
    removePaymentMethod,
    saveBusinessSettings,
  };
};