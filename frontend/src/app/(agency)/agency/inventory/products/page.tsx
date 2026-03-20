"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Plus,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  ArrowLeft,
  Printer,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useBusiness } from "@/contexts/BusinessContext";
import InventoryTable from "@/components/inventory/InventoryTable";
import InventoryFilters from "@/components/inventory/InventoryFilters";
import InventoryStats from "@/components/inventory/InventoryStats";
import { useProducts } from "@/hooks/useProducts";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatNumber } from "@/lib/utils";
import { exportProductsForUpdate } from "@/utils/exportProductsForUpdate";
import { exportProductsToCSV } from "@/utils/exportProductsToCSV";
import { exportProductsToPDF } from "@/utils/exportProductsToPDF";
import LoadingSpinner from "@/components/LoadingSpinner";
import BulkDeleteDialog from "@/components/inventory/BulkDeleteDialog";
import CSVUploadDialog from "@/components/inventory/CSVUploadDialog";
import CSVUpdateDialog from "@/components/inventory/CSVUpdateDialog";
import BulkPrintDialog from "@/components/inventory/BulkPrintDialog";
import BarcodeExportDialog, {
  BarcodeExportConfig,
} from "@/components/inventory/BarcodeExportDialog";
import { useBulkProducts } from "@/hooks/useBulkProducts";
import { generateProductCSVTemplate } from "@/utils/csvTemplate";
import { useCategories } from "@/hooks/useCategories";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SortField } from "@/components/inventory/InventoryTable";
import { Product } from "@/types";
import {
  getProductStatsAction,
  getAllProductsAction,
} from "@/app/actions/products";
import { exportBulkBarcodesToPDF } from "@/utils/exportBarcodeToPDF";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

import { useProfiles } from "@/contexts/ProfileContext";

type SortOrder = "asc" | "desc";

