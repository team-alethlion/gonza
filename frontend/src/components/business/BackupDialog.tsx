"use client";
import React from 'react';
import { Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useBusinessBackup } from '@/hooks/useBusinessBackup';
import { useBusiness } from '@/contexts/BusinessContext';

interface BackupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BackupDialog: React.FC<BackupDialogProps> = ({ open, onOpenChange }) => {
  const { exportBusinessData, isExporting, progress } = useBusinessBackup();
  const { currentBusiness } = useBusiness();

  const handleBackup = async () => {
    await exportBusinessData();
    if (!isExporting) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Backup Business Data
          </DialogTitle>
          <DialogDescription>
            Export all your business data including products, sales, customers, expenses, and settings.
            {currentBusiness && (
              <span className="block mt-2 font-medium text-foreground">
                Business: {currentBusiness.name}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {isExporting && (
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground">
              Preparing backup... {progress.toFixed(0)}%
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleBackup}
            disabled={isExporting || !currentBusiness}
          >
            {isExporting ? 'Exporting...' : 'Start Backup'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};