"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import ProductForm from "@/components/inventory/ProductForm";
import { useAuth } from "@/components/auth/AuthProvider";
import { useBusiness } from "@/contexts/BusinessContext";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { Product, ProductFormData } from "@/types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { formatNumber } from "@/lib/utils";
import { useProfiles } from "@/contexts/ProfileContext";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { getProductAction } from "@/app/actions/products";

const NewProduct = () => {
  const params = useParams();
  const id = params?.id as string;
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();
  const {
    products,
    isLoading: productsLoading,
    createProduct,
    updateProduct,
    loadProducts,
    refetch,
  } = useProducts(user?.id, 1); // Don't load full list on New/Edit page
  const { categories, isLoading: categoriesLoading } = useCategories(user?.id);
  const [product, setProduct] = useState<Product | undefined>(undefined);

  // Check for duplicate data from search params (Next.js doesn't have route state like React Router)
  const duplicateId = searchParams?.get("duplicateId");
  const [duplicateData, setDuplicateData] = useState<any>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const { settings } = useBusinessSettings();
  const { hasPermission, isLoading: profilesLoading } = useProfiles();

  const loadProductData = async () => {
    const targetId = id || duplicateId;
    if (targetId && currentBusiness?.id) {
      // If refreshing or duplicating, set state
      setIsRefreshing(true);

      // Clear any previous error
      setLoadError(null);

      // Load specific product data by ID (FAST)
      const foundProduct = await getProductAction(targetId, currentBusiness.id);

      if (foundProduct) {
        if (id) {
          setProduct(foundProduct);
          setDataLoaded(true);
        } else {
          // Duplicating
          setDuplicateData({
            name: `${foundProduct.name} (Copy)`,
            description: foundProduct.description,
            category: foundProduct.category,
            supplier: foundProduct.supplier,
            costPrice: foundProduct.costPrice,
            sellingPrice: foundProduct.sellingPrice,
            imageUrl: foundProduct.imageUrl,
            createdAt: foundProduct.createdAt,
            minimumStock: foundProduct.minimumStock,
          });
          setDataLoaded(true);
        }
      } else {
        setLoadError(
          "Product not found. It may have been deleted or you may not have permission to view it.",
        );
        toast.error("Product not found");
      }

      setIsRefreshing(false);
    } else {
      // For new product mode
      setDataLoaded(true);
    }
  };

  useEffect(() => {
    if ((id || duplicateId) && !dataLoaded && currentBusiness?.id) {
      loadProductData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, duplicateId, dataLoaded, currentBusiness?.id]);

  useEffect(() => {
    if (!id && !duplicateId) {
      setDataLoaded(true);
    }
  }, [id, duplicateId]);

  const handleRefresh = async () => {
    toast.info("Refreshing product data...");
    setDataLoaded(false);
    await loadProductData();
  };

  const handleProductSubmit = async (
    formData: ProductFormData & {
      createdAt?: Date;
      autoPrintLabel?: boolean;
      printQuantity?: number;
    },
  ) => {
    setIsSubmitting(true);

    try {
      if (id && product) {
        // ... (update existing product logic - unchanged)
        const updateData = {
          name: formData.name,
          description: formData.description || "",
          categoryId: formData.category || null,
          quantity: formData.quantity,
          costPrice: formData.costPrice ?? 0,
          sellingPrice: formData.sellingPrice ?? 0,
          supplier: formData.supplier || "",
          minimumStock: formData.minimumStock ?? 0,
          imageUrl: formData.imageUrl || null,
          createdAt: formData.createdAt,
          barcode: formData.barcode,
          manufacturerBarcode: formData.manufacturerBarcode,
        };

        const result = await updateProduct(id, updateData);

        if (result.success && result.data) {
          toast.success("Product updated successfully");
          router.push(`/agency/inventory/${id}`);
        } else {
          const errorMsg = result.error || "Failed to update product";
          toast.error(errorMsg);
        }
      } else {
        // Create new product
        if (!user?.id) {
          toast.error("You must be logged in to create products");
          return;
        }

        const createData = {
          id: "",
          name: formData.name,
          description: formData.description || "",
          categoryId: formData.category || null,
          quantity: formData.quantity,
          costPrice: formData.costPrice ?? 0,
          sellingPrice: formData.sellingPrice ?? 0,
          supplier: formData.supplier || "",
          minimumStock: formData.minimumStock ?? 0,
          imageUrl: formData.imageUrl || null,
          createdAt: formData.createdAt || new Date(),
          updatedAt: new Date(),
          barcode: formData.barcode || "",
          manufacturerBarcode: formData.manufacturerBarcode || "",
        };

        const result = await createProduct(createData);

        if (result.success && result.data) {
          const newProduct: Product = result.data;
          toast.success("Product created successfully");

          // Auto-print label if requested
          if (formData.autoPrintLabel && newProduct.barcode) {
            try {
              const printQty = formData.printQuantity || 1;
              toast.info(
                `Sending ${printQty} barcode label${
                  printQty > 1 ? "s" : ""
                } to printer...`,
              );
              await fetch("http://localhost:5000/print/label", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                mode: "cors",
                body: JSON.stringify({
                  PrinterName: settings.defaultPrinterName || "Label Printer",
                  Content: `SIZE 50 mm, 30 mm\nGAP 3 mm, 0 mm\nCLS\nTEXT 15,20,"3",0,1,1,"${
                    newProduct.name
                  }"\nBARCODE 15,70,"128",60,1,0,2,2,"${
                    newProduct.barcode
                  }"\nTEXT 15,180,"3",0,1,1,"${
                    settings.currency
                  } ${formatNumber(
                    newProduct.sellingPrice,
                  )}"\nPRINT ${printQty}\n`,
                }),
              });
              toast.success("Barcode label printed");
            } catch (err) {
              console.error("Failed to auto-print label:", err);
              toast.error(
                "Failed to print label. Is the Printer Bridge running?",
              );
            }
          }

          router.push(`/agency/inventory/${newProduct.id}`);
        } else {
          // 🛡️ DATA INTEGRITY: Provide a clear error message from the backend (e.g. "Product with this name already exists")
          let errorMsg = result.error || "Failed to create product";
          
          // Try to parse JSON from djangoFetch's stringified error "400: {"name":["..."]}"
          if (errorMsg.includes("400: ")) {
            try {
              const jsonStr = errorMsg.split("400: ")[1];
              const errorData = JSON.parse(jsonStr);
              if (errorData.name) errorMsg = errorData.name[0];
              else if (errorData.non_field_errors) errorMsg = errorData.non_field_errors[0];
              else if (typeof errorData === 'object') errorMsg = Object.values(errorData)[0] as string;
            } catch (e) {
              console.warn("Failed to parse backend error details", e);
            }
          }
          
          toast.error(errorMsg);
        }
      }
    } catch (error) {
      console.error("Error submitting product:", error);
      toast.error("An error occurred while saving the product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading =
    productsLoading || categoriesLoading || isSubmitting || isRefreshing;

  // Determine initial data - use duplicateData if available, otherwise use product for edit mode
  const initialData = duplicateData
    ? ({
        ...duplicateData,
        quantity: 0, // Always start with 0 quantity for duplicates
        id: "", // No ID for new product
        itemNumber: "", // Will be auto-generated
        createdAt: new Date(), // Use current time for duplicate, not original product time
        updatedAt: new Date(),
        barcode: "", // Clear barcode to avoid unique constraint conflict
        manufacturerBarcode: "", // Clear manufacturer barcode as well
      } as Product)
    : product;

  // Permission Check
  const canEdit = id ? hasPermission("inventory", "edit") : true;
  const canCreate = !id ? hasPermission("inventory", "create") : true;

  if (profilesLoading || productsLoading || categoriesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!canEdit || !canCreate) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to{" "}
            {id ? "edit this product" : "create a new product"}. Please contact
            your administrator if you believe this is an error.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button
            onClick={() => router.push("/agency/inventory")}
            variant="outline">
            Back to Inventory
          </Button>
        </div>
      </div>
    );
  }

  // Don't render the form until we have loaded the data or determined we don't need to load it
  if (id && !dataLoaded && !loadError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/agency/inventory")}
            className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to Inventory
          </Button>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading product data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/agency/inventory")}
          className="flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Inventory
        </Button>

        {/* Add refresh button when in edit mode */}
        {id && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-1">
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Refreshing..." : "Refresh Data"}
          </Button>
        )}
      </div>

      {loadError ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-md">
          <h3 className="text-lg font-medium text-red-800 mb-2">
            Error Loading Product
          </h3>
          <p className="text-red-600">{loadError}</p>
          <Button
            className="mt-4"
            onClick={() => router.push("/agency/inventory")}>
            Return to Inventory
          </Button>
        </div>
      ) : (
        <ProductForm
          initialData={initialData}
          categories={categories}
          onProductSubmit={handleProductSubmit}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default NewProduct;
