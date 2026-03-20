"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useBusinessPassword } from '@/hooks/useBusinessPassword';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { getBusinessLocationsAction, createBusinessAction, updateBusinessAction, deleteBusinessAction, resetBusinessAction } from '@/app/actions/business';
import { getAccountStatusAction } from '@/app/actions/business-settings';
import { DbBusinessSettings, AnalyticsData } from '@/types';
import { updateUserBranchAction } from '@/app/actions/auth';

export interface BusinessLocation {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  switch_password_hash?: string;
}

export interface AccountStatus {
  is_frozen: boolean;
  location_limit: number;
  billing_amount: number;
  billing_duration: string;
  days_remaining: number;
  next_billing_date: string;
  package_id: string | null;
  subscription_status: string;
  is_trial: boolean;
}

interface BusinessContextType {
  currentBusiness: BusinessLocation | null;
  businessLocations: BusinessLocation[];
  switchBusiness: (businessId: string, onPasswordPrompt?: (businessId: string, businessName: string, onVerified: () => void) => void) => Promise<void>;
  loadBusinessLocations: () => Promise<void>;
  createBusiness: (name: string) => Promise<BusinessLocation | null>;
  updateBusiness: (id: string, name: string) => Promise<boolean>;
  deleteBusiness: (id: string) => Promise<boolean>;
  resetBusiness: (id: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
  locationLimit: number;
  initialBusinessSettings: DbBusinessSettings | null;
  initialAnalyticsSummary: AnalyticsData | null;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
};

export const BusinessProvider: React.FC<{ 
  children: React.ReactNode, 
  initialLocations?: BusinessLocation[],
  initialAccountStatus?: AccountStatus | null,
  initialBusinessSettings?: DbBusinessSettings | null,
  initialAnalyticsSummary?: AnalyticsData | null
}> = ({ 
  children, 
  initialLocations = [], 
  initialAccountStatus = null,
  initialBusinessSettings = null,
  initialAnalyticsSummary = null
}) => {
  console.log('[DEBUG] BusinessProvider: Initializing...');
  const { user, updateSession } = useAuth();
  
  // SUPER STRICT CLIENT CHECK: Prevent any background fetching if user status is invalid
  const isUnauthorized = React.useMemo(() => {
    if (!user) return false;
    if (user.role?.toLowerCase() === 'superadmin') return false;
    
    const subStatus = (user as any).subscriptionStatus;
    const subExpiry = (user as any).subscriptionExpiry;
    const trialEnd = (user as any).trialEndDate;
    const isOnboarded = (user as any).isOnboarded;

    const now = new Date();
    const isTrialActive = subStatus === 'trial' && trialEnd && new Date(trialEnd) > now;
    const isSubActive = subStatus === 'active' && subExpiry && new Date(subExpiry) > now;

    return (!isTrialActive && !isSubActive) || !isOnboarded;
  }, [user]);

  const [businessLocations, setBusinessLocations] = useState<BusinessLocation[]>(initialLocations);
  const hasLoadedInitial = useRef(initialLocations.length > 0);
  
  const [currentBusiness, setCurrentBusiness] = useState<BusinessLocation | null>(() => {
    // Priority 1: session branchId
    if (user?.branchId && initialLocations.length > 0) {
      const branch = initialLocations.find(b => b.id === user.branchId);
      if (branch) return branch;
    }
    
    // Priority 2: localStorage
    if (typeof window !== 'undefined') {
       const key = user ? `selected_business_${user.id}` : null;
       const saved = key ? localStorage.getItem(key) : null;
       if (saved && initialLocations.length > 0) {
         const branch = initialLocations.find(b => b.id === saved);
         if (branch) return branch;
       }
    }
    
    // Priority 3: Default/First location
    if (initialLocations.length > 0) {
      return initialLocations.find(b => b.is_default) || initialLocations[0];
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(initialLocations.length === 0 && !!user?.id);
  const [error, setError] = useState<string | null>(null);
  const { isBusinessVerified } = useBusinessPassword();

  // Fetch account status directly to avoid circular dependency with useOnboarding hook
  const { data: globalStatus } = useQuery({
    queryKey: ['globalAccountStatus', user?.id],
    queryFn: async () => {
      if (!user?.id || isUnauthorized) return null;
      console.log(`[PERF] globalAccountStatus fetch starting for user ${user.id}`);
      return await getAccountStatusAction(user.id);
    },
    enabled: !!user?.id && !isUnauthorized,
    staleTime: 60 * 1000, // Increase stale time from 10s to 60s
    initialData: initialAccountStatus
  });

  const locationLimit = globalStatus?.location_limit || 1;


  const getStorageKey = useCallback(() => user?.id ? `selected_business_${user.id}` : null, [user?.id]);

  const loadBusinessLocations = useCallback(async () => {
    if (!user?.id || isUnauthorized) {
      setIsLoading(false);
      return;
    }

    const startTime = Date.now();
    console.log(`[PERF] BusinessContext: loadBusinessLocations starting for user ${user.id}`);
    
    try {
      setIsLoading(true);
      setError(null);

      const data = await getBusinessLocationsAction(user.id);
      
      if (!data) {
        throw new Error('Failed to load locations');
      }

      setBusinessLocations(data || []);
      hasLoadedInitial.current = true;

      // If we don't have a current business, or the current business is not in the new data, update it
      if (data && data.length > 0) {
        const storageKey = getStorageKey();
        const savedBusinessId = storageKey ? localStorage.getItem(storageKey) : null;
        
        let businessToSet = (data as BusinessLocation[]).find((b: BusinessLocation) => b.id === user.branchId);
        
        if (!businessToSet && savedBusinessId) {
          businessToSet = (data as BusinessLocation[]).find((b: BusinessLocation) => b.id === savedBusinessId);
        }

        if (!businessToSet) {
          businessToSet = (data as BusinessLocation[]).find((b: BusinessLocation) => b.is_default) || data[0];
        }

        if (businessToSet) {
          setCurrentBusiness(prev => {
            if (!prev || prev.id !== businessToSet!.id) {
              if (storageKey) localStorage.setItem(storageKey, businessToSet!.id);
              return businessToSet!;
            }
            return prev;
          });
        }
      }
    } catch (error) {
      console.error('Error loading business locations:', error);
      setError('Failed to load business data');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, getStorageKey, user?.branchId, isUnauthorized]);

  useEffect(() => {
    if (user?.id && !isUnauthorized && !hasLoadedInitial.current) {
      loadBusinessLocations();
    }
  }, [user?.id, isUnauthorized, loadBusinessLocations]);

  const switchBusiness = React.useCallback(async (businessId: string, onPasswordPrompt?: (businessId: string, businessName: string, onVerified: () => void) => void) => {
    const business = businessLocations.find(b => b.id === businessId);
    if (!business) {
      console.error('Business not found:', businessId);
      return;
    }

    const performSwitch = async () => {
      setCurrentBusiness(business);
      const storageKey = getStorageKey();
      if (storageKey) {
        localStorage.setItem(storageKey, business.id);
      }
      
      // Update the user's current branch in the database
      if (user?.id) {
        try {
          await updateUserBranchAction(user.id, business.id);
          console.log('Successfully updated user current branch in database');
          
          // Also update the session so middleware and other parts are in sync
          await updateSession({ branchId: business.id });
          console.log('Successfully updated user session branchId');
        } catch (error) {
          console.error('Failed to update user current branch:', error);
        }
      }
    };

    // If business has password protection and is not verified in this session
    if (business.switch_password_hash && !isBusinessVerified(businessId)) {
      if (onPasswordPrompt) {
        onPasswordPrompt(businessId, business.name, () => {
          // This callback is called after successful password verification
          performSwitch();
        });
        return;
      } else {
        console.warn('Password required but no prompt handler provided');
        return;
      }
    }

    // No password protection or already verified
    await performSwitch();
  }, [businessLocations, getStorageKey, isBusinessVerified, user?.id, updateSession]);

  const createBusiness = React.useCallback(async (name: string): Promise<BusinessLocation | null> => {
    if (!user) {
      console.error('No user found when creating business');
      return null;
    }

    try {
      // Check location limit
      if (businessLocations.length >= locationLimit) {
        toast({
          title: "Limit Reached",
          description: `You have reached the maximum allowed limit of ${locationLimit} locations. Please contact support to increase your limit.`,
          variant: "destructive"
        });
        return null;
      }

      const response = await createBusinessAction(user.id, name.trim());

      if (!response.success || !response.data) {
        console.error('Error creating business:', response.error);
        throw new Error(response.error || 'Unknown error');
      }

      const data = response.data;

      if (data) {
        const newBusiness: BusinessLocation = {
          id: data.id,
          name: data.name,
          is_default: data.is_default,
          created_at: data.created_at,
          updated_at: data.updated_at,
          switch_password_hash: data.switch_password_hash
        };

        setBusinessLocations(prev => [...prev, newBusiness]);

        // If this is the first business or it's set as default, make it current
        if (businessLocations.length === 0 || newBusiness.is_default) {
          setCurrentBusiness(newBusiness);
          const storageKey = getStorageKey();
          if (storageKey) {
            localStorage.setItem(storageKey, newBusiness.id);
          }
        }

        return newBusiness;
      }

      return null;
    } catch (error) {
      console.error('Error creating business:', error);
      return null;
    }
  }, [user, businessLocations.length, locationLimit, getStorageKey]);

  const updateBusiness = React.useCallback(async (id: string, name: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const response = await updateBusinessAction(id, user.id, name);

      if (!response.success) {
        throw new Error(response.error);
      }

      const data = response.data;

      if (data) {
        const updatedBusiness: BusinessLocation = {
          id: data.id,
          name: data.name,
          is_default: data.is_default,
          created_at: data.created_at,
          updated_at: data.updated_at,
          switch_password_hash: data.switch_password_hash
        };

        setBusinessLocations(prev => prev.map(b => b.id === id ? updatedBusiness : b));

        if (currentBusiness?.id === id) {
          setCurrentBusiness(updatedBusiness);
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error updating business:', error);
      return false;
    }
  }, [user, currentBusiness?.id]);

  const deleteBusiness = React.useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const response = await deleteBusinessAction(id, user.id);

      if (!response.success) throw new Error(response.error);

      setBusinessLocations(prev => prev.filter(b => b.id !== id));

      // If deleted business was current, switch to default or first available
      if (currentBusiness?.id === id) {
        const remaining = businessLocations.filter(b => b.id !== id);
        const defaultBusiness = remaining.find(b => b.is_default);
        const nextBusiness = defaultBusiness || remaining[0] || null;

        setCurrentBusiness(nextBusiness);
        const storageKey = getStorageKey();
        if (storageKey) {
          if (nextBusiness) {
            localStorage.setItem(storageKey, nextBusiness.id);
          } else {
            localStorage.removeItem(storageKey);
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error deleting business:', error);
      return false;
    }
  }, [user, currentBusiness?.id, businessLocations, getStorageKey]);

  const resetBusiness = React.useCallback(async (id: string): Promise<boolean> => {
    if (!user) {
      console.error('No user found when resetting business');
      return false;
    }

    try {
      const response = await resetBusinessAction(id, user.id);
      if (!response.success) throw new Error(response.error);

      // Reload business locations to refresh the data
      await loadBusinessLocations();

      return true;
    } catch (error) {
      console.error('Error resetting business:', error);
      return false;
    }
  }, [user, loadBusinessLocations]);

  const contextValue = React.useMemo(() => ({
    currentBusiness,
    businessLocations,
    switchBusiness,
    loadBusinessLocations,
    createBusiness,
    updateBusiness,
    deleteBusiness,
    resetBusiness,
    isLoading,
    error,
    locationLimit,
    initialBusinessSettings,
    initialAnalyticsSummary
  }), [
    currentBusiness,
    businessLocations,
    switchBusiness,
    loadBusinessLocations,
    createBusiness,
    updateBusiness,
    deleteBusiness,
    resetBusiness,
    isLoading,
    error,
    locationLimit,
    initialBusinessSettings,
    initialAnalyticsSummary
  ]);

  return (
    <BusinessContext.Provider value={contextValue}>
      {children}
    </BusinessContext.Provider>
  );
};
