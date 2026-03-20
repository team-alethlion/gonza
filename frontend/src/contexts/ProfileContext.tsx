"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { getProfilesAction, createProfileAction, updateProfileAction, deleteProfileAction } from '@/app/actions/profiles';
import { useBusiness } from './BusinessContext';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

export interface BusinessRole {
  id: string;
  business_location_id: string;
  name: string;
  description?: string | null;
  permissions: Record<string, string[]>;
  created_at: string;
  updated_at: string;
}

export interface BusinessProfile {
  id: string;
  business_location_id: string;
  profile_name: string;
  email: string;
  phone_number?: string;
  role: string;
  pin: string;
  role_id: string | null;
  business_role?: BusinessRole;
  is_active: boolean;
  sms_credits: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface ProfileContextType {
  profiles: BusinessProfile[];
  currentProfile: BusinessProfile | null;
  isProfileVerified: boolean;
  isLoading: boolean;
  setCurrentProfile: (profile: BusinessProfile | null) => void;
  loadProfiles: () => Promise<void>;
  createProfile: (data: Omit<BusinessProfile, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'business_location_id' | 'business_role'>) => Promise<BusinessProfile | null>;
  updateProfile: (id: string, data: Partial<BusinessProfile>) => Promise<boolean>;
  deleteProfile: (id: string) => Promise<boolean>;
  toggleProfileStatus: (id: string, isActive: boolean) => Promise<boolean>;
  verifyPin: (pin: string) => Promise<boolean>;
  changePin: (oldPin: string, newPin: string) => Promise<boolean>;
  resetProfilePin: (id: string, newPin: string) => Promise<boolean>;
  logoutProfile: () => Promise<void>;
  hasPermission: (module: string, action?: string) => boolean;
  isFirstTimeSetupNeeded: boolean;
  dismissFirstTimeSetup: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode, initialProfiles?: BusinessProfile[] }> = ({ children, initialProfiles = [] }) => {
  const { user, signOut } = useAuth();
  const userId = user?.id;
  const { currentBusiness, isLoading: businessLoading } = useBusiness();
  const [profiles, setProfiles] = useState<BusinessProfile[]>(initialProfiles);
  const hasLoadedInitial = useRef(initialProfiles.length > 0);
  
  // Initialize to null to avoid hydration mismatch
  const [currentProfile, setCurrentProfile] = useState<BusinessProfile | null>(null);

  const [isProfileVerified, setIsProfileVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(initialProfiles.length === 0 && !!userId && !!currentBusiness?.id);
  const [isFirstTimeSetupNeeded, setIsFirstTimeSetupNeeded] = useState(false);

  // Sync with next-auth user and auto-select profile
  useEffect(() => {
    if (!currentBusiness?.id || profiles.length === 0 || isLoading) return;

    setCurrentProfile(prev => {
      if (prev && prev.business_location_id === currentBusiness.id) return prev;

      // 1. Try local storage
      const savedProfileId = localStorage.getItem(`currentProfile_${currentBusiness.id}`);
      if (savedProfileId) {
        const profile = profiles.find(p => p.id === savedProfileId);
        if (profile) return profile;
      }

      // 2. Try email match (Strongest auto-selection for the logged in user)
      if (user?.email) {
        const matchingProfile = profiles.find(p => p.email.toLowerCase() === user.email?.toLowerCase());
        if (matchingProfile) return matchingProfile;
      }

      // 3. Fallback to first profile
      return profiles[0];
    });
  }, [currentBusiness?.id, profiles, user?.email, isLoading]);

  // Restore verification state from sessionStorage when business and profile are loaded
  useEffect(() => {
    if (currentBusiness?.id && currentProfile?.id && !isProfileVerified) {
      const role = (currentProfile.role || "").toLowerCase();
      const businessRoleName = (currentProfile.business_role?.name || "").toLowerCase();
      
      // PIN Bypass for Admin (Agency Owner) and Manager roles
      if (
        role === 'admin' || 
        role === 'manager' || 
        role === 'owner' || 
        businessRoleName === 'admin' || 
        businessRoleName === 'owner'
      ) {
        setIsProfileVerified(true);
        return;
      }

      const verifiedKey = `profileVerified_${currentBusiness.id}_${currentProfile.id}`;
      const isVerified = sessionStorage.getItem(verifiedKey) === 'true';
      if (isVerified) {
        setIsProfileVerified(true);
      }
    }
  }, [currentBusiness?.id, currentProfile?.id, isProfileVerified]);

  const loadProfiles = React.useCallback(async () => {
    if (!userId || !currentBusiness?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await getProfilesAction(currentBusiness.id);
      setProfiles(data as unknown as BusinessProfile[]);
      hasLoadedInitial.current = true;
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, currentBusiness?.id]);

  const createProfile = React.useCallback(async (data: Omit<BusinessProfile, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'business_location_id'>): Promise<BusinessProfile | null> => {
    if (!userId || !currentBusiness?.id) return null;

    try {
      const result = await createProfileAction(currentBusiness.id, data);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Re-fetch profiles to get the full joined data (especially business_role)
      await loadProfiles();

      toast.success(`Profile "${data.profile_name}" created successfully`);
      return result.data as unknown as BusinessProfile;
    } catch (error) {
      console.error('Error creating profile:', error);
      toast.error('Failed to create profile');
      return null;
    }
  }, [userId, currentBusiness?.id, loadProfiles]);

  const updateProfile = React.useCallback(async (id: string, data: Partial<BusinessProfile>): Promise<boolean> => {
    try {
      if (!currentBusiness) throw new Error("No business selected");
      const result = await updateProfileAction(id, currentBusiness.id, data);

      if (!result.success) throw new Error(result.error);

      // Re-fetch profiles to get the updated joined data
      await loadProfiles();

      toast.success('Profile updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
      return false;
    }
  }, [currentBusiness, loadProfiles]);

  const deleteProfile = React.useCallback(async (id: string): Promise<boolean> => {
    try {
      if (!currentBusiness) throw new Error("No business selected");
      const result = await deleteProfileAction(id, currentBusiness.id);

      if (!result.success) throw new Error(result.error);

      setProfiles(prev => prev.filter(profile => profile.id !== id));

      if (currentProfile?.id === id) {
        setCurrentProfile(null);
      }

      toast.success('Profile deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting profile:', error);
      toast.error('Failed to delete profile');
      return false;
    }
  }, [currentBusiness, currentProfile?.id]);

  const toggleProfileStatus = React.useCallback(async (id: string, isActive: boolean): Promise<boolean> => {
    return updateProfile(id, { is_active: isActive });
  }, [updateProfile]);

  const verifyPin = React.useCallback(async (pin: string): Promise<boolean> => {
    if (!currentProfile) return false;

    if (currentProfile.pin === pin) {
      setIsProfileVerified(true);

      // Save verification to sessionStorage (persists during page reload)
      if (currentBusiness?.id && currentProfile?.id) {
        sessionStorage.setItem(`profileVerified_${currentBusiness.id}_${currentProfile.id}`, 'true');
      }

      // Check if user is using default PIN and hasn't dismissed the setup dialog yet
      if (pin === '0000' && currentBusiness?.id) {
        const dismissedKey = `firstTimeSetupDismissed_${currentBusiness.id}_${currentProfile.id}`;
        const wasDismissed = localStorage.getItem(dismissedKey) === 'true';
        if (!wasDismissed) {
          setIsFirstTimeSetupNeeded(true);
        }
      }

      return true;
    }

    toast.error('Incorrect PIN');
    return false;
  }, [currentProfile, currentBusiness?.id]);

  const changePin = React.useCallback(async (oldPin: string, newPin: string): Promise<boolean> => {
    if (!currentProfile) return false;

    if (currentProfile.pin !== oldPin) {
      toast.error('Current PIN is incorrect');
      return false;
    }

    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      toast.error('PIN must be 4 digits');
      return false;
    }

    const success = await updateProfile(currentProfile.id, { pin: newPin });
    if (success) {
      toast.success('PIN changed successfully');

      // Clear the first-time setup dismissed flag since PIN is no longer default
      if (currentBusiness?.id && oldPin === '0000') {
        const dismissedKey = `firstTimeSetupDismissed_${currentBusiness.id}_${currentProfile.id}`;
        localStorage.removeItem(dismissedKey);
      }
    }
    return success;
  }, [currentProfile, currentBusiness?.id, updateProfile]);

  const resetProfilePin = React.useCallback(async (id: string, newPin: string): Promise<boolean> => {
    // This method is intended for owners/admins to reset PINs without the old one
    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      toast.error('PIN must be 4 digits');
      return false;
    }

    const success = await updateProfile(id, { pin: newPin });
    if (success) {
      toast.success('PIN reset successfully');
    }
    return success;
  }, [updateProfile]);

  const logoutProfile = React.useCallback(async () => {
    // Clear sessionStorage verification for current profile
    if (currentBusiness?.id && currentProfile?.id) {
      sessionStorage.removeItem(`profileVerified_${currentBusiness.id}_${currentProfile.id}`);
    }

    // Clear profile state
    setCurrentProfile(null);
    setIsProfileVerified(false);
    setIsFirstTimeSetupNeeded(false);
    if (currentBusiness?.id) {
      localStorage.removeItem(`currentProfile_${currentBusiness.id}`);
    }

    // Sign out of Supabase session
    await signOut();
  }, [currentBusiness?.id, currentProfile?.id, signOut]);

  const dismissFirstTimeSetup = React.useCallback(() => {
    setIsFirstTimeSetupNeeded(false);
    // Remember that user has dismissed this dialog for this profile
    if (currentBusiness?.id && currentProfile?.id) {
      const dismissedKey = `firstTimeSetupDismissed_${currentBusiness.id}_${currentProfile.id}`;
      localStorage.setItem(dismissedKey, 'true');
    }
  }, [currentBusiness?.id, currentProfile?.id]);

  const hasPermission = React.useCallback((module: string, action: string = 'view'): boolean => {
    if (!currentProfile) return false;

    const role = (currentProfile.role || "").toLowerCase();
    const businessRoleName = (currentProfile.business_role?.name || "").toLowerCase();

    // Full access for Admin (Agency Owner) and Manager (as requested)
    if (
      role === 'admin' || 
      role === 'manager' || 
      role === 'owner' || 
      businessRoleName === 'admin' || 
      businessRoleName === 'owner'
    ) return true;

    const permissions = currentProfile.business_role?.permissions;
    if (!permissions) {
      // Fallback for staff or other roles
      if (role === 'staff') {
        if (action === 'view') return true;
        if (['sales', 'tasks'].includes(module.toLowerCase()) && action === 'create') return true;
      }
      return false;
    }

    const modulePermissions = permissions[module.toLowerCase()];
    if (!modulePermissions) return false;

    const hasPerm = modulePermissions.includes(action.toLowerCase());
    if (!hasPerm) {
        console.log(`ProfileContext: Permission denied for ${module}:${action} for profile ${currentProfile.profile_name}`);
    }
    return hasPerm;
  }, [currentProfile]);

  // Load profiles when business changes
  useEffect(() => {
    if (businessLoading) {
      setIsLoading(true);
      return;
    }

    if (currentBusiness?.id) {
      const needsLoad = !hasLoadedInitial.current || (profiles.length > 0 && profiles[0].business_location_id !== currentBusiness.id);
      if (needsLoad) {
        loadProfiles();
      } else {
        setIsLoading(false);
      }
    } else {
      setProfiles([]);
      setCurrentProfile(null);
      setIsProfileVerified(false);
      setIsFirstTimeSetupNeeded(false);
      setIsLoading(false);
    }
  }, [currentBusiness?.id, businessLoading, userId, initialProfiles.length, loadProfiles]);

  // Save current profile to localStorage
  const handleSetCurrentProfile = React.useCallback((profile: BusinessProfile | null) => {
    setCurrentProfile(profile);
    setIsProfileVerified(false); // Reset verification on manual switch

    if (currentBusiness?.id) {
      if (profile) {
        localStorage.setItem(`currentProfile_${currentBusiness.id}`, profile.id);
        // Clear verification from sessionStorage when switching profiles
        sessionStorage.removeItem(`profileVerified_${currentBusiness.id}_${profile.id}`);
      } else {
        localStorage.removeItem(`currentProfile_${currentBusiness.id}`);
      }
    }
  }, [currentBusiness?.id]);

  // Keep currentProfile in sync with fresh data from profiles list
  useEffect(() => {
    if (currentProfile && profiles.length > 0) {
      const freshProfile = profiles.find(p => p.id === currentProfile.id);
      if (freshProfile) {
        // Only update if something actually changed to avoid infinite loops
        const { business_role: oldRole, ...oldData } = currentProfile;
        const { business_role: newRole, ...newData } = freshProfile;

        const dataChanged = JSON.stringify(oldData) !== JSON.stringify(newData);
        const roleChanged = JSON.stringify(oldRole) !== JSON.stringify(newRole);

        if (dataChanged || roleChanged) {
          setCurrentProfile(freshProfile);
        }
      }
    }
  }, [profiles]);

  const contextValue = React.useMemo(() => ({
    profiles,
    currentProfile,
    isProfileVerified,
    isLoading,
    setCurrentProfile: handleSetCurrentProfile,
    loadProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    toggleProfileStatus,
    verifyPin,
    changePin,
    resetProfilePin,
    logoutProfile,
    hasPermission,
    isFirstTimeSetupNeeded,
    dismissFirstTimeSetup
  }), [
    profiles,
    currentProfile,
    isProfileVerified,
    isLoading,
    handleSetCurrentProfile,
    loadProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    toggleProfileStatus,
    verifyPin,
    changePin,
    resetProfilePin,
    logoutProfile,
    hasPermission,
    isFirstTimeSetupNeeded,
    dismissFirstTimeSetup
  ]);

  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfiles = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfiles must be used within a ProfileProvider');
  }
  return context;
};
