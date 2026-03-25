"use client";
import React, { useState, useEffect, useRef, DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Product, ProductCategory, ProductFormData } from '@/types';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { toast } from 'sonner';
import { Trash2, Upload, ExternalLink, Loader2, Zap, Calendar, Printer } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useProductImage } from '@/hooks/useProductImage';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Switch } from '@/components/ui/switch';

interface ProductFormProps {
  initialData?: Product;
  categories: ProductCategory[];
  onProductSubmit: (data: ProductFormData & { autoPrintLabel?: boolean, printQuantity?: number }) => void;
  isLoading: boolean;
}

// Extended form data type to handle quantity as string or number
interface ExtendedProductFormData extends Omit<ProductFormData, 'quantity'> {
  quantity: number | string;
  createdAt?: Date;
  autoPrintLabel?: boolean;
  printQuantity: number;
}

import { useProductDraft } from '@/hooks/useProductDraft';

const ProductForm: React.FC<ProductFormProps> = ({
  initialData,
  categories,
  onProductSubmit,
  isLoading,
}) => {
  const router = useRouter();
  const { settings } = useBusinessSettings();
  const { user } = useAuth();
  const { uploadProductImage, compressImage } = useProductImage(user?.id);
  const { hasDraft, saveDraft, loadDraft, clearDraft } = useProductDraft();
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  // Function to get initial form data
  const getInitialFormData = (productData?: Product): ExtendedProductFormData => {
    if (productData) {
      // When editing/duplicating, use the product's data
      return {
        name: productData.name,
        barcode: productData.barcode || '',
        manufacturerBarcode: productData.manufacturerBarcode || '',
        description: productData.description || '',
        category: productData.categoryId || productData.category || '',
        quantity: productData.quantity ?? 0,
        costPrice: productData.costPrice,
        sellingPrice: productData.sellingPrice,
        supplier: productData.supplier || '',
        minimumStock: productData.minimumStock,
        imageFile: null,
        imageUrl: productData.imageUrl,
        createdAt: productData.createdAt || new Date(), // Use product's creation date
        printQuantity: 1,
        autoPrintLabel: false
      };
    } else {
      // When creating new product, use defaults
      return {
        name: '',
        barcode: '',
        manufacturerBarcode: '',
        description: '',
        category: '',
        quantity: 0,
        costPrice: undefined,
        sellingPrice: undefined,
        supplier: '',
        minimumStock: undefined,
        imageFile: null,
        imageUrl: null,
        createdAt: new Date(), // Default to current date for new products
        autoPrintLabel: true, // Default to true for new products as requested
        printQuantity: 1
      };
    }
  };

  // Form state
  const [formData, setFormData] = useState<ExtendedProductFormData>(() =>
    getInitialFormData(initialData)
  );

  // Load draft on mount for new products
  useEffect(() => {
    if (!initialData && hasDraft) {
      const draft = loadDraft();
      if (draft) {
        setFormData(prev => ({
          ...prev,
          ...draft.formData,
          createdAt: new Date(draft.formData.createdAt)
        }));
        if (draft.formData.imageUrl) {
          setImagePreview(draft.formData.imageUrl);
        }
        toast.info('Restored your unsaved product draft');
      }
    }
  }, [initialData]); // Run once on mount

  // Auto-save logic
  const autoSave = React.useCallback((isPersistent = true) => {
    if (!initialData && !isLoading) {
      const hasData = (formData.name?.trim() || '') || 
                      (formData.barcode?.trim() || '') || 
                      (formData.description?.trim() || '') || 
                      (formData.sellingPrice !== undefined && formData.sellingPrice > 0);
      
      if (hasData) {
        saveDraft(formData, isPersistent);
      }
    }
  }, [formData, initialData, isLoading, saveDraft]);

  useEffect(() => {
    if (initialData) return;

    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    
    // Fast session save
    autoSave(false);

    // Debounced persistent save
    autoSaveTimeoutRef.current = setTimeout(() => autoSave(true), 2000);

    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      autoSave(true);
    };
  }, [autoSave, initialData]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageChanged, setImageChanged] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [compressionStats, setCompressionStats] = useState<{
    originalSize: number;
    compressedSize: number;
    reduction: number;
  } | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      console.log('ProductForm - Setting form data from initialData:', initialData);
      console.log('ProductForm - InitialData createdAt:', initialData.createdAt);

      const newFormData = getInitialFormData(initialData);
      setFormData(newFormData);

      console.log('ProductForm - Form data set to:', newFormData);
      console.log('ProductForm - Form createdAt set to:', newFormData.createdAt);

      if (initialData.imageUrl) {
        setImagePreview(initialData.imageUrl);
      }
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    let processedValue: any = value;

    // Convert numeric fields to numbers or undefined if empty
    if (
      name === 'quantity' ||
      name === 'minimumStock' ||
      name === 'costPrice' ||
      name === 'sellingPrice'
    ) {
      // For quantity, allow empty string and convert to number when not empty
      if (name === 'quantity') {
        if (value === '') {
          processedValue = ''; // Keep as empty string to allow deletion
        } else {
          processedValue = parseFloat(value) || 0; // Allow decimal values
        }
        console.log('Quantity changed to:', processedValue);
      } else {
        processedValue = value === '' ? undefined : parseFloat(value);
      }
    }

    setFormData({
      ...formData,
      [name]: processedValue
    });

    // Clear error when field is edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const handleCategoryChange = (value: string) => {
    setFormData({
      ...formData,
      category: value
    });

    if (errors.category) {
      setErrors({
        ...errors,
        category: ''
      });
    }

    // Focus description field after category selection
    setTimeout(() => {
      document.getElementById('description')?.focus();
    }, 100);
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      // Set time to Noon (12:00:00) to avoid timezone issues where midnight UTC becomes 3 AM EAT
      const adjustedDate = new Date(date);
      adjustedDate.setHours(12, 0, 0, 0);

      console.log('ProductForm - Date changed to:', adjustedDate);
      setFormData({
        ...formData,
        createdAt: adjustedDate
      });
      setIsCalendarOpen(false);
    }
  };

  const processImageFile = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) { // 20MB
      toast.error('Image file is too large. Maximum size is 20MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed.');
      return;
    }

    setCompressing(true);
    setCompressionStats(null);

    try {
      // Use the compressImage function from the properly called hook
      const compressedFile = await compressImage(file);

      // Calculate compression stats
      const reduction = ((file.size - compressedFile.size) / file.size * 100);
      setCompressionStats({
        originalSize: file.size,
        compressedSize: compressedFile.size,
        reduction: reduction
      });

      setFormData({
        ...formData,
        imageFile: compressedFile
      });

      setImageChanged(true);

      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);

      toast.success(`Image optimized to ${(compressedFile.size / 1024).toFixed(1)}KB!`);
    } catch (error) {
      console.error('Error compressing image:', error);
      toast.error('Failed to process image. Please try again.');
    } finally {
      setCompressing(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      processImageFile(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processImageFile(file);
    }
  };

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
    setFormData({
      ...formData,
      imageFile: null,
      imageUrl: null  // Clear the image URL when removing image
    });
    setImagePreview(null);
    setImageChanged(true);
    setCompressionStats(null);

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    // Category is optional, so no validation needed

    // Note: Initial stock can now be negative to handle cases like backorders or inventory deficits
    // Removed validation that prevented negative initial stock values

    if (formData.costPrice !== undefined && formData.costPrice < 0) {
      newErrors.costPrice = 'Cost price cannot be negative';
    }

    if (formData.sellingPrice !== undefined && formData.sellingPrice < 0) {
      newErrors.sellingPrice = 'Selling price cannot be negative';
    }

    if (formData.minimumStock !== undefined && formData.minimumStock < 0) {
      newErrors.minimumStock = 'Minimum stock cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('ProductForm - Form data before validation:', formData);
    console.log('ProductForm - Quantity value:', formData.quantity, 'Type:', typeof formData.quantity);
    console.log('ProductForm - CreatedAt value:', formData.createdAt);

    if (!validateForm()) {
      toast.error('Please correct the errors in the form');
      return;
    }

    let finalImageUrl = formData.imageUrl;

    try {
      // Handle image upload separately if needed
      if (imageChanged && formData.imageFile) {
        setUploading(true);
        toast.info('Uploading optimized image...');
        finalImageUrl = await uploadProductImage(formData.imageFile);

        if (!finalImageUrl) {
          setUploading(false);
          return; // Stop if image upload failed - error is already shown by the hook
        }
        toast.success('Image uploaded successfully!');
      } else if (imageChanged && !formData.imageFile) {
        // Image was removed
        finalImageUrl = null;
      }

      // Prepare final submission data - convert empty string quantity to 0
      const finalQuantity = typeof formData.quantity === 'string' ? (formData.quantity === '' ? 0 : Number(formData.quantity)) : formData.quantity;
      const submissionData = {
        ...formData,
        imageUrl: finalImageUrl,
        quantity: finalQuantity // Convert to number for submission
      };

      console.log('ProductForm - Final submission data:', submissionData);
      console.log('ProductForm - Final quantity being submitted:', submissionData.quantity);
      console.log('ProductForm - Final createdAt being submitted:', submissionData.createdAt);

      // Submit form with final image URL
      await onProductSubmit(submissionData);
      
      // Clear draft after successful submission
      if (!initialData) {
        clearDraft();
      }
    } catch (error) {
      console.error('Error handling form submission:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const isSubmitting = isLoading || uploading;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{initialData ? 'Edit Product' : 'New Product'}</CardTitle>
        <CardDescription>Enter the product details below. Only name is required.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="grid gap-3">
                <Label htmlFor="name">Product Name*</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const categorySelect = document.querySelector('[role="combobox"]') as HTMLElement;
                      categorySelect?.focus();
                    }
                  }}
                  placeholder="Enter product name"
                  className={errors.name ? 'border-red-500' : ''}
                  disabled={isSubmitting}
                />
                {errors.name && (
                  <p className="text-red-500 text-xs">{errors.name}</p>
                )}
              </div>

              <div className="grid gap-3">
                <Label htmlFor="manufacturerBarcode">Manufacturer Barcode (Optional)</Label>
                <Input
                  id="manufacturerBarcode"
                  name="manufacturerBarcode"
                  value={formData.manufacturerBarcode}
                  onChange={handleChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const categorySelect = document.querySelector('[role="combobox"]') as HTMLElement;
                      categorySelect?.focus();
                    }
                  }}
                  placeholder="Enter manufacturer barcode (if any)"
                  disabled={isSubmitting}
                />
              </div>


              <div className="grid gap-3">
                <Label htmlFor="category">Category (Optional)</Label>
                <p className="text-sm text-muted-foreground">
                  Need to create a new category? Go to the{' '}
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-blue-600 underline"
                    onClick={() => router.push(`/agency/categories?returnTo=${encodeURIComponent(window.location.pathname)}`)}
                    disabled={isSubmitting}
                  >
                    Categories page <ExternalLink className="h-3 w-3 ml-1 inline" />
                  </Button>
                  {' '}first, then return here to select it.
                </p>
                <Select
                  value={formData.category}
                  onValueChange={handleCategoryChange}
                  disabled={isSubmitting}
                >
                  <SelectTrigger
                    className={cn(errors.category ? 'border-red-500' : '')}
                    onKeyDown={(e) => {
                      console.log('SelectTrigger keydown:', e.key, 'Category:', formData.category);
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Enter pressed on SelectTrigger, focusing description');
                        // Always move to description when Enter is pressed
                        setTimeout(() => {
                          const descriptionField = document.getElementById('description');
                          console.log('Description field found:', !!descriptionField);
                          descriptionField?.focus();
                        }, 50);
                        return false;
                      } else if (e.key === 'Escape') {
                        // On Escape, also move to description
                        setTimeout(() => {
                          document.getElementById('description')?.focus();
                        }, 50);
                      }
                    }}
                  >
                    <SelectValue placeholder="Select category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.length > 0 ? (
                      categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground">
                        No categories available
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-red-500 text-xs">{errors.category}</p>
                )}
              </div>

              <div className="grid gap-3">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      document.getElementById('supplier')?.focus();
                    }
                  }}
                  placeholder="Enter product description"
                  className="resize-none h-32"
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="supplier">Supplier</Label>
                <Input
                  id="supplier"
                  name="supplier"
                  value={formData.supplier}
                  onChange={handleChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      document.getElementById('quantity')?.focus();
                    }
                  }}
                  placeholder="Enter supplier name"
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid gap-3">
                <Label>Created Date</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.createdAt && "text-muted-foreground",
                        initialData && "cursor-not-allowed opacity-60"
                      )}
                      disabled={isSubmitting || !!initialData}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {formData.createdAt ? format(formData.createdAt, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={formData.createdAt}
                      onSelect={handleDateChange}
                      disabled={(date) => date > new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {initialData && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                    <div className="text-amber-800 text-sm">
                      <strong>Note:</strong> To edit the creation date, please edit the initial stock history entry for this product through the inventory stock history.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid gap-3">
                <Label htmlFor="imageFile">Product Image</Label>
                <div className="flex flex-col items-center space-y-4">
                  {imagePreview ? (
                    <div className="relative w-full">
                      <img
                        src={imagePreview}
                        alt="Product preview"
                        className="w-full h-40 object-contain border rounded-md"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 rounded-full h-8 w-8"
                        onClick={removeImage}
                        disabled={isSubmitting || compressing}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      {/* Compression stats display */}
                      {compressionStats && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                          <div className="flex items-center gap-2 text-green-700">
                            <Zap className="h-4 w-4" />
                            <span className="text-xs font-medium">
                              Optimized to {(compressionStats.compressedSize / 1024).toFixed(1)}KB
                            </span>
                          </div>
                          <div className="text-xs text-green-600 mt-1">
                            {(compressionStats.originalSize / 1024).toFixed(1)}KB → {(compressionStats.compressedSize / 1024).toFixed(1)}KB ({compressionStats.reduction.toFixed(1)}% reduction)
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "border-2 border-dashed rounded-md p-8 w-full flex flex-col items-center justify-center cursor-pointer transition-colors",
                        isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400",
                        (isSubmitting || compressing) && "opacity-50 cursor-not-allowed"
                      )}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={!(isSubmitting || compressing) ? handleImageUploadClick : undefined}
                    >
                      {compressing ? (
                        <>
                          <Loader2 className="h-10 w-10 text-blue-500 mb-2 animate-spin" />
                          <p className="text-sm text-gray-500">Optimizing image...</p>
                          <p className="text-xs text-gray-400">Compressing to under 15KB</p>
                        </>
                      ) : uploading ? (
                        <>
                          <Loader2 className="h-10 w-10 text-blue-500 mb-2 animate-spin" />
                          <p className="text-sm text-gray-500">Uploading image...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="h-10 w-10 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-gray-400">PNG, JPG, GIF up to 20MB</p>
                          <p className="text-xs text-blue-500 mt-1">
                            ⚡ Auto Image compression for instant loading
                          </p>
                        </>
                      )}
                    </div>
                  )}
                  <input
                    type="file"
                    id="imageFile"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={isSubmitting || compressing}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-3">
                  <Label htmlFor="quantity">Initial Stock</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={handleChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('minimumStock')?.focus();
                      }
                    }}
                    className={errors.quantity ? 'border-red-500' : ''}
                    disabled={isSubmitting}
                    placeholder="Enter initial stock quantity (can be negative)"
                  />
                  {errors.quantity && (
                    <p className="text-red-500 text-xs">{errors.quantity}</p>
                  )}
                  {initialData && (
                    <p className="text-xs text-muted-foreground">
                      Current stock: {initialData.quantity} units
                    </p>
                  )}
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="minimumStock">Minimum Stock Level</Label>
                  <Input
                    id="minimumStock"
                    name="minimumStock"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.minimumStock === undefined ? '' : formData.minimumStock}
                    onChange={handleChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('costPrice')?.focus();
                      }
                    }}
                    className={errors.minimumStock ? 'border-red-500' : ''}
                    disabled={isSubmitting}
                  />
                  {errors.minimumStock && (
                    <p className="text-red-500 text-xs">{errors.minimumStock}</p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-3">
                  <Label htmlFor="costPrice">Cost Price</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                      {settings.currency}
                    </span>
                    <Input
                      id="costPrice"
                      name="costPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.costPrice === undefined ? '' : formData.costPrice}
                      onChange={handleChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          document.getElementById('sellingPrice')?.focus();
                        }
                      }}
                      className={`rounded-l-none ${errors.costPrice ? 'border-red-500' : ''}`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.costPrice && (
                    <p className="text-red-500 text-xs">{errors.costPrice}</p>
                  )}
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="sellingPrice">Selling Price</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                      {settings.currency}
                    </span>
                    <Input
                      id="sellingPrice"
                      name="sellingPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.sellingPrice === undefined ? '' : formData.sellingPrice}
                      onChange={handleChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const submitButton = document.querySelector('button[type="submit"]') as HTMLElement;
                          submitButton?.focus();
                        }
                      }}
                      className={`rounded-l-none ${errors.sellingPrice ? 'border-red-500' : ''}`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.sellingPrice && (
                    <p className="text-red-500 text-xs">{errors.sellingPrice}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-3">
                <p className="text-sm text-gray-500">
                  * Required fields | Initial Stock: The starting quantity for this product
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => router.push('/agency/inventory')}
              disabled={isSubmitting || compressing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || compressing}
              className="min-w-[100px]"
            >
              {compressing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Optimizing...
                </>
              ) : isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploading ? 'Uploading...' : 'Saving...'}
                </>
              ) : (
                initialData ? 'Update Product' : 'Create Product'
              )}
            </Button>
          </div>

          {!initialData && (
            <div className="flex flex-col md:flex-row items-center justify-end gap-4 pt-3 border-t">
              {formData.autoPrintLabel && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="printQuantity" className="text-sm text-muted-foreground whitespace-nowrap">
                    Quantity to print:
                  </Label>
                  <Input
                    id="printQuantity"
                    type="number"
                    min="1"
                    className="w-20 h-8"
                    value={formData.printQuantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, printQuantity: parseInt(e.target.value) || 1 }))}
                    disabled={isSubmitting}
                  />
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Printer className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="autoPrint" className="text-sm font-medium cursor-pointer">
                  Auto-print barcode label
                </Label>
                <Switch
                  id="autoPrint"
                  checked={formData.autoPrintLabel}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoPrintLabel: checked }))}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default ProductForm;
