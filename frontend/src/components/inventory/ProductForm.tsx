/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useEffect, useRef, DragEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Product, ProductCategory, ProductFormData } from "@/types";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { toast } from "sonner";
import {
  Trash2,
  Upload,
  ExternalLink,
  Loader2,
  Zap,
  Calendar,
  Printer,
  X,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useProductImage } from "@/hooks/useProductImage";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema, type ProductFormValues } from "@/lib/validations/product";
import { useProductDraft } from "@/hooks/useProductDraft";
import Image from "next/image";

interface ProductFormProps {
  initialData?: Product;
  categories: ProductCategory[];
  onProductSubmit: (
    data: ProductFormData & {
      autoPrintLabel?: boolean;
      printQuantity?: number;
    },
  ) => void;
  isLoading: boolean;
  draftData?: any;
  onClearDraft?: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({
  initialData,
  categories,
  onProductSubmit,
  isLoading,
  draftData,
  onClearDraft,
}) => {
  const router = useRouter();
  const { settings } = useBusinessSettings();
  const { user } = useAuth();
  const { uploadProductImage, compressImage } = useProductImage(user?.id);
  const { hasDraft, saveDraft, loadDraft, clearDraft } = useProductDraft();
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name || "",
      barcode: initialData?.barcode || "",
      manufacturerBarcode: initialData?.manufacturerBarcode || "",
      description: initialData?.description || "",
      category: initialData?.categoryId || initialData?.category || "",
      quantity: initialData?.quantity ?? 0,
      costPrice: initialData?.costPrice,
      sellingPrice: initialData?.sellingPrice,
      supplier: initialData?.supplier || "",
      minimumStock: initialData?.minimumStock,
      createdAt: initialData?.createdAt ? new Date(initialData.createdAt) : new Date(),
      autoPrintLabel: !initialData,
      printQuantity: 1,
      imageUrl: initialData?.imageUrl || null,
    },
  });

  const { watch, setValue, control, handleSubmit, reset, formState: { errors } } = form;
  const formValues = watch();

  // Load draft
  useEffect(() => {
    if (!initialData && draftData?.formData) {
      const isFormEmpty = !formValues.name?.trim() && !formValues.sellingPrice;
      if (isFormEmpty) {
        Object.keys(draftData.formData).forEach(key => {
          if (key === 'createdAt') {
            setValue(key as any, new Date(draftData.formData[key]));
          } else {
            setValue(key as any, draftData.formData[key]);
          }
        });
        if (draftData.formData.imageUrl) {
          setImagePreview(draftData.formData.imageUrl);
        }
      }
    }
  }, [initialData, draftData, setValue]);

  // Auto-save
  useEffect(() => {
    if (initialData || isLoading) return;
    const hasData = formValues.name?.trim() || formValues.sellingPrice;
    if (hasData) {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      saveDraft(formValues, false);
      autoSaveTimeoutRef.current = setTimeout(() => saveDraft(formValues, true), 2000);
    }
    return () => { if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current); };
  }, [formValues, initialData, isLoading, saveDraft]);

  const processImageFile = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Image file is too large. Max 20MB.");
      return;
    }
    setCompressing(true);
    try {
      const compressedFile = await compressImage(file);
      const reduction = ((file.size - compressedFile.size) / file.size) * 100;
      setCompressionStats({
        originalSize: file.size,
        compressedSize: compressedFile.size,
        reduction,
      });
      setValue("imageUrl", null); // Clear existing URL if new file added
      setImageChanged(true);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(compressedFile);
      (form as any)._imageFile = compressedFile; // Store for submission
      toast.success("Image optimized!");
    } catch (error) {
      toast.error("Image processing failed.");
    } finally {
      setCompressing(false);
    }
  };

  const onFormSubmit = async (values: ProductFormValues) => {
    let finalImageUrl = values.imageUrl;
    try {
      const imageFile = (form as any)._imageFile;
      if (imageChanged && imageFile) {
        setUploading(true);
        finalImageUrl = await uploadProductImage(imageFile);
        if (!finalImageUrl) return;
      } else if (imageChanged && !imageFile) {
        finalImageUrl = null;
      }

      await onProductSubmit({
        ...values,
        imageUrl: finalImageUrl,
      } as any);

      if (!initialData) {
        if (onClearDraft) onClearDraft();
        else clearDraft();
      }
    } catch (error) {
      toast.error("Submission failed.");
    } finally {
      setUploading(false);
    }
  };

  const isSubmitting = isLoading || uploading;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{initialData ? "Edit Product" : "New Product"}</CardTitle>
        <CardDescription>Enter product details. Only name is required.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <FormField
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name*</FormLabel>
                      <FormControl><Input {...field} placeholder="Enter product name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="manufacturerBarcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manufacturer Barcode (Optional)</FormLabel>
                      <FormControl><Input {...field} placeholder="Scan or enter barcode" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl><Textarea {...field} className="h-24 resize-none" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="createdAt"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Created Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")} disabled={!!initialData}>
                              <Calendar className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Product Image</Label>
                  <div 
                    className={cn(
                      "border-2 border-dashed rounded-lg p-4 h-48 flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden",
                      isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"
                    )}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) processImageFile(e.dataTransfer.files[0]); }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {imagePreview ? (
                      <>
                        <Image src={imagePreview} alt="Preview" fill className="object-contain p-2" />
                        <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 rounded-full" onClick={(e) => { e.stopPropagation(); setImagePreview(null); setImageChanged(true); (form as any)._imageFile = null; }}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <div className="text-center">
                        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">Click or drag image to upload</p>
                      </div>
                    )}
                    {compressing && <div className="absolute inset-0 bg-background/50 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && processImageFile(e.target.files[0])} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Initial Stock</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="minimumStock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Stock Level</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={control}
                    name="costPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost Price ({settings.currency})</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="sellingPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Selling Price ({settings.currency})</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {!initialData && (
                  <div className="space-y-4 pt-4 border-t">
                    <FormField
                      control={control}
                      name="autoPrintLabel"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">Auto-print barcode</FormLabel>
                          </div>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )}
                    />

                    {formValues.autoPrintLabel && (
                      <FormField
                        control={control}
                        name="printQuantity"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between">
                            <FormLabel className="text-xs">Print Quantity</FormLabel>
                            <FormControl><Input type="number" {...field} className="w-20 h-8" /></FormControl>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || compressing}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {initialData ? "Update Product" : "Create Product"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ProductForm;
