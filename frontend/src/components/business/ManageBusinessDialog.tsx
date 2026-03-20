"use client";

import React, { useState } from 'react';
import { Pencil, Trash2, Building2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBusiness } from '@/contexts/BusinessContext';
import { useToast } from '@/hooks/use-toast';

interface ManageBusinessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ManageBusinessDialog: React.FC<ManageBusinessDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { businessLocations, updateBusiness, deleteBusiness } = useBusiness();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) return;

    const success = await updateBusiness(editingId, editingName.trim());
    
    if (success) {
      toast({
        title: "Success",
        description: "Business name updated successfully",
      });
      setEditingId(null);
      setEditingName('');
    } else {
      toast({
        title: "Error",
        description: "Failed to update business name",
        variant: "destructive"
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    const success = await deleteBusiness(deletingId);
    
    if (success) {
      toast({
        title: "Success",
        description: "Business deleted successfully",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to delete business",
        variant: "destructive"
      });
    }
    
    setDeletingId(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Businesses</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {businessLocations.map((business) => (
              <div
                key={business.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-gray-500" />
                  <div>
                    {editingId === business.id ? (
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-8"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        autoFocus
                      />
                    ) : (
                      <>
                        <div className="font-medium">{business.name}</div>
                        {business.is_default && (
                          <div className="text-xs text-gray-500">Default Business</div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  {editingId === business.id ? (
                    <>
                      <Button size="sm" onClick={handleSaveEdit}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStartEdit(business.id, business.name)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!business.is_default && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingId(business.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Business</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this business? This action cannot be undone
              and will permanently delete all associated data including products, sales,
              customers, and expenses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
