"use client";

import React from 'react';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { ProductCategory, ProductFilters } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';

interface InventoryFiltersProps {
  filters: ProductFilters;
  setFilters: (filters: ProductFilters) => void;
  categories: ProductCategory[];
  productsCount: number;
}

const InventoryFilters: React.FC<InventoryFiltersProps> = ({
  filters,
  setFilters,
  categories,
  productsCount
}) => {
  const isMobile = useIsMobile();

  const [localSearch, setLocalSearch] = React.useState(filters.search);

  // Sync local search with filters when externally changed
  React.useEffect(() => {
    if (filters.search !== localSearch) {
      setLocalSearch(filters.search);
    }
  }, [filters.search]);

  const updateFilter = (key: keyof ProductFilters, value: string) => {
    setFilters({
      ...filters,
      [key]: value
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      updateFilter('search', localSearch);
    }
  };

  const handleBlur = () => {
    if (localSearch !== filters.search) {
      updateFilter('search', localSearch);
    }
  };

  return (
    <Card className="mb-6 shadow-sm">
      <CardContent className={cn("p-4", isMobile && "p-3")}>
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="flex items-center relative flex-grow">
            <Search className="h-4 w-4 absolute left-3 text-gray-400" />
            <Input
              placeholder="Search products..."
              className="pl-9"
              value={localSearch}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              onBlur={handleBlur}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Category filter */}
            <div className="min-w-[180px]">
              <Select
                value={filters.category || 'all'}
                onValueChange={(value) => updateFilter('category', value === 'all' ? '' : value)}
              >
                <SelectTrigger className={cn(
                  "w-full",
                  filters.category !== '' && "border-primary"
                )}>
                  <span className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <SelectValue placeholder="All Categories" />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stock status */}
            <div className="min-w-[150px]">
              <Select
                value={filters.stockStatus}
                onValueChange={(value) => updateFilter('stockStatus', value as any)}
              >
                <SelectTrigger className={cn(
                  filters.stockStatus !== 'all' && "border-primary"
                )}>
                  <SelectValue placeholder="Stock Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock</SelectItem>
                  <SelectItem value="inStock">In Stock</SelectItem>
                  <SelectItem value="lowStock">Low Stock</SelectItem>
                  <SelectItem value="outOfStock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Results count */}
            <div className="flex items-center">
              <Badge variant="secondary" className="text-xs">
                {productsCount} {productsCount === 1 ? 'product' : 'products'} found
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InventoryFilters;
