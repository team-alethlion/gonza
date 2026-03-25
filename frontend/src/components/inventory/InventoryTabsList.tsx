"use client";

import React from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

interface InventoryTabsListProps {
  isMobile: boolean;
  hasPermission: (module: string, permission: string) => boolean;
}

const InventoryTabsList: React.FC<InventoryTabsListProps> = ({
  isMobile,
  hasPermission
}) => {
  return (
    <>
      <TabsList
        className={`grid w-full ${
          isMobile ? "grid-cols-4 gap-1" : "grid-cols-6"
        } h-auto p-1`}>
        <TabsTrigger
          value="overview"
          className="text-xs md:text-sm px-1 md:px-2 py-2 min-h-[44px]">
          Overview
        </TabsTrigger>
        <TabsTrigger
          value="requisition"
          className="text-xs md:text-sm px-1 md:px-2 py-2 min-h-[44px]">
          {isMobile ? "Request" : "Requisition"}
        </TabsTrigger>
        {hasPermission("inventory", "stock_adjustment") && (
          <>
            <TabsTrigger
              value="add-stock"
              className="text-xs md:text-sm px-1 md:px-2 py-2 min-h-[44px]">
              {isMobile ? "Restock" : "Restock"}
            </TabsTrigger>
            <TabsTrigger
              value="stock-count"
              className="text-xs md:text-sm px-1 md:px-2 py-2 min-h-[44px]">
              {isMobile ? "Count" : "Stock Count"}
            </TabsTrigger>
            <TabsTrigger
              value="transfer"
              className="text-xs md:text-sm px-1 md:px-2 py-2 min-h-[44px]">
              {isMobile ? "Transfer" : "Stock Transfer"}
            </TabsTrigger>
          </>
        )}
        {!isMobile && (
          <>
            <TabsTrigger
              value="sold-items"
              className="text-xs md:text-sm px-1 md:px-2 py-2 min-h-[44px]">
              Items Sold
            </TabsTrigger>
            <TabsTrigger
              value="stock-summary"
              className="text-xs md:text-sm px-1 md:px-2 py-2 min-h-[44px]">
              Stock Summary
            </TabsTrigger>
          </>
        )}
      </TabsList>

      {/* Mobile: Additional tabs in dropdown or secondary row */}
      {isMobile && (
        <div className="flex gap-1 overflow-x-auto pb-2">
          <TabsList className="grid grid-cols-2 gap-1 w-auto min-w-fit p-1">
            <TabsTrigger
              value="sold-items"
              className="text-xs px-2 py-2 min-h-[44px] whitespace-nowrap">
              Items Sold
            </TabsTrigger>
            <TabsTrigger
              value="stock-summary"
              className="text-xs px-2 py-2 min-h-[44px] whitespace-nowrap">
              Stock Summary
            </TabsTrigger>
          </TabsList>
        </div>
      )}
    </>
  );
};

export default React.memo(InventoryTabsList);