const Products = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { currentBusiness, isLoading: businessLoading } = useBusiness();
  const { hasPermission } = useProfiles();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const canCreate = hasPermission("inventory", "create");
  const canEdit = hasPermission("inventory", "edit");
  const canDelete = hasPermission("inventory", "delete");
  const canView = hasPermission("inventory", "view");

  const {
    products,
    filteredProducts,
    isLoading,
    loadProducts,
    filters,
    setFilters,
    deleteProduct,
    updateProduct,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalCount,
    refetch,
    isFetching,
  } = useProducts(user?.id, 50);

  const { categories } = useCategories(user?.id);
  const { bulkCreateProducts } = useBulkProducts();
  const { settings } = useBusinessSettings();

  // Bulk actions state
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    new Set(),
  );
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkPrintOpen, setBulkPrintOpen] = useState(false);
  const [productsToPrint, setProductsToPrint] = useState<Product[]>([]);
  const [csvUploadOpen, setCsvUploadOpen] = useState(false);
  const [csvUpdateOpen, setCsvUpdateOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExportingBarcodes, setIsExportingBarcodes] = useState(false);
  const [barcodeExportOpen, setBarcodeExportOpen] = useState(false);
  const [productsToExport, setProductsToExport] = useState<Product[]>([]);
  const [deletionProgress, setDeletionProgress] = useState<
    { current: number; total: number } | undefined
  >(undefined);
  const [printProgress, setPrintProgress] = useState<
    { current: number; total: number } | undefined
  >(undefined);

  // Add sorting state
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Global totals (all products, not just current page)
  const [totalCostValueAll, setTotalCostValueAll] = useState<
    number | undefined
  >(undefined);
  const [lowStockAll, setLowStockAll] = useState<number | undefined>(undefined);
  const [outOfStockAll, setOutOfStockAll] = useState<number | undefined>(
    undefined,
  );
  const [totalStockValueAll, setTotalStockValueAll] = useState<
    number | undefined
  >(undefined);

  // Lightweight aggregate: fetch only needed columns and cache for 5 minutes to avoid slowing the UI
  useEffect(() => {
    let cancelled = false;
    const loadTotals = async () => {
      if (!user?.id || !currentBusiness?.id) return;

      const cacheKey = `allProductsStats_${currentBusiness.id}`;
      const cachedRaw = localStorage.getItem(cacheKey);
      try {
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw) as {
            costValue: number;
            lowStock: number;
            outOfStock: number;
            stockValue: number;
            ts: number;
          };
          if (Date.now() - cached.ts < 5 * 60 * 1000) {
            setTotalCostValueAll(cached.costValue);
            setLowStockAll(cached.lowStock);
            setOutOfStockAll(cached.outOfStock);
            setTotalStockValueAll(cached.stockValue);
            return;
          }
        }
      } catch (e) {
        console.error("Error reading localStorage", e);
      }

      const stats = await getProductStatsAction(currentBusiness.id);

      if (!cancelled) {
        setTotalCostValueAll(stats.costValue);
        setLowStockAll(stats.lowStock);
        setOutOfStockAll(stats.outOfStock);
        setTotalStockValueAll(stats.stockValue);

        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              ...stats,
              ts: Date.now(),
            }),
          );
        } catch (e) {
          console.error("Error writing localStorage", e);
        }
      }
    };
    // Run in the background; UI uses page values until ready
    loadTotals();
    return () => {
      cancelled = true;
    };
  }, [user?.id, currentBusiness?.id]);

  // Memoize sorted and filtered products
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "category":
          comparison = a.category.localeCompare(b.category);
          break;
        case "quantity":
          comparison = a.quantity - b.quantity;
          break;
        case "sellingPrice":
          comparison = a.sellingPrice - b.sellingPrice;
          break;
        case "costPrice":
          comparison = a.costPrice - b.costPrice;
          break;
        case "itemNumber":
          comparison = a.itemNumber.localeCompare(b.itemNumber);
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [filteredProducts, sortField, sortOrder]);

  const handleRefresh = async () => {
    await refetch();
    setSelectedProductIds(new Set());
    toast({
      title: "Products refreshed",
      description: "Your product list has been updated.",
    });
  };

  // Fetch all products for export (bypassing pagination)
  const fetchAllProductsForExport = async (): Promise<Product[]> => {
    if (!user?.id || !currentBusiness?.id) return [];

    try {
      const rawProducts = await getAllProductsAction(
        user.id,
        currentBusiness.id,
      );
      let formattedProducts = rawProducts as unknown as Product[];

      // Apply the same filters as the current view
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        formattedProducts = formattedProducts.filter(
          (p) =>
            p.name.toLowerCase().includes(searchTerm) ||
            (p.description || "").toLowerCase().includes(searchTerm) ||
            p.category.toLowerCase().includes(searchTerm) ||
            (p.supplier && p.supplier.toLowerCase().includes(searchTerm)) ||
            p.itemNumber.toLowerCase().includes(searchTerm),
        );
      }

      if (filters.category) {
        formattedProducts = formattedProducts.filter(
          (p) => p.category === filters.category,
        );
      }

      if (filters.stockStatus === "outOfStock") {
        formattedProducts = formattedProducts.filter((p) => p.quantity === 0);
      } else if (filters.stockStatus === "inStock") {
        formattedProducts = formattedProducts.filter((p) => p.quantity > 0);
      } else if (filters.stockStatus === "lowStock") {
        formattedProducts = formattedProducts.filter(
          (p) => p.quantity > 0 && p.quantity <= p.minimumStock,
        );
      }

      // Apply the same sorting as the UI
      return formattedProducts.sort((a, b) => {
        let comparison = 0;

        switch (sortField) {
          case "name":
            comparison = a.name.localeCompare(b.name);
            break;
          case "category":
            comparison = a.category.localeCompare(b.category);
            break;
          case "quantity":
            comparison = a.quantity - b.quantity;
            break;
          case "sellingPrice":
            comparison = a.sellingPrice - b.sellingPrice;
            break;
          case "costPrice":
            comparison = a.costPrice - b.costPrice;
            break;
          case "itemNumber":
            comparison = a.itemNumber.localeCompare(b.itemNumber);
            break;
        }

        return sortOrder === "asc" ? comparison : -comparison;
      });
    } catch (error) {
      console.error("Error fetching all products for export:", error);
      toast({
        title: "Export failed",
        description: "Failed to fetch products for export. Please try again.",
        variant: "destructive",
      });
      return [];
    }
  };

  const handleExportCSV = async () => {
    toast({
      title: "Preparing export...",
      description: "Fetching all products. Please wait.",
    });

    const allProducts = await fetchAllProductsForExport();

    if (allProducts.length > 0) {
      exportProductsToCSV(allProducts);
      toast({
        title: "Export successful",
        description: `${allProducts.length} products exported to CSV file.`,
      });
    } else {
      toast({
        title: "No products to export",
        description: "There are no products matching your current filters.",
        variant: "destructive",
      });
    }
  };

  const handleExportForUpdate = async () => {
    toast({
      title: "Preparing export...",
      description: "Fetching all products. Please wait.",
    });

    const allProducts = await fetchAllProductsForExport();

    if (allProducts.length > 0) {
      exportProductsForUpdate(allProducts);
      toast({
        title: "Export successful",
        description: `${allProducts.length} products exported for editing. Use this file with 'Update via CSV'.`,
      });
    } else {
      toast({
        title: "No products to export",
        description: "There are no products matching your current filters.",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = async () => {
    toast({
      title: "Preparing export...",
      description: "Fetching all products. Please wait.",
    });

    const allProducts = await fetchAllProductsForExport();

    if (allProducts.length > 0) {
      exportProductsToPDF(allProducts, settings);
      toast({
        title: "Export successful",
        description: `${allProducts.length} products exported to PDF file.`,
      });
    } else {
      toast({
        title: "No products to export",
        description: "There are no products matching your current filters.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadTemplate = () => {
    generateProductCSVTemplate();
    toast({
      title: "Template downloaded",
      description: "CSV template has been downloaded to your device.",
    });
  };

  const handleCSVUpload = async (products: any[]) => {
    try {
      await bulkCreateProducts(products);
      setCsvUploadOpen(false);
      await loadProducts();
    } catch (error) {
      console.error("CSV upload failed:", error);
      toast({
        title: "Upload failed",
        description:
          "There was an error uploading your products. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleToggleProductSelection = (productId: string) => {
    const newSelectedIds = new Set(selectedProductIds);
    if (newSelectedIds.has(productId)) {
      newSelectedIds.delete(productId);
    } else {
      newSelectedIds.add(productId);
    }
    setSelectedProductIds(newSelectedIds);
  };

  const handleToggleAllProducts = (productIds: string[]) => {
    if (selectedProductIds.size === productIds.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(productIds));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProductIds.size === 0) return;

    setIsDeleting(true);
    setDeletionProgress({ current: 0, total: selectedProductIds.size });

    let successCount = 0;
    let failureCount = 0;
    let currentCount = 0;

    try {
      for (const productId of selectedProductIds) {
        try {
          const success = await deleteProduct(productId);
          if (success) {
            successCount++;
          } else {
            failureCount++;
          }
        } catch (error) {
          failureCount++;
          console.error(`Error deleting product ${productId}:`, error);
        }

        currentCount++;
        setDeletionProgress({
          current: currentCount,
          total: selectedProductIds.size,
        });
      }

      setSelectedProductIds(new Set());

      if (successCount > 0) {
        toast({
          title: "Products deleted",
          description: `Successfully deleted ${successCount} product${
            successCount > 1 ? "s" : ""
          }`,
        });
      }

      if (failureCount > 0) {
        toast({
          title: "Some deletions failed",
          description: `${failureCount} product${
            failureCount > 1 ? "s" : ""
          } could not be deleted`,
          variant: "destructive",
        });
      }

      setBulkDeleteOpen(false);
      // Only refresh once at the end, after dialog is closed
      await loadProducts();
    } finally {
      setIsDeleting(false);
      setDeletionProgress(undefined);
    }
  };

  const handleOpenBulkPrint = async (all: boolean = false) => {
    if (all) {
      toast({
        title: "Preparing for bulk print...",
        description: "Fetching all products matching current filters.",
      });
      const allFiltered = await fetchAllProductsForExport();
      if (allFiltered.length === 0) {
        toast({
          title: "No products found",
          description:
            "There are no products matching your current filters to print.",
          variant: "destructive",
        });
        return;
      }
      setProductsToPrint(allFiltered);
    } else {
      if (selectedProductIds.size === 0) {
        toast({
          title: "No products selected",
          description: "Please select products to print or use 'Print All'.",
          variant: "destructive",
        });
        return;
      }
      setProductsToPrint(selectedProducts);
    }
    setBulkPrintOpen(true);
  };

  const handleConfirmBulkPrint = async (showPrice: boolean) => {
    if (productsToPrint.length === 0) return;

    setIsPrinting(true);
    setPrintProgress({ current: 0, total: productsToPrint.length });

    let successCount = 0;
    let failureCount = 0;

    try {
      for (const p of productsToPrint) {
        if (!p.barcode) {
          failureCount++;
          setPrintProgress((prev) =>
            prev ? { ...prev, current: prev.current + 1 } : undefined,
          );
          continue;
        }

        try {
          const priceText = showPrice
            ? `TEXT 15,180,"3",0,1,1,"${settings.currency} ${formatNumber(
                p.sellingPrice,
              )}"\n`
            : "";

          const response = await fetch("http://localhost:5000/print/label", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            mode: "cors",
            body: JSON.stringify({
              PrinterName: settings.defaultPrinterName || "Label Printer",
              Content: `SIZE 50 mm, 30 mm\nGAP 3 mm, 0 mm\nCLS\nTEXT 15,20,"3",0,1,1,"${p.name}"\nBARCODE 15,70,"128",60,1,0,2,2,"${p.barcode}"\n${priceText}PRINT 1\n`,
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            failureCount++;
          }
        } catch (err) {
          console.error(`Failed to print label for ${p.name}:`, err);
          failureCount++;
        }

        setPrintProgress((prev) =>
          prev ? { ...prev, current: prev.current + 1 } : undefined,
        );

        // Minor delay to prevent overwhelming the bridge/printer
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (successCount > 0) {
        toast({
          title: "Printing successful",
          description: `Sent ${successCount} labels to the printer.`,
        });
      }

      if (failureCount > 0) {
        toast({
          title: "Some labels failed",
          description: `${failureCount} labels could not be printed. Check your connection.`,
          variant: "destructive",
        });
      }

      setBulkPrintOpen(false);
    } finally {
      setIsPrinting(false);
      setPrintProgress(undefined);
    }
  };

  const handleBulkBarcodeExport = async (all: boolean = false) => {
    setIsExportingBarcodes(true);
    try {
      let productsToExport: Product[] = [];

      if (all) {
        toast({
          title: "Preparing barcode export...",
          description: "Fetching all products matching current filters.",
        });
        productsToExport = await fetchAllProductsForExport();
      } else {
        if (selectedProductIds.size === 0) {
          toast({
            title: "No products selected",
            description: "Please select products to export barcodes.",
            variant: "destructive",
          });
          return;
        }
        productsToExport = selectedProducts;
      }

      const productsWithBarcodes = productsToExport.filter((p) => p.barcode);

      if (productsWithBarcodes.length === 0) {
        toast({
          title: "No barcodes to export",
          description: "None of the selected products have barcodes.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Generating PDF...",
        description: `Exporting ${productsWithBarcodes.length} barcode${
          productsWithBarcodes.length > 1 ? "s" : ""
        }...`,
      });

      await exportBulkBarcodesToPDF(productsWithBarcodes, {
        showPrice: true,
        currency: settings.currency,
      });

      toast({
        title: "Export successful",
        description: `${productsWithBarcodes.length} barcode${
          productsWithBarcodes.length > 1 ? "s" : ""
        } exported to PDF.`,
      });

      if (productsToExport.length > productsWithBarcodes.length) {
        const skipped = productsToExport.length - productsWithBarcodes.length;
        toast({
          title: "Some products skipped",
          description: `${skipped} product${
            skipped > 1 ? "s" : ""
          } without barcodes were not included.`,
        });
      }
    } catch (error) {
      console.error("Barcode export failed:", error);
      toast({
        title: "Export failed",
        description: "Failed to export barcodes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExportingBarcodes(false);
    }
  };

  const handleOpenBarcodeExport = async (all: boolean = false) => {
    try {
      let products: Product[] = [];

      if (all) {
        toast({
          title: "Preparing barcode export...",
          description: "Fetching all products matching current filters.",
        });
        products = await fetchAllProductsForExport();
      } else {
        if (selectedProductIds.size === 0) {
          toast({
            title: "No products selected",
            description: "Please select products to export barcodes.",
            variant: "destructive",
          });
          return;
        }
        products = selectedProducts;
      }

      const productsWithBarcodes = products.filter((p) => p.barcode);

      if (productsWithBarcodes.length === 0) {
        toast({
          title: "No barcodes to export",
          description: "None of the selected products have barcodes.",
          variant: "destructive",
        });
        return;
      }

      setProductsToExport(productsWithBarcodes);
      setBarcodeExportOpen(true);
    } catch (error) {
      console.error("Failed to prepare barcode export:", error);
      toast({
        title: "Export preparation failed",
        description: "Failed to prepare products for export.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmBarcodeExport = async (config: BarcodeExportConfig) => {
    setIsExportingBarcodes(true);
    try {
      toast({
        title: "Generating PDF...",
        description: `Exporting ${productsToExport.length} barcode${
          productsToExport.length > 1 ? "s" : ""
        }...`,
      });

      await exportBulkBarcodesToPDF(productsToExport, {
        showPrice: config.showPrice,
        currency: settings.currency,
      });

      toast({
        title: "Export successful",
        description: `${productsToExport.length} barcode${
          productsToExport.length > 1 ? "s" : ""
        } exported to PDF.`,
      });

      setBarcodeExportOpen(false);
    } catch (error) {
      console.error("Barcode export failed:", error);
      toast({
        title: "Export failed",
        description: "Failed to export barcodes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExportingBarcodes(false);
    }
  };

  const handleUpdateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const success = await updateProduct(id, updates);
      if (success) {
        toast({
          title: "Product updated",
          description: "Product details have been updated successfully.",
        });
        return true;
      } else {
        toast({
          title: "Update failed",
          description: "Failed to update product. Please try again.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Error updating product:", error);
      toast({
        title: "Update failed",
        description: "An error occurred while updating the product.",
        variant: "destructive",
      });
      return false;
    }
  };

  const selectedProducts = useMemo(() => {
    return sortedProducts.filter((product) =>
      selectedProductIds.has(product.id),
    );
  }, [sortedProducts, selectedProductIds]);

  if (
    businessLoading ||
    !currentBusiness ||
    (isLoading && products.length === 0)
  ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <LoadingSpinner />
        <p className="text-muted-foreground">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Header Section - Improved Mobile Layout */}
      <div className="space-y-3 md:space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/inventory")}
              className="shrink-0 h-8 w-8"
              title="Back to inventory">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="space-y-1">
              <h1 className="text-lg md:text-2xl lg:text-3xl font-bold text-sales-dark">
                Products
              </h1>
              <p className="text-xs md:text-base text-muted-foreground">
                Manage your product inventory and pricing
              </p>
            </div>
          </div>

          {/* Mobile Action Buttons - Improved Layout */}
          {isMobile ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                {canCreate && (
                  <Button
                    onClick={() => router.push("/inventory/new")}
                    className="flex-1 gap-2 h-9">
                    <Plus size={16} /> Add Product
                  </Button>
                )}
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="icon"
                  disabled={isLoading || isFetching}
                  className="shrink-0 h-9 w-9">
                  <RefreshCw
                    className={`h-4 w-4 ${
                      isLoading || isFetching ? "animate-spin" : ""
                    }`}
                  />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {canCreate && (
                  <>
                    <Button
                      onClick={handleDownloadTemplate}
                      variant="outline"
                      className="gap-1 text-xs h-8">
                      <Download size={14} /> Template
                    </Button>
                    <Button
                      onClick={() => setCsvUploadOpen(true)}
                      variant="outline"
                      className="gap-1 text-xs h-8">
                      <Upload size={14} /> Add CSV
                    </Button>
                  </>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {canEdit && (
                  <>
                    <Button
                      onClick={handleExportForUpdate}
                      variant="outline"
                      className="gap-1 text-xs h-8">
                      <Download size={14} /> Export for Editing
                    </Button>
                    <Button
                      onClick={() => setCsvUpdateOpen(true)}
                      variant="outline"
                      className="gap-1 text-xs h-8">
                      <Upload size={14} /> Update CSV
                    </Button>
                  </>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {canView && (
                  <>
                    <Button
                      onClick={handleExportCSV}
                      variant="outline"
                      className="gap-1 text-xs h-8">
                      <Download size={14} /> Full Export
                    </Button>
                    <Button
                      onClick={handleExportPDF}
                      variant="outline"
                      className="gap-1 text-xs h-8">
                      <Download size={14} /> PDF
                    </Button>
                  </>
                )}
              </div>
              {canDelete && selectedProductIds.size > 0 && (
                <Button
                  onClick={() => setBulkDeleteOpen(true)}
                  variant="destructive"
                  className="w-full gap-2 text-xs h-8"
                  disabled={isDeleting}>
                  <Trash2 size={14} /> Delete Selected (
                  {selectedProductIds.size})
                </Button>
              )}
              {canEdit && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => handleOpenBulkPrint(false)}
                    variant="outline"
                    className="gap-2 text-xs h-8"
                    disabled={selectedProductIds.size === 0 || isPrinting}>
                    <Printer size={14} /> Print Selected
                  </Button>
                  <Button
                    onClick={() => handleOpenBulkPrint(true)}
                    variant="outline"
                    className="gap-2 text-xs h-8"
                    disabled={totalCount === 0 || isPrinting}>
                    <Printer size={14} /> Print All ({totalCount})
                  </Button>
                </div>
              )}
              {canView && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => handleOpenBarcodeExport(false)}
                    variant="outline"
                    className="gap-2 text-xs h-8"
                    disabled={
                      selectedProductIds.size === 0 || isExportingBarcodes
                    }>
                    <Download size={14} /> Export Barcodes
                  </Button>
                  <Button
                    onClick={() => handleOpenBarcodeExport(true)}
                    variant="outline"
                    className="gap-2 text-xs h-8"
                    disabled={totalCount === 0 || isExportingBarcodes}>
                    <Download size={14} /> All Barcodes
                  </Button>
                </div>
              )}
            </div>
          ) : (
            // Desktop Action Buttons
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="icon"
                disabled={isLoading || isFetching}
                title="Refresh products">
                <RefreshCw
                  className={`h-4 w-4 ${
                    isLoading || isFetching ? "animate-spin" : ""
                  }`}
                />
              </Button>

              {canCreate && (
                <>
                  <Button
                    onClick={handleDownloadTemplate}
                    variant="outline"
                    className="gap-2">
                    <Download size={16} /> CSV Template
                  </Button>
                  <Button
                    onClick={() => setCsvUploadOpen(true)}
                    variant="outline"
                    className="gap-2">
                    <Upload size={16} /> Add via CSV
                  </Button>
                </>
              )}

              {canEdit && (
                <>
                  <Button
                    onClick={handleExportForUpdate}
                    variant="outline"
                    className="gap-2">
                    <Download size={16} /> Export for Editing
                  </Button>
                  <Button
                    onClick={() => setCsvUpdateOpen(true)}
                    variant="outline"
                    className="gap-2">
                    <Upload size={16} /> Update via CSV
                  </Button>
                </>
              )}

              {canView && (
                <>
                  <Button
                    onClick={handleExportCSV}
                    variant="outline"
                    className="gap-2">
                    <Download size={16} /> Full Export
                  </Button>
                  <Button
                    onClick={handleExportPDF}
                    variant="outline"
                    className="gap-2">
                    <Download size={16} /> Export PDF
                  </Button>
                </>
              )}
              {canDelete && selectedProductIds.size > 0 && (
                <Button
                  onClick={() => setBulkDeleteOpen(true)}
                  variant="destructive"
                  className="gap-2"
                  disabled={isDeleting}>
                  <Trash2 size={16} /> Delete Selected (
                  {selectedProductIds.size})
                </Button>
              )}
              {canEdit && (
                <>
                  <Button
                    onClick={() => handleOpenBulkPrint(false)}
                    variant="outline"
                    className="gap-2"
                    disabled={selectedProductIds.size === 0 || isPrinting}>
                    <Printer size={16} /> Print Selected
                  </Button>
                  <Button
                    onClick={() => handleOpenBulkPrint(true)}
                    variant="outline"
                    className="gap-2"
                    disabled={totalCount === 0 || isPrinting}>
                    <Printer size={16} /> Print All ({totalCount})
                  </Button>
                </>
              )}
              {canView && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="gap-2"
                      disabled={isExportingBarcodes}>
                      <Download size={16} /> Export Barcodes{" "}
                      <ChevronDown size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleOpenBarcodeExport(false)}
                      disabled={selectedProductIds.size === 0}>
                      <Download className="mr-2 h-4 w-4" />
                      Selected Products ({selectedProductIds.size})
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleOpenBarcodeExport(true)}
                      disabled={totalCount === 0}>
                      <Download className="mr-2 h-4 w-4" />
                      All Products ({totalCount})
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {canCreate && (
                <Button
                  onClick={() => router.push("/inventory/new")}
                  className="gap-2">
                  <Plus size={16} /> Add Product
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <InventoryStats
        products={products}
        hideStockValue={true}
        totalCountOverride={totalCount}
        totalCostValueOverride={totalCostValueAll}
        lowStockOverride={lowStockAll}
        outOfStockOverride={outOfStockAll}
        totalStockValueOverride={totalStockValueAll}
      />

      {/* Filters Card - Better Mobile Layout */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 md:pb-6">
          <CardTitle className="text-sm md:text-lg">Filter Products</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <InventoryFilters
            filters={filters}
            setFilters={setFilters}
            categories={categories}
            productsCount={sortedProducts.length}
          />
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 md:pb-6">
          <CardTitle className="text-sm md:text-lg flex items-center justify-between">
            <span>
              Products ({totalCount})
              {selectedProductIds.size > 0 && (
                <span className="text-xs font-normal text-muted-foreground ml-2">
                  {selectedProductIds.size} selected
                </span>
              )}
            </span>
          </CardTitle>
          <div className="text-xs text-muted-foreground mt-2 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
            💡 <strong>Tip:</strong> Click on Category, Cost Price, or Selling
            Price to edit them directly in the table
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <InventoryTable
            products={sortedProducts}
            isLoading={isLoading}
            showAllFields={true}
            enableBulkActions={true}
            selectedProductIds={selectedProductIds}
            onToggleProductSelection={handleToggleProductSelection}
            onToggleAllProducts={handleToggleAllProducts}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={(field) => {
              if (sortField === field) {
                setSortOrder(sortOrder === "asc" ? "desc" : "asc");
              } else {
                setSortField(field);
                setSortOrder("asc");
              }
            }}
            onUpdateProduct={handleUpdateProduct}
            categories={categories.map((cat) => cat.name)}
          />
          {/* Pagination Controls */}
          <div className="flex items-center justify-between p-3 md:p-4 border-t">
            <div className="text-xs md:text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, totalCount)} of {totalCount}
            </div>
            <div className="flex items-center gap-2">
              <select
                className="border rounded px-2 py-1 text-xs md:text-sm"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}>
                {[20, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1 || isLoading}
                onClick={() => setPage(Math.max(1, page - 1))}>
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * pageSize >= totalCount || isLoading}
                onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CSVUploadDialog
        open={csvUploadOpen}
        onOpenChange={setCsvUploadOpen}
        onUpload={handleCSVUpload}
        categories={categories.map((cat) => cat.name)}
      />

      <CSVUpdateDialog
        open={csvUpdateOpen}
        onOpenChange={setCsvUpdateOpen}
        userId={user?.id}
      />

      <BulkDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        selectedProducts={selectedProducts}
        onConfirm={handleBulkDelete}
        isDeleting={isDeleting}
        deletionProgress={deletionProgress}
      />

      <BulkPrintDialog
        open={bulkPrintOpen}
        onOpenChange={setBulkPrintOpen}
        selectedProducts={productsToPrint}
        onConfirm={handleConfirmBulkPrint}
        isPrinting={isPrinting}
        printProgress={printProgress}
      />

      <BarcodeExportDialog
        open={barcodeExportOpen}
        onOpenChange={setBarcodeExportOpen}
        productCount={productsToExport.filter((p) => p.barcode).length}
        onConfirm={handleConfirmBarcodeExport}
        isExporting={isExportingBarcodes}
      />
    </div>
  );
};

export default Products;
