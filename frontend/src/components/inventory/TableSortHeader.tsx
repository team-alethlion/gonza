"use client";

import React from 'react';
import { TableHead } from '@/components/ui/table';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { SortField } from './InventoryTable'; // Import SortField from InventoryTable

interface TableSortHeaderProps {
  field: SortField;
  currentSortField: SortField;
  sortOrder: 'asc' | 'desc';
  onSort: (field: SortField) => void;
  children: React.ReactNode;
  className?: string;
}

const TableSortHeader: React.FC<TableSortHeaderProps> = ({
  field,
  currentSortField,
  sortOrder,
  onSort,
  children,
  className
}) => {
  return (
    <TableHead 
      className={`cursor-pointer hover:bg-muted/80 ${className || ''}`} 
      onClick={() => onSort(field)}
    >
      <div className="flex items-center justify-between">
        {children}
        {currentSortField === field && (
          <div className="ml-1">
            {sortOrder === 'asc' ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        )}
      </div>
    </TableHead>
  );
};

export default TableSortHeader;
