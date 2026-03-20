"use client";
import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, AlertCircle, CheckCircle, Download, Edit, Info } from 'lucide-react';
import { parseCSVUpdate, generateUpdateErrorLogCSV, UpdateValidationError, CSVProductUpdateRow, extractUpdateCategories } from '@/utils/csvUpdateParser';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useProductCSVUpdate } from '@/hooks/useProductCSVUpdate';
import { BulkOperationProgress } from './BulkOperationProgress';

interface CSVUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | undefined;
}

interface UpdateState {
  step: 'select' | 'preview' | 'updating' | 'complete';
  file: File | null;
  validRows: CSVProductUpdateRow[];
  errors: UpdateValidationError[];
  totalRows: number;
  updateProgress: number;
  successCount: number;
  failureCount: number;
  newCategories: string[];
  currentProductIndex: number;
}

const CSVUpdateDialog: React.FC<CSVUpdateDialogProps> = ({
  open,
  onOpenChange,
  userId
}) => {
  const { bulkUpdateProducts, detectNewCategories, isUpdating } = useProductCSVUpdate(userId);
  const [state, setState] = useState<UpdateState>({
    step: 'select',
    file: null,
    validRows: [],
    errors: [],
    totalRows: 0,
    updateProgress: 0,
    successCount: 0,
    failureCount: 0,
    newCategories: [],
    currentProductIndex: 0
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    const text = await file.text();
    const result = parseCSVUpdate(text);

    // Detect new categories
    const newCategories = detectNewCategories(result.validRows);

    setState({
      ...state,
      step: 'preview',
      file,
      validRows: result.validRows,
      errors: result.errors,
      totalRows: result.totalRows,
      newCategories
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleConfirmUpdate = async () => {
    setState(prev => ({ ...prev, step: 'updating', updateProgress: 0, currentProductIndex: 0 }));

    try {
      if (!state.file) throw new Error("No file selected");
      
      const result = await bulkUpdateProducts(state.file, (current, total) => {
        const progress = Math.round((current / total) * 100);
        setState(prev => ({
          ...prev,
          updateProgress: progress,
          currentProductIndex: current
        }));
      });

      setState(prev => ({
        ...prev,
        step: 'complete',
        updateProgress: 100,
        successCount: result.successCount,
        failureCount: result.failureCount,
        currentProductIndex: state.validRows.length
      }));
    } catch (error) {
      console.error('Update failed:', error);
      setState(prev => ({
        ...prev,
        step: 'complete',
        updateProgress: 100,
        successCount: 0,
        failureCount: state.validRows.length,
        currentProductIndex: state.validRows.length
      }));
    }
  };

  const handleClose = () => {
    if (isUpdating) return;

    const wasSuccessfulUpdate = state.step === 'complete' && state.successCount > 0;

    setState({
      step: 'select',
      file: null,
      validRows: [],
      errors: [],
      totalRows: 0,
      updateProgress: 0,
      successCount: 0,
      failureCount: 0,
      newCategories: [],
      currentProductIndex: 0
    });

    onOpenChange(false);

    if (wasSuccessfulUpdate) {
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isUpdating) {
      onOpenChange(newOpen);
    }
  };

  const renderFileSelection = () => (
    <div className="space-y-4">
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">
          Upload CSV File for Product Updates
        </p>
        <p className="text-sm text-gray-500">
          Drag and drop your CSV file here, or click to browse
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Make sure the CSV includes Item Number column for product identification
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  );

  const renderPreview = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{state.validRows.length}</div>
            <p className="text-xs text-muted-foreground">Products to update</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{state.errors.length}</div>
            <p className="text-xs text-muted-foreground">Errors found</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{state.totalRows}</div>
            <p className="text-xs text-muted-foreground">Total rows</p>
          </CardContent>
        </Card>
      </div>

      {state.newCategories.length > 0 && (
        <Alert>
          <Edit className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p>The following {state.newCategories.length} new categories will be created:</p>
              <div className="flex flex-wrap gap-1">
                {state.newCategories.map((category, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {state.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {state.errors.length} rows have errors and will be skipped.
            <Button
              variant="link"
              className="p-0 h-auto ml-2"
              onClick={() => generateUpdateErrorLogCSV(state.errors)}
            >
              <Download className="h-3 w-3 mr-1" />
              Download error log
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-1">
            <p><strong>Update Rules:</strong></p>
            <ul className="text-sm space-y-1 ml-2">
              <li>• Only fields with changes will be updated</li>
              <li>• Empty fields will be ignored (no changes)</li>
              <li>• Quantity changes will be tracked in stock history</li>
              <li>• Products are identified by Item Number</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={() => setState(prev => ({ ...prev, step: 'select' }))}>
          Back
        </Button>
        <Button
          onClick={handleConfirmUpdate}
          disabled={state.validRows.length === 0}
        >
          Update {state.validRows.length} Products
          {state.newCategories.length > 0 && ` & Create ${state.newCategories.length} Categories`}
        </Button>
      </div>
    </div>
  );

  const renderUpdating = () => (
    <BulkOperationProgress
      title="Updating Products..."
      currentCount={state.currentProductIndex}
      totalCount={state.validRows.length}
      status="processing"
    />
  );

  const renderComplete = () => (
    <div className="space-y-4">
      <BulkOperationProgress
        title="Update Complete!"
        currentCount={state.currentProductIndex}
        totalCount={state.validRows.length}
        status={state.failureCount > 0 ? 'failed' : 'completed'}
        successCount={state.successCount}
        failureCount={state.failureCount}
      />
      <div className="flex justify-center">
        <Button onClick={handleClose}>Close</Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] pointer-events-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Update Products via CSV
          </DialogTitle>
          <DialogDescription>
            Update existing products using a CSV file with Item Numbers for identification
          </DialogDescription>
        </DialogHeader>

        {state.step === 'select' && renderFileSelection()}
        {state.step === 'preview' && renderPreview()}
        {state.step === 'updating' && renderUpdating()}
        {state.step === 'complete' && renderComplete()}
      </DialogContent>
    </Dialog>
  );
};

export default CSVUpdateDialog;