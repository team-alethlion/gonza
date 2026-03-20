
import { useState, useMemo, useEffect } from 'react';

interface UsePaginationProps<T> {
  items: T[];
  itemsPerPage?: number;
}

interface UsePaginationReturn<T> {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  paginatedItems: T[];
  totalPages: number;
}

export function usePagination<T>({ 
  items, 
  itemsPerPage = 20 // Increased from 10 to 20 for better UX with larger datasets
}: UsePaginationProps<T>): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(items.length / itemsPerPage));
  }, [items, itemsPerPage]);
  
  // Adjust current page if it's out of bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      const timer = setTimeout(() => {
        setCurrentPage(totalPages);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [totalPages, currentPage]);
  
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  }, [items, currentPage, itemsPerPage]);
  
  return {
    currentPage,
    setCurrentPage,
    paginatedItems,
    totalPages
  };
}
