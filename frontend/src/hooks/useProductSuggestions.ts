
import { useState, useEffect } from 'react';
import { useLocalProductSearch } from './useProductSync';

export const useProductSuggestions = (products: any[], searchTerm: string) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // 🚀 PERFORMANCE: Use Dexie-based search instead of filtering 10,000 items in memory
  const localResults = useLocalProductSearch(searchTerm);
  const suggestions = localResults || [];

  // Open panel when there are suggestions and search term is present
  useEffect(() => {
    if (searchTerm.length >= 1 && suggestions.length > 0) {
      if (!isOpen) setIsOpen(true);
    } else if (searchTerm.length === 0) {
      if (isOpen) setIsOpen(false);
    }
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
