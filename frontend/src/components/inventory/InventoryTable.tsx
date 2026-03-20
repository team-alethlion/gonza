"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { Product } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileProductCard from './MobileProductCard';
import DesktopProductTable from './DesktopProductTable';
import EmptyProductState from './EmptyProductState';

interface InventoryTableProps {
  products: Product[];
  isLoading: boolean;
  showAllFields?: boolean;
  enableBulkActions?: boolean;
  selectedProductIds?: Set<string>;
  onToggleProductSelection?: (productId: string) => void;
  onToggleAllProducts?: (productIds: string[]) => void;
  sortField?: SortField;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: SortField) => void;
  onUpdateProduct?: (id: string, updates: Partial<Product>) => Promise<boolean>;
  categories?: string[];
}

export type SortField = 'name' | 'category' | 'quantity' | 'sellingPrice' | 'costPrice' | 'itemNumber';
type SortOrder = 'asc' | 'desc';

const InventoryTable: React.FC<InventoryTableProps> = ({
  products,
  isLoading,
  showAllFields = true,
  enableBulkActions = false,
  selectedProductIds = new Set(),
  onToggleProductSelection,
  onToggleAllProducts,
  sortField: externalSortField,
  sortOrder: externalSortOrder,
  onSort: externalOnSort,
  onUpdateProduct,
  categories = []
}) => {
  const router = useRouter();
  const isMobile = useIsMobile();

  // Internal sorting state (fallback if no external sorting is provided)
  const [internalSortField, setInternalSortField] = React.useState<SortField>('name');
  const [internalSortOrder, setInternalSortOrder] = React.useState<SortOrder>('asc');

  // Use external sorting if provided, otherwise use internal
  const sortField = externalSortField || internalSortField;
  const sortOrder = externalSortOrder || internalSortOrder;

  const handleEdit = (id: string) => {
    router.push(`/inventory/edit/${id}`);
  };

  const handleView = (id: string) => {
    router.push(`/inventory/${id}`);
  };

  const handleSort = (field: SortField) => {
    if (externalOnSort) {
      // Use external sort handler if provided
      externalOnSort(field);
    } else {
      // Use internal sorting logic
      if (sortField === field) {
        setInternalSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setInternalSortField(field);
        setInternalSortOrder('asc');
      }
    }
  };

  const sortedProducts = React.useMemo(() => {
    return [...products].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'quantity':
          comparison = a.quantity - b.quantity;
          break;
        case 'sellingPrice':
          comparison = a.sellingPrice - b.sellingPrice;
          break;
        case 'costPrice':
          comparison = a.costPrice - b.costPrice;
          break;
        case 'itemNumber':
          comparison = a.itemNumber.localeCompare(b.itemNumber);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [products, sortField, sortOrder]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-pulse">Loading inventory data...</div>
      </div>
    );
  }

  if (products.length === 0) {
    return <EmptyProductState />;
  }

  // Mobile product cards view
  if (isMobile) {
    const productIds = sortedProducts.map(p => p.id);
    const allSelected = productIds.length > 0 && productIds.every(id => selectedProductIds.has(id));

    return (
      <div className="space-y-4">
        {/* Mobile Select All Header */}
        {enableBulkActions && sortedProducts.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 bg-muted/30 rounded-md">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => onToggleAllProducts?.(productIds)}
                className="rounded border-gray-300"
                id="mobile-select-all"
              />
              <label htmlFor="mobile-select-all" className="text-sm font-medium">
                Select All ({productIds.length})
              </label>
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedProductIds.size} selected
            </div>
          </div>
        )}

        {/* Product Cards */}
        <div className="divide-y">
          {sortedProducts.map((product) => (
            <MobileProductCard
              key={product.id}
              product={product}
              onView={handleView}
              onEdit={handleEdit}
              showAllFields={showAllFields}
              enableBulkActions={enableBulkActions}
              isSelected={selectedProductIds.has(product.id)}
              onToggleSelection={onToggleProductSelection}
            />
          ))}
        </div>
      </div>
    );
  }

  // Desktop table view
  return (
    <DesktopProductTable
      products={sortedProducts}
      sortField={sortField}
      sortOrder={sortOrder}
      handleSort={handleSort}
      onView={handleView}
      onEdit={handleEdit}
      showAllFields={showAllFields}
      enableBulkActions={enableBulkActions}
      selectedProductIds={selectedProductIds}
      onToggleProductSelection={onToggleProductSelection}
      onToggleAllProducts={onToggleAllProducts}
      onUpdateProduct={onUpdateProduct}
      categories={categories}
    />
  );
};

export default InventoryTable;
