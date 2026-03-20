import React from 'react';
import { ProfileList } from './ProfileList';
import { ProfilePageSkeleton } from './ProfilePageSkeleton';
import { EmptyProfilesState } from './EmptyProfilesState';
import { BusinessProfile } from '@/contexts/ProfileContext';

interface ProfileContentProps {
  profiles: BusinessProfile[];
  isLoading: boolean;
  onEditProfile: (profile: BusinessProfile) => void;
  onDeleteProfile: (profile: BusinessProfile) => void;
  canManage?: boolean;
}

export const ProfileContent: React.FC<ProfileContentProps> = ({
  profiles,
  isLoading,
  onEditProfile,
  onDeleteProfile,
  canManage = true
}) => {
  if (isLoading) {
    return <ProfilePageSkeleton />;
  }

  if (profiles.length === 0) {
    return <EmptyProfilesState />;
  }

  return (
    <ProfileList
      profiles={profiles}
      onEditProfile={onEditProfile}
      onDeleteProfile={onDeleteProfile}
      canManage={canManage}
    />
  );
};