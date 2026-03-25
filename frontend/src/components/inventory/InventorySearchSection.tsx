"use client";

import React, { useCallback, useState, useEffect } from "react";
import InventorySearchBar from "@/components/inventory/InventorySearchBar";
import ProductSuggestionsPanel from "@/components/inventory/ProductSuggestionsPanel";
import { useProductSuggestions } from "@/hooks/useProductSuggestions";
import { Product } from "@/types";
import { useRouter } from "next/navigation";

interface InventorySearchSectionProps {
  products: Product[];
  filters: any;
  setFilters: (filters: any) => void;
  isMobile: boolean;
  isFetching: boolean;
}

const InventorySearchSection: React.FC<InventorySearchSectionProps> = ({
  products,
  filters,
  setFilters,
  isMobile,
  isFetching
}) => {
  const router = useRouter();
  const [liveSearch, setLiveSearch] = useState(filters.search || "");

  // Sync live search when filters change
  useEffect(() => {
    setLiveSearch(filters.search || "");
  }, [filters.search]);

  const {
    suggestions,
    isOpen: panelOpen,
    openPanel,
    closePanel,
  } = useProductSuggestions(products, liveSearch);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const searchValue = e.target.value;
      setLiveSearch(searchValue);

      if (searchValue.length >= 1) {
        openPanel();
      } else {
        closePanel();
      }
    },
    [openPanel, closePanel]
  );

  const handleSearchSubmit = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const searchValue = e.target.value;
      setFilters({
        ...filters,
        search: searchValue,
      });
      if (searchValue.length > 0) {
        openPanel();
      }
    },
    [filters, setFilters, openPanel]
  );

  const handleProductSelect = (product: Product) => {
    setLiveSearch(product.name);
    router.push(`/agency/inventory/${product.id}`);
    closePanel();
  };

  const handleSearchFocus = useCallback(() => {
    if (liveSearch) {
      openPanel();
    }
  }, [liveSearch, openPanel]);

  return (
    <div className="relative">
      <InventorySearchBar
        filters={filters}
        setFilters={setFilters}
        products={products}
        onSearchChange={handleSearchChange}
        onSearchSubmit={handleSearchSubmit}
        onSearchFocus={handleSearchFocus}
      />

      {/* Suggestions Dropdown - Mobile or Desktop */}
      <ProductSuggestionsPanel
        suggestions={suggestions}
        isOpen={panelOpen}
        onClose={closePanel}
        onSelectProduct={handleProductSelect}
        searchTerm={liveSearch}
        isLoading={isFetching}
      />
    </div>
  );
};

export default InventorySearchSection;
