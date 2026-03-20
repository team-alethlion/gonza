"use client";
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProfiles, BusinessRole } from '@/contexts/ProfileContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { getRolesAction } from '@/app/actions/profiles';

interface NewProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewProfileDialog: React.FC<NewProfileDialogProps> = ({
  open,
  onOpenChange
}) => {
  const { currentBusiness } = useBusiness();
  const { createProfile, profiles } = useProfiles();
  const [formData, setFormData] = useState({
    profile_name: '',
    email: '',
    phone_number: '',
    role: 'staff',
    role_id: '' as string | null
  });
  const [roles, setRoles] = useState<BusinessRole[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (open && currentBusiness?.id) {
      loadRoles();
    }
  }, [open, currentBusiness?.id]);

  const loadRoles = async () => {
    try {
      if (currentBusiness?.id) {
        const data = await getRolesAction(currentBusiness.id);
        setRoles(data as unknown as BusinessRole[]);
      }
    } catch (err) {
      console.error(err);
    }

    // If no profiles exist, force role to admin
    if (profiles.length === 0) {
      setFormData(prev => ({ ...prev, role: 'admin', role_id: null }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await createProfile({
        profile_name: formData.profile_name.trim(),
        email: formData.email.trim(),
        phone_number: formData.phone_number.trim() || undefined,
        role: formData.role,
        role_id: formData.role_id || null,
        pin: '0000',
        is_active: true,
        sms_credits: 0
      } as any);

      if (result) {
        setFormData({
          profile_name: '',
          email: '',
          phone_number: '',
          role: 'staff',
          role_id: null
        });
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Profile</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile_name">Profile Name</Label>
            <Input
              id="profile_name"
              value={formData.profile_name}
              onChange={(e) => handleChange('profile_name', e.target.value)}
              placeholder="Enter profile name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="Enter email address"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone_number">Phone Number (Optional)</Label>
            <Input
              id="phone_number"
              value={formData.phone_number}
              onChange={(e) => handleChange('phone_number', e.target.value)}
              placeholder="Enter phone number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={formData.role_id || formData.role}
              onValueChange={(value) => {
                const selectedRole = roles.find(r => r.id === value);
                if (selectedRole) {
                  setFormData(prev => ({ ...prev, role_id: value, role: selectedRole.name }));
                } else {
                  setFormData(prev => ({ ...prev, role_id: null, role: value }));
                }
              }}
              disabled={profiles.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roles.length > 0 ? (
                  roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="admin">Manager</SelectItem>
                    <SelectItem value="manager">Supervisor</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            {profiles.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">First profile must be the Manager.</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Profile'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};