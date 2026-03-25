"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Plus,
  RefreshCw,
  ListFilter,
  Search,
  Truck,
  FileDown,
  FileUp,
  Scale,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProfiles } from "@/contexts/ProfileContext";

interface InventoryHeaderProps {
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  onDownloadTemplate: () => void;
  onCSVUpload: () => void;
}

const InventoryHeader: React.FC<InventoryHeaderProps> = ({
  isLoading,
  onRefresh,
  onDownloadTemplate,
  onCSVUpload,
}) => {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { hasPermission } = useProfiles();

  // 🚀 PERFORMANCE: We removed the "!mounted" block to prevent the 1-2s delay.
  // Instead, we use a stable initial render that matches between Server and Client.
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-sales-dark">
              Inventory Overview
            </h1>
          </div>
          <p className="text-sm md:text-base text-muted-foreground">
            Monitor your inventory health and analyze sales performance
          </p>
        </div>

        {/* Mobile Action Buttons - Improved Layout */}
        {isMobile ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              {hasPermission("inventory", "create") && (
                <Button
                  onClick={() => router.push("/agency/inventory/new")}
                  className="flex-1 gap-2 min-h-[44px]">
                  <Plus size={16} /> Add Product
                </Button>
              )}
              <Button
                onClick={onRefresh}
                variant="outline"
                size="icon"
                disabled={isLoading}
                className="shrink-0 min-h-[44px] min-w-[44px]">
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => router.push("/agency/inventory/products")}
                variant="outline"
                className="gap-1 text-xs min-h-[40px]">
                <ListFilter size={14} /> Products
              </Button>
              {hasPermission("inventory", "view") && (
                <Button
                  onClick={() => router.push("/agency/inventory/carriage-inwards")}
                  variant="outline"
                  className="gap-1 text-xs min-h-[40px]">
                  <Truck size={14} /> Carriage
                </Button>
              )}
            </div>
            {hasPermission("inventory", "create") && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={onDownloadTemplate}
                  variant="outline"
                  className="gap-1 text-xs min-h-[40px]">
                  <FileDown size={14} /> Template
                </Button>
                <Button
                  onClick={onCSVUpload}
                  variant="outline"
                  className="gap-1 text-xs min-h-[40px]">
                  <FileUp size={14} /> Upload
                </Button>
              </div>
            )}
          </div>
        ) : (
          // Desktop Action Buttons
          <div className="flex items-center gap-2">
            <Button
              onClick={onRefresh}
              variant="outline"
              size="icon"
              disabled={isLoading}
              className="relative"
              title="Refresh data">
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              <span className="sr-only">Refresh data</span>
            </Button>

            {hasPermission("inventory", "create") && (
              <>
                <Button
                  onClick={onDownloadTemplate}
                  variant="outline"
                  className="gap-2"
                  title="Download CSV template">
                  <FileDown size={16} /> CSV Template
                </Button>
                <Button
                  onClick={onCSVUpload}
                  variant="outline"
                  className="gap-2"
                  title="Upload products via CSV">
                  <FileUp size={16} /> Upload CSV
                </Button>
              </>
            )}
            {hasPermission("inventory", "view") && (
              <Button
                onClick={() => router.push("/agency/inventory/carriage-inwards")}
                variant="outline"
                className="gap-2">
                <Truck size={16} /> Carriage Inwards
              </Button>
            )}

            <Button
              onClick={() => router.push("/agency/inventory/products")}
              variant="outline"
              className="gap-2">
              <ListFilter size={16} /> All Products
            </Button>
            {hasPermission("inventory", "create") && (
              <Button
                onClick={() => router.push("/agency/inventory/new")}
                className="gap-2">
                <Plus size={16} /> Add Product
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryHeader;
