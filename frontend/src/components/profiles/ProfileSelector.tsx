"use client"

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProfiles } from '@/contexts/ProfileContext';
import { User } from 'lucide-react';

export const ProfileSelector: React.FC = () => {
  const { profiles, currentProfile, setCurrentProfile } = useProfiles();

  if (profiles.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <Select
        value={currentProfile?.id || ''}
        onValueChange={(value) => {
          const profile = profiles.find(p => p.id === value);
          setCurrentProfile(profile || null);
        }}
      >
        <SelectTrigger className="h-8 min-w-[120px] max-w-[200px]">
          <SelectValue placeholder="Select profile" />
        </SelectTrigger>
        <SelectContent>
          {profiles.map((profile) => (
            <SelectItem key={profile.id} value={profile.id}>
              <div className="flex items-center gap-2">
                <span className="font-medium">{profile.profile_name}</span>
                <span className="text-xs text-muted-foreground">({profile.role})</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};