"use client";

import React from 'react';
import { Product } from '@/types';
import { formatNumber } from '@/lib/utils';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import ProductImage from './ProductImage';
import StockStatusBadge from './StockStatusBadge';
import ProductActions from './ProductActions';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFinancialVisibility } from '@/hooks/useFinancialVisibility';

interface MobileProductCardProps {
  product: Product;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  showAllFields?: boolean;
  enableBulkActions?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (productId: string) => void;
}

const MobileProductCard: React.FC<MobileProductCardProps> = ({
  product,
  onView,
  onEdit,
  showAllFields = true,
  enableBulkActions = false,
  isSelected = false,
  onToggleSelection
}) => {
  const { settings } = useBusinessSettings();
  const { formatFinancial, canViewCostPrice, canViewSellingPrice, canViewProfit } = useFinancialVisibility();

  // Calculate total cost
  const totalCost = product.quantity * product.costPrice;

  return (
    <TooltipProvider>
      <div
        className="py-4 px-4 hover:bg-gray-50 border-b last:border-b-0 rounded-md"
        onClick={() => onView(product.id)}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            {enableBulkActions && (
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleSelection?.(product.id)}
                  aria-label={`Select ${product.name}`}
                />
              </div>
            )}
            <ProductImage imageUrl={product.imageUrl} alt={product.name} />
            <div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <h3 className="font-medium text-sales-dark cursor-help max-w-[150px] truncate">{product.name}</h3>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-bold break-words whitespace-normal">{product.name}</p>
                    {product.description && (
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{product.description}</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
              <p className="text-sm text-muted-foreground">#{product.itemNumber}</p>
            </div>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <ProductActions
              product={product}
              onView={onView}
              onEdit={onEdit}
            />
          </div>
        </div>
        <div className={`grid grid-cols-2 gap-y-2.5 text-sm ${enableBulkActions ? 'ml-20' : 'ml-14'}`}>
          {product.category && (
            <>
              <div className="text-muted-foreground font-medium">Category:</div>
              <div className="font-normal">{product.category}</div>
            </>
          )}

          <div className="text-muted-foreground font-medium">Quantity:</div>
          <div className="font-medium">{product.quantity % 1 === 0 ? product.quantity : product.quantity.toFixed(2)}</div>

          <div className="text-muted-foreground font-medium">Status:</div>
          <div><StockStatusBadge product={product} /></div>

          {product.costPrice !== undefined && product.costPrice !== null && (
            <>
              <div className="text-muted-foreground font-medium">Cost Price:</div>
              <div className="font-medium tabular-nums">
                {canViewCostPrice ? `${settings.currency} ${formatFinancial(product.costPrice, 'cost')}` : '•••'}
              </div>

              <div className="text-muted-foreground font-medium">Total Cost:</div>
              <div className="font-medium tabular-nums">
                {canViewCostPrice ? `${settings.currency} ${formatNumber(totalCost)}` : '•••'}
              </div>
            </>
          )}

          {showAllFields && product.sellingPrice !== undefined && product.sellingPrice !== null && (
            <>
              <div className="text-muted-foreground font-medium">Selling Price:</div>
              <div className="font-medium tabular-nums">
                {canViewSellingPrice ? `${settings.currency} ${formatFinancial(product.sellingPrice, 'selling')}` : '•••'}
              </div>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default MobileProductCard;
