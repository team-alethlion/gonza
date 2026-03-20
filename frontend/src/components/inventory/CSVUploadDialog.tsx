"use client";
import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, AlertCircle, CheckCircle, Download, Plus, Info } from 'lucide-react';
import { parseCSV, generateErrorLogCSV, ValidationError, CSVProductRow, extractUniqueCategories } from '@/utils/csvParser';
import { ProductFormData } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useBulkProducts } from '@/hooks/useBulkProducts';
import { BulkOperationProgress } from './BulkOperationProgress';

interface CSVUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (products: ProductFormData[]) => Promise<void>;
  categories: string[];
}

interface UploadState {
  step: 'select' | 'preview' | 'uploading' | 'complete';
  file: File | null;
  validRows: CSVProductRow[];
  errors: ValidationError[];
  totalRows: number;
  uploadProgress: number;
  successCount: number;
  failureCount: number;
  newCategories: string[];
  currentProductIndex: number;
}

const CSVUploadDialog: React.FC<CSVUploadDialogProps> = ({
  open,
  onOpenChange,
  onUpload,
  categories
}) => {
  const { detectNewCategories, bulkCreateProducts } = useBulkProducts();
  const [state, setState] = useState<UploadState>({
    step: 'select',
    file: null,
    validRows: [],
    errors: [],
    totalRows: 0,
    uploadProgress: 0,
    successCount: 0,
    failureCount: 0,
    newCategories: [],
    currentProductIndex: 0
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    const text = await file.text();
    const result = parseCSV(text);

    // Convert CSV rows to ProductFormData to detect new categories
    const products = result.validRows.map(convertCSVRowToProduct);
    const newCategories = detectNewCategories(products);

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

  const convertCSVRowToProduct = (row: CSVProductRow): ProductFormData => {
    let creationDate = new Date();

    // Accept any date format - try multiple parsing approaches
    const dateValue = row['Creation Date'];
    if (dateValue) {
      // Try DD/MM/YYYY format first
      const ddmmyyyyMatch = dateValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (ddmmyyyyMatch) {
        const [, day, month, year] = ddmmyyyyMatch;
        creationDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        // Try standard date parsing for other formats
        const parsedDate = new Date(dateValue);
        if (!isNaN(parsedDate.getTime())) {
          creationDate = parsedDate;
        }
      }
    }

    return {
      name: row['Product Name'],
      category: row['Category'] || '',
      description: row['Description'] || '',
      supplier: row['Supplier'] || '',
      quantity: row['Initial Stock'] ? Number(row['Initial Stock']) : 0,
      minimumStock: row['Minimum Stock Level'] ? Number(row['Minimum Stock Level']) : undefined,
      costPrice: row['Cost Price'] ? Number(row['Cost Price']) : undefined,
      sellingPrice: row['Selling Price'] ? Number(row['Selling Price']) : undefined,
      manufacturerBarcode: row['Manufacturer Barcode'] || '',
      imageFile: null,
      imageUrl: null,
      createdAt: creationDate
    };
  };

  const handleConfirmUpload = async () => {
    setState(prev => ({ ...prev, step: 'uploading', uploadProgress: 0, currentProductIndex: 0 }));
    setIsUploading(true);

    const products = state.validRows.map(convertCSVRowToProduct);

    try {
      // Use the bulk upload function directly with progress tracking
      await bulkCreateProducts(products, (current, total) => {
        const progress = Math.round((current / total) * 100);
        setState(prev => ({
          ...prev,
          uploadProgress: progress,
          currentProductIndex: current,
          successCount: current,
          failureCount: 0
        }));
      });

      setState(prev => ({
        ...prev,
        step: 'complete',
        uploadProgress: 100,
        successCount: products.length,
        failureCount: 0,
        currentProductIndex: products.length
      }));
    } catch (error) {
      console.error('Bulk upload failed:', error);
      setState(prev => ({
        ...prev,
        step: 'complete',
        uploadProgress: 100,
        successCount: 0,
        failureCount: products.length,
        currentProductIndex: products.length
      }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    // Prevent closing during upload
    if (isUploading) return;

    // Check if we just completed a successful upload
    const wasSuccessfulUpload = state.step === 'complete' && state.successCount > 0;

    setState({
      step: 'select',
      file: null,
      validRows: [],
      errors: [],
      totalRows: 0,
      uploadProgress: 0,
      successCount: 0,
      failureCount: 0,
      newCategories: [],
      currentProductIndex: 0
    });

    onOpenChange(false);

    // Trigger refresh if upload was successful
    if (wasSuccessfulUpload) {
      // Small delay to ensure dialog closes first
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    // Prevent dialog from closing during upload
    if (!isUploading) {
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
          Upload CSV File
        </p>
        <p className="text-sm text-gray-500">
          Drag and drop your CSV file here, or click to browse
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Supports all date formats | Accepts negative values | Use quotes for fields with commas
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
            <div className="text-2xl font-bold text-green-600">{state.validRows.length}</div>
            <p className="text-xs text-muted-foreground">Valid products</p>
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
            <div className="text-2xl font-bold text-blue-600">{state.totalRows}</div>
            <p className="text-xs text-muted-foreground">Total rows</p>
          </CardContent>
        </Card>
      </div>

      {state.newCategories.length > 0 && (
        <Alert>
          <Plus className="h-4 w-4" />
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
              onClick={() => generateErrorLogCSV(state.errors)}
            >
              <Download className="h-3 w-3 mr-1" />
              Download error log
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={() => setState(prev => ({ ...prev, step: 'select' }))}>
          Back
        </Button>
        <Button
          onClick={handleConfirmUpload}
          disabled={state.validRows.length === 0}
        >
          Upload {state.validRows.length} Products
          {state.newCategories.length > 0 && ` & Create ${state.newCategories.length} Categories`}
        </Button>
      </div>
    </div>
  );

  const renderUploading = () => (
    <BulkOperationProgress
      title="Uploading Products..."
      currentCount={state.currentProductIndex}
      totalCount={state.validRows.length}
      status="processing"
    />
  );

  const renderComplete = () => (
    <div className="space-y-4">
      <BulkOperationProgress
        title="Upload Complete!"
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
            Upload Products via CSV
          </DialogTitle>
          <DialogDescription>
            Upload multiple products at once using a CSV file (DD/MM/YYYY date format)
          </DialogDescription>
        </DialogHeader>

        {state.step === 'select' && renderFileSelection()}
        {state.step === 'preview' && renderPreview()}
        {state.step === 'uploading' && renderUploading()}
        {state.step === 'complete' && renderComplete()}
      </DialogContent>
    </Dialog>
  );
};

export default CSVUploadDialog;
