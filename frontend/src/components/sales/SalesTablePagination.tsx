"use client";

import React from 'react';
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';

interface SalesTablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const SalesTablePagination: React.FC<SalesTablePaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange
}) => {
  // Generate array of page numbers to display
  const pageNumbers = [];
  const maxPagesToShow = 3; // Reduced for better mobile experience
  
  if (totalPages <= maxPagesToShow) {
    // Show all pages if less than max
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }
  } else {
    // Always show first page
    pageNumbers.push(1);
    
    // Calculate start and end of page range around current
    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);
    
    // Adjust range to show max pages
    if (end - start + 1 < maxPagesToShow - 2) {
      if (currentPage < totalPages / 2) {
        end = Math.min(totalPages - 1, start + maxPagesToShow - 3);
      } else {
        start = Math.max(2, end - maxPagesToShow + 3);
      }
    }
    
    // Add ellipsis if needed
    if (start > 2) {
      pageNumbers.push('...');
    }
    
    // Add pages in range
    for (let i = start; i <= end; i++) {
      pageNumbers.push(i);
    }
    
    // Add ellipsis if needed
    if (end < totalPages - 1) {
      pageNumbers.push('...');
    }
    
    // Always show last page
    pageNumbers.push(totalPages);
  }
  
  if (totalPages <= 1) {
    return null;
  }
  
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
      <div className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
        Page {currentPage} of {totalPages}
      </div>
      
      <Pagination className="mx-0 order-1 sm:order-2">
        <PaginationContent className="gap-1">
          <PaginationItem>
            <PaginationPrevious
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              className={`h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm ${currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
            />
          </PaginationItem>
          
          {pageNumbers.map((page, index) => (
            <PaginationItem key={index} className="hidden sm:block">
              {page === '...' ? (
                <span className="px-3 py-2 text-sm">...</span>
              ) : (
                <PaginationLink
                  isActive={currentPage === page}
                  onClick={() => onPageChange(Number(page))}
                  className="h-8 sm:h-9 w-8 sm:w-9 text-xs sm:text-sm"
                >
                  {page}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}
          
          {/* Mobile: Show current page number */}
          <PaginationItem className="sm:hidden">
            <span className="h-8 w-8 flex items-center justify-center text-xs font-medium">
              {currentPage}
            </span>
          </PaginationItem>
          
          <PaginationItem>
            <PaginationNext
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              className={`h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm ${currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};

export default SalesTablePagination;
