"use client";
import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useProfiles, BusinessProfile } from '@/contexts/ProfileContext';

interface DeleteProfileDialogProps {
  profile: BusinessProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DeleteProfileDialog: React.FC<DeleteProfileDialogProps> = ({
  profile,
  open,
  onOpenChange
}) => {
  const { deleteProfile } = useProfiles();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!profile) return;

    setIsDeleting(true);
    try {
      const success = await deleteProfile(profile.id);
      if (success) {
        onOpenChange(false);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  if (!profile) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Profile</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the profile "{profile.profile_name}"? 
            This action cannot be undone. All activity history associated with this profile will remain but will no longer be linked to a profile.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete Profile'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};