"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBusiness } from '@/contexts/BusinessContext';
import { useToast } from '@/hooks/use-toast';

interface NewBusinessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewBusinessDialog: React.FC<NewBusinessDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createBusiness } = useBusiness();
  const { toast } = useToast();

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setName('');
      setIsSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Business name is required",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log('Creating business with name:', name.trim());
      const newBusiness = await createBusiness(name.trim());
      
      if (newBusiness) {
        toast({
          title: "Success",
          description: "Business created successfully",
        });
        setName('');
        onOpenChange(false);
      } else {
        toast({
          title: "Error",
          description: "Failed to create business",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating business:', error);
      toast({
        title: "Error",
        description: "Failed to create business",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Input value changing to:', e.target.value);
    setName(e.target.value);
  };

  const handleCancel = () => {
    setName('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Create New Business</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name</Label>
            <Input
              id="businessName"
              type="text"
              value={name}
              onChange={handleInputChange}
              placeholder="Enter business name"
              disabled={isSubmitting}
              autoComplete="off"
              className="w-full"
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Creating...' : 'Create Business'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
