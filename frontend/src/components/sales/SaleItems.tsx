"use client";

import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SaleItem } from "@/types";
import ProductSaleItemInput from "@/components/ProductSaleItemInput";

interface SaleItemsProps {
  items: SaleItem[];
  onAddItem: () => void;
  onUpdateItem: (index: number, updatedItem: SaleItem) => void;
  onRemoveItem: (index: number) => void;
  saleDate?: string;
}

const SaleItems: React.FC<SaleItemsProps> = ({
  items,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  saleDate,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Items/Services</h3>

      <div className="space-y-4">
        {items.map((item, index) => (
          <div
            key={index}
            id={`sale-item-${index}`}
          >
            <ProductSaleItemInput
              item={item}
              index={index}
              onUpdate={onUpdateItem}
              onRemove={onRemoveItem}
              saleDate={saleDate}
            />
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onAddItem()}
          className="gap-1 w-full mt-2"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </div>
    </div>
  );
};

export default SaleItems;
