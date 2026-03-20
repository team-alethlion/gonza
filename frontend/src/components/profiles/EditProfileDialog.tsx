"use client";
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProfiles, BusinessProfile, BusinessRole } from '@/contexts/ProfileContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { getRolesAction } from '@/app/actions/profiles';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';

interface EditProfileDialogProps {
  profile: BusinessProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditProfileDialog: React.FC<EditProfileDialogProps> = ({
  profile,
  open,
  onOpenChange
}) => {
  const { currentBusiness } = useBusiness();
  const { updateProfile, resetProfilePin } = useProfiles();
  const [formData, setFormData] = useState({
    profile_name: '',
    email: '',
    phone_number: '',
    role: 'staff',
    role_id: '' as string | null
  });
  const [roles, setRoles] = useState<BusinessRole[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResetPin, setShowResetPin] = useState(false);
  const [newPin, setNewPin] = useState('');

  useEffect(() => {
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
  };

  useEffect(() => {
    if (profile) {
      setFormData({
        profile_name: profile.profile_name,
        email: profile.email,
        phone_number: profile.phone_number || '',
        role: profile.role,
        role_id: profile.role_id
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSubmitting(true);

    try {
      const success = await updateProfile(profile.id, {
        profile_name: formData.profile_name.trim(),
        email: formData.email.trim(),
        phone_number: formData.phone_number.trim() || undefined,
        role: formData.role,
        role_id: formData.role_id || null
      });

      if (success) {
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPin = async () => {
    if (!profile || !newPin) return;

    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      toast.error('PIN must be 4 digits');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await resetProfilePin(profile.id, newPin);
      if (success) {
        setShowResetPin(false);
        setNewPin('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit_profile_name">Profile Name</Label>
            <Input
              id="edit_profile_name"
              value={formData.profile_name}
              onChange={(e) => handleChange('profile_name', e.target.value)}
              placeholder="Enter profile name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_email">Email</Label>
            <Input
              id="edit_email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="Enter email address"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_phone_number">Phone Number (Optional)</Label>
            <Input
              id="edit_phone_number"
              value={formData.phone_number}
              onChange={(e) => handleChange('phone_number', e.target.value)}
              placeholder="Enter phone number"
            />
          </div>

          {profile.role.toLowerCase() !== 'manager' && profile.role.toLowerCase() !== 'admin' && profile.role.toLowerCase() !== 'owner' && profile.business_role?.name !== 'Manager' && profile.business_role?.name !== 'Admin' && profile.business_role?.name !== 'Owner' && (
            <div className="space-y-2">
              <Label htmlFor="edit_role">Role</Label>
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
            </div>
          )}

          <div className="border-t pt-4 mt-4">
            {!showResetPin ? (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 text-amber-600 border-amber-200 hover:bg-amber-50"
                onClick={() => setShowResetPin(true)}
              >
                <Lock size={16} /> Reset Profile PIN
              </Button>
            ) : (
              <div className="space-y-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                <div className="space-y-1">
                  <Label htmlFor="new_pin">New 4-Digit PIN</Label>
                  <Input
                    id="new_pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="Enter new PIN"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => {
                      setShowResetPin(false);
                      setNewPin('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                    onClick={handleResetPin}
                    disabled={isSubmitting || newPin.length !== 4}
                  >
                    Confirm Reset
                  </Button>
                </div>
              </div>
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
              {isSubmitting ? 'Updating...' : 'Update Profile'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};