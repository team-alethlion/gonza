
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { setBusinessPasswordAction, verifyBusinessPasswordAction, removeBusinessPasswordAction } from '@/app/actions/business';

export const useBusinessPassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const VERIFIED_BUSINESSES_KEY = 'verified_businesses';

  const getVerifiedBusinesses = (): Set<string> => {
    try {
      const stored = sessionStorage.getItem(VERIFIED_BUSINESSES_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  };

  const setBusinessVerified = (businessId: string) => {
    try {
      const verified = getVerifiedBusinesses();
      verified.add(businessId);
      sessionStorage.setItem(VERIFIED_BUSINESSES_KEY, JSON.stringify(Array.from(verified)));
    } catch (error) {
      console.error('Error storing verified business:', error);
    }
  };

  const isBusinessVerified = (businessId: string): boolean => {
    return getVerifiedBusinesses().has(businessId);
  };

  const clearVerifiedBusinesses = () => {
    try {
      sessionStorage.removeItem(VERIFIED_BUSINESSES_KEY);
    } catch (error) {
      console.error('Error clearing verified businesses:', error);
    }
  };

  const setBusinessPassword = async (businessId: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await setBusinessPasswordAction(businessId, password);
      if (result.success) {
        toast({ title: 'Password Set Successfully', description: 'Your business is now password protected.' });
        return true;
      } else {
        toast({ title: 'Failed to Set Password', description: result.error || 'Please try again later.', variant: 'destructive' });
        return false;
      }
    } catch (error) {
      console.error('Error setting business password:', error);
      toast({ title: 'Failed to Set Password', description: 'An unexpected error occurred.', variant: 'destructive' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyBusinessPassword = async (businessId: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await verifyBusinessPasswordAction(businessId, password);
      if (result.success && result.verified) {
        setBusinessVerified(businessId);
        return true;
      } else {
        toast({ title: 'Incorrect Password', description: 'The password you entered is incorrect.', variant: 'destructive' });
        return false;
      }
    } catch (error) {
      console.error('Error verifying business password:', error);
      toast({ title: 'Verification Error', description: 'An unexpected error occurred.', variant: 'destructive' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const removeBusinessPassword = async (businessId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await removeBusinessPasswordAction(businessId);
      if (result.success) {
        const verified = getVerifiedBusinesses();
        verified.delete(businessId);
        sessionStorage.setItem(VERIFIED_BUSINESSES_KEY, JSON.stringify(Array.from(verified)));
        return true;
      } else {
        toast({ title: 'Failed to Remove Password', description: result.error || 'Please try again later.', variant: 'destructive' });
        return false;
      }
    } catch (error) {
      console.error('Error removing business password:', error);
      toast({ title: 'Failed to Remove Password', description: 'Please try again later.', variant: 'destructive' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    setBusinessPassword,
    verifyBusinessPassword,
    removeBusinessPassword,
    isBusinessVerified,
    setBusinessVerified,
    clearVerifiedBusinesses,
  };
};