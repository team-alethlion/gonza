"use client";
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BusinessProfile, useProfiles } from '@/contexts/ProfileContext';
import { MoreHorizontal, Mail, Phone, Edit, Trash2, UserCheck, UserX } from 'lucide-react';

interface ProfileCardProps {
  profile: BusinessProfile;
  onEdit: () => void;
  onDelete: () => void;
  canManage?: boolean;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  onEdit,
  onDelete,
  canManage = true
}) => {
  const { toggleProfileStatus, currentProfile } = useProfiles();

  const handleToggleStatus = async () => {
    if (!canManage) return;
    await toggleProfileStatus(profile.id, !profile.is_active);
  };

  const isSelf = currentProfile?.id === profile.id;

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
      case 'owner':
        return 'default';
      case 'manager':
        return 'secondary';
      case 'staff':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Card className={`relative ${!profile.is_active ? 'opacity-60' : ''}`}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{profile.profile_name}</h3>
          <Badge variant={getRoleBadgeVariant(profile.role)} className="mt-1">
            {profile.role}
          </Badge>
          {isSelf && (
            <Badge variant="outline" className="ml-2 text-[10px] bg-blue-50 text-blue-600 border-blue-100">
              You
            </Badge>
          )}
        </div>

        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleStatus}>
                {profile.is_active ? (
                  <>
                    <UserX className="h-4 w-4 mr-2" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Profile
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{profile.email}</span>
        </div>

        {profile.phone_number && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{profile.phone_number}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>Created {new Date(profile.created_at).toLocaleDateString()}</span>
          <Badge
            variant={profile.is_active ? "default" : "secondary"}
            className="text-xs"
          >
            {profile.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};