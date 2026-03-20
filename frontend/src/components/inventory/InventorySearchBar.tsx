"use client";
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Product, ProductFilters } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';

interface InventorySearchBarProps {
    filters: ProductFilters;
    setFilters: (filters: ProductFilters) => void;
    products: Product[];
    onSearchChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSearchSubmit?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSearchFocus?: () => void;
}

const InventorySearchBar: React.FC<InventorySearchBarProps> = ({
    filters,
    setFilters,
    products,
    onSearchChange,
    onSearchSubmit,
    onSearchFocus
}) => {
    const isMobile = useIsMobile();
    // Local state for the input field to allow smooth typing
    const [localSearch, setLocalSearch] = useState(filters.search || '');

    // Sync local state when external filters change
    useEffect(() => {
        const searchVal = filters.search || '';
        if (localSearch !== searchVal) {
            const timer = setTimeout(() => {
                setLocalSearch(searchVal);
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [filters.search, localSearch]);

    // Handle typing - update local state and trigger suggestions (no database fetch)
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalSearch(e.target.value);
        // Trigger live search for suggestions only
        if (onSearchChange) {
            onSearchChange(e);
        }
    };

    // Submit on Enter key - Triggers database fetch
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();

            if (onSearchSubmit) {
                const fakeEvent = {
                    target: { value: localSearch }
                } as React.ChangeEvent<HTMLInputElement>;
                onSearchSubmit(fakeEvent);
            } else {
                // Apply the filter to the table (DB Level)
                setFilters({
                    ...filters,
                    search: localSearch
                });
            }
        }
    };

    // Submit on Blur - Triggers database fetch
    const handleBlur = () => {
        if (localSearch !== filters.search) {
            if (onSearchSubmit) {
                const fakeEvent = {
                    target: { value: localSearch }
                } as React.ChangeEvent<HTMLInputElement>;
                onSearchSubmit(fakeEvent);
            } else {
                setFilters({
                    ...filters,
                    search: localSearch
                });
            }
        }
    };

    return (
        <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
                placeholder="Search products..."
                value={localSearch}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                onFocus={onSearchFocus}
                className="pl-9 w-full bg-white transition-all duration-200 focus:shadow-md"
            />
        </div>
    );
};

export default InventorySearchBar;
