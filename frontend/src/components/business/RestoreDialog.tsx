"use client";
import React, { useRef, useState } from 'react';
import { Upload, AlertTriangle } from 'lucide-react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBusinessBackup } from '@/hooks/useBusinessBackup';
import { useBusiness } from '@/contexts/BusinessContext';

interface RestoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RestoreDialog: React.FC<RestoreDialogProps> = ({ open, onOpenChange }) => {
  const { importBusinessData, isImporting, progress } = useBusinessBackup();
  const { currentBusiness } = useBusiness();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        setSelectedFile(file);
        setShowWarning(true);
      } else {
        alert('Please select a valid JSON backup file');
      }
    }
  };

  const handleRestore = async () => {
    if (!selectedFile) return;
    
    const success = await importBusinessData(selectedFile);
    if (success) {
      onOpenChange(false);
      setSelectedFile(null);
      setShowWarning(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setSelectedFile(null);
    setShowWarning(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Restore Business Data
          </DialogTitle>
          <DialogDescription>
            Import business data from a backup file. This will replace all current data.
            {currentBusiness && (
              <span className="block mt-2 font-medium text-foreground">
                Target Business: {currentBusiness.name}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedFile && (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6">
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Select a backup file to restore
              </p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
              >
                Choose File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {selectedFile && !isImporting && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Selected File:</p>
                <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>

              {showWarning && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> This will permanently replace all current business data 
                    including products, sales, customers, and settings. This action cannot be undone.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {isImporting && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Restoring data... {progress.toFixed(0)}%
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-muted-foreground text-center">
                Please don't close this window. The app will reload automatically when complete.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isImporting}
          >
            Cancel
          </Button>
          {selectedFile && (
            <Button
              onClick={handleRestore}
              disabled={isImporting || !currentBusiness}
              variant="destructive"
            >
              {isImporting ? 'Restoring...' : 'Restore Data'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};