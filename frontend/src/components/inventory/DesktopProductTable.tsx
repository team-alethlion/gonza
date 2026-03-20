"use client";

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Product } from '@/types';
import { formatNumber } from '@/lib/utils';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import TableSortHeader from './TableSortHeader';
import StockStatusBadge from './StockStatusBadge';
import ProductActions from './ProductActions';
import { useProfiles } from '@/contexts/ProfileContext';
import ProductImage from './ProductImage';
import { SortField } from './InventoryTable';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import InlineEditableCell from './InlineEditableCell';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFinancialVisibility } from '@/hooks/useFinancialVisibility';

type SortOrder = 'asc' | 'desc';

interface DesktopProductTableProps {
  products: Product[];
  sortField: SortField;
  sortOrder: SortOrder;
  handleSort: (field: SortField) => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  showAllFields?: boolean;
  enableBulkActions?: boolean;
  selectedProductIds?: Set<string>;
  onToggleProductSelection?: (productId: string) => void;
  onToggleAllProducts?: (productIds: string[]) => void;
  onUpdateProduct?: (id: string, updates: Partial<Product>) => Promise<boolean>;
  categories?: string[];
}

const DesktopProductTable: React.FC<DesktopProductTableProps> = ({
  products,
  sortField,
  sortOrder,
  handleSort,
  onView,
  onEdit,
  showAllFields = true,
  enableBulkActions = false,
  selectedProductIds = new Set(),
  onToggleProductSelection,
  onToggleAllProducts,
  onUpdateProduct,
  categories = []
}) => {
  const { settings } = useBusinessSettings();
  const { hasPermission } = useProfiles();
  const { canViewCostPrice, canViewSellingPrice, formatFinancial } = useFinancialVisibility();
  const canEdit = hasPermission('inventory', 'edit');

  // Calculate total cost for a product
  const calculateTotalCost = (product: Product) => {
    return product.quantity * product.costPrice;
  };

  const productIds = products.map(p => p.id);
  const allSelected = productIds.length > 0 && productIds.every(id => selectedProductIds.has(id));

  // Simplified version (less columns) - used for top selling products and Products page
  if (!showAllFields) {
    return (
      <div className="overflow-hidden rounded-md border">
        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                {enableBulkActions && (
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={() => onToggleAllProducts?.(productIds)}
                      aria-label="Select all products"
                    />
                  </TableHead>
                )}
                <TableHead className="w-[80px]">Image</TableHead>
                <TableSortHeader
                  field="itemNumber"
                  currentSortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  className="w-[100px]"
                >
                  Item #
                </TableSortHeader>
                <TableSortHeader
                  field="name"
                  currentSortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  className="w-[160px]"
                >
                  Product Name
                </TableSortHeader>
                <TableSortHeader
                  field="category"
                  currentSortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  className="w-[120px]"
                >
                  Category
                </TableSortHeader>
                <TableSortHeader
                  field="quantity"
                  currentSortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  className="w-[80px] text-right"
                >
                  Quantity
                </TableSortHeader>
                <TableHead className="w-[80px]">Status</TableHead>
                {canViewCostPrice && (
                  <TableSortHeader
                    field="costPrice"
                    currentSortField={sortField}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    className="w-[100px] text-right"
                  >
                    Cost Price
                  </TableSortHeader>
                )}
                {canViewSellingPrice && (
                  <TableSortHeader
                    field="sellingPrice"
                    currentSortField={sortField}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    className="w-[100px] text-right"
                  >
                    Selling Price
                  </TableSortHeader>
                )}
                <TableHead className="w-[100px] text-center">Created Date</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow
                  key={product.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onView(product.id)}
                >
                  {enableBulkActions && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedProductIds.has(product.id)}
                        onCheckedChange={() => onToggleProductSelection?.(product.id)}
                        aria-label={`Select ${product.name}`}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <ProductImage imageUrl={product.imageUrl} alt={product.name} size="sm" />
                  </TableCell>
                  <TableCell className="font-mono text-sm max-w-[100px] truncate">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help">{product.itemNumber}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-mono">{product.itemNumber}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="font-medium max-w-[160px] truncate">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help">{product.name}</span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-bold break-words whitespace-normal">{product.name}</p>
                          {product.description && (
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{product.description}</p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="max-w-[120px]" onClick={(e) => e.stopPropagation()}>
                    {onUpdateProduct && canEdit ? (
                      <InlineEditableCell
                        value={product.category}
                        type="select"
                        options={categories}
                        onSave={(newValue) => onUpdateProduct(product.id, { category: newValue as string })}
                      />
                    ) : (
                      <span className="truncate">{product.category}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">{product.quantity % 1 === 0 ? product.quantity : product.quantity.toFixed(2)}</TableCell>
                  <TableCell><StockStatusBadge product={product} /></TableCell>
                  <TableCell><StockStatusBadge product={product} /></TableCell>
                  {canViewCostPrice && (
                    <TableCell className="text-right font-medium tabular-nums" onClick={(e) => e.stopPropagation()}>
                      {onUpdateProduct && canEdit ? (
                        <InlineEditableCell
                          value={product.costPrice}
                          type="number"
                          currency={settings.currency}
                          onSave={(newValue) => onUpdateProduct(product.id, { costPrice: newValue as number })}
                          className="text-right"
                        />
                      ) : (
                        <span>{settings.currency} {formatFinancial(product.costPrice, 'cost')}</span>
                      )}
                    </TableCell>
                  )}
                  {canViewSellingPrice && (
                    <TableCell className="text-right font-medium tabular-nums" onClick={(e) => e.stopPropagation()}>
                      {onUpdateProduct && canEdit ? (
                        <InlineEditableCell
                          value={product.sellingPrice}
                          type="number"
                          currency={settings.currency}
                          onSave={(newValue) => onUpdateProduct(product.id, { sellingPrice: newValue as number })}
                          className="text-right"
                        />
                      ) : (
                        <span>{settings.currency} {formatFinancial(product.sellingPrice, 'selling')}</span>

                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {format(product.createdAt, 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <ProductActions
                      product={product}
                      onView={onView}
                      onEdit={onEdit}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TooltipProvider>
      </div >
    );
  }

  // Full view (more columns) - now includes Created Date and Item Number
  return (
    <div className="overflow-hidden rounded-md border">
      <TooltipProvider>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {enableBulkActions && (
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => onToggleAllProducts?.(productIds)}
                    aria-label="Select all products"
                  />
                </TableHead>
              )}
              <TableHead className="w-[80px]">Image</TableHead>
              <TableSortHeader
                field="itemNumber"
                currentSortField={sortField}
                sortOrder={sortOrder}
                onSort={handleSort}
                className="w-[100px]"
              >
                Item #
              </TableSortHeader>
              <TableSortHeader
                field="name"
                currentSortField={sortField}
                sortOrder={sortOrder}
                onSort={handleSort}
                className="w-[180px]"
              >
                Product Name
              </TableSortHeader>
              <TableSortHeader
                field="category"
                currentSortField={sortField}
                sortOrder={sortOrder}
                onSort={handleSort}
                className="w-[120px]"
              >
                Category
              </TableSortHeader>
              <TableSortHeader
                field="quantity"
                currentSortField={sortField}
                sortOrder={sortOrder}
                onSort={handleSort}
                className="w-[80px] text-right"
              >
                Quantity
              </TableSortHeader>
              <TableHead className="w-[80px]">Status</TableHead>
              {canViewCostPrice && (
                <>
                  <TableSortHeader
                    field="costPrice"
                    currentSortField={sortField}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    className="w-[100px] text-right"
                  >
                    Cost Price
                  </TableSortHeader>
                  <TableHead className="w-[100px] text-right">Total Cost</TableHead>
                </>
              )}
              {canViewSellingPrice && (
                <TableSortHeader
                  field="sellingPrice"
                  currentSortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  className="w-[100px] text-right"
                >
                  Selling Price
                </TableSortHeader>
              )}
              <TableHead className="w-[100px] text-center">Created Date</TableHead>
              <TableHead className="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow
                key={product.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => onView(product.id)}
              >
                {enableBulkActions && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedProductIds.has(product.id)}
                      onCheckedChange={() => onToggleProductSelection?.(product.id)}
                      aria-label={`Select ${product.name}`}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <ProductImage imageUrl={product.imageUrl} alt={product.name} size="sm" />
                </TableCell>
                <TableCell className="font-mono text-sm max-w-[100px] truncate">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">{product.itemNumber}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{product.itemNumber}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="font-medium max-w-[180px] truncate">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">{product.name}</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <div className="space-y-1">
                        <p className="font-bold break-words whitespace-normal">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{product.description}</p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="max-w-[120px]" onClick={(e) => e.stopPropagation()}>
                  {onUpdateProduct && canEdit ? (
                    <InlineEditableCell
                      value={product.category}
                      type="select"
                      options={categories}
                      onSave={(newValue) => onUpdateProduct(product.id, { category: newValue as string })}
                    />
                  ) : (
                    <span className="truncate">{product.category}</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">{product.quantity % 1 === 0 ? product.quantity : product.quantity.toFixed(2)}</TableCell>
                <TableCell><StockStatusBadge product={product} /></TableCell>
                {canViewCostPrice && (
                  <>
                    <TableCell className="text-right font-medium tabular-nums" onClick={(e) => e.stopPropagation()}>
                      {onUpdateProduct && canEdit ? (
                        <InlineEditableCell
                          value={product.costPrice}
                          type="number"
                          currency={settings.currency}
                          onSave={(newValue) => onUpdateProduct(product.id, { costPrice: newValue as number })}
                          className="text-right"
                        />
                      ) : (
                        <span>{settings.currency} {formatFinancial(product.costPrice, 'cost')}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {settings.currency} {formatFinancial(calculateTotalCost(product), 'cost')}
                    </TableCell>
                  </>
                )}
                {canViewSellingPrice && (
                  <TableCell className="text-right font-medium tabular-nums" onClick={(e) => e.stopPropagation()}>
                    {onUpdateProduct && canEdit ? (
                      <InlineEditableCell
                        value={product.sellingPrice}
                        type="number"
                        currency={settings.currency}
                        onSave={(newValue) => onUpdateProduct(product.id, { sellingPrice: newValue as number })}
                        className="text-right"
                      />
                    ) : (
                      <span>{settings.currency} {formatFinancial(product.sellingPrice, 'selling')}</span>
                    )}
                  </TableCell>
                )}
                <TableCell className="text-center text-sm text-muted-foreground">
                  {format(product.createdAt, 'MMM dd, yyyy')}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <ProductActions
                    product={product}
                    onView={onView}
                    onEdit={onEdit}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TooltipProvider>
    </div>
  );
};

export default DesktopProductTable;
