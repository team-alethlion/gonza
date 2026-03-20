"use client";
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';

interface ProfileHeaderProps {
  profilesCount: number;
  onNewProfile: () => void;
  canManage?: boolean;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profilesCount,
  onNewProfile,
  canManage = true
}) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Users className="h-8 w-8" />
          Profiles
        </h1>
        <p className="text-muted-foreground">
          Manage individual user profiles for your business • {profilesCount} profile{profilesCount !== 1 ? 's' : ''}
        </p>
      </div>

      {canManage && (
        <Button onClick={onNewProfile} className="gap-2">
          <Plus className="h-4 w-4" />
          New Profile
        </Button>
      )}
    </div>
  );
};