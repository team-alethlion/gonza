
import { useState, useEffect, useMemo } from 'react';
import { Product } from '@/types';
import { matchProductSearch } from '@/utils/searchUtils';

export const useProductSuggestions = (products: Product[], searchTerm: string) => {
  const [isOpen, setIsOpen] = useState(false);

  // Get filtered suggestions based on search term
  const suggestions = useMemo(() => {
    if (!searchTerm || searchTerm.length < 1) {
      return [];
    }

    // Use unified search utility for consistency
    const filtered = products.filter(product => matchProductSearch(product, searchTerm));

    // Sort by relevance (exact matches first, then starts with, then contains)
    const searchLower = searchTerm.toLowerCase();
    return filtered
      .sort((a, b) => {
        const aNameLower = String(a.name || '').toLowerCase();
        const bNameLower = String(b.name || '').toLowerCase();
        const aItemLower = String(a.itemNumber || '').toLowerCase();
        const bItemLower = String(b.itemNumber || '').toLowerCase();

        // Exact match on item number (highest priority)
        if (aItemLower === searchLower) return -1;
        if (bItemLower === searchLower) return 1;

        // Exact match on name
        if (aNameLower === searchLower) return -1;
        if (bNameLower === searchLower) return 1;

        // Starts with on item number
        if (aItemLower.startsWith(searchLower) && !bItemLower.startsWith(searchLower)) return -1;
        if (bItemLower.startsWith(searchLower) && !aItemLower.startsWith(searchLower)) return 1;

        // Starts with on name
        if (aNameLower.startsWith(searchLower) && !bNameLower.startsWith(searchLower)) return -1;
        if (bNameLower.startsWith(searchLower) && !aNameLower.startsWith(searchLower)) return 1;

        // Alphabetical by name
        return aNameLower.localeCompare(bNameLower);
      })
      .slice(0, 100); // Increased to 100 suggestions for better user experience
  }, [products, searchTerm]);

  // Open panel when there are suggestions and search term is present
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 1 && suggestions.length > 0) {
        if (!isOpen) setIsOpen(true);
      } else if (searchTerm.length === 0) {
        if (isOpen) setIsOpen(false);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [searchTerm, suggestions.length, isOpen]);

  const openPanel = () => {
    setIsOpen(true);
  };

  const closePanel = () => {
    setIsOpen(false);
  };

  return {
    suggestions,
    isOpen,
    openPanel,
    closePanel
  };
};
