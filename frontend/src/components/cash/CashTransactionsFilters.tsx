"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Download, FileText } from 'lucide-react';

interface CashTransactionsFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  transactionTypeFilter: string;
  onTransactionTypeFilterChange: (value: string) => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
  totalTransactions: number;
}

const CashTransactionsFilters: React.FC<CashTransactionsFiltersProps> = ({
  searchTerm,
  onSearchChange,
  transactionTypeFilter,
  onTransactionTypeFilterChange,
  onExportCSV,
  onExportPDF,
  totalTransactions
}) => {
  return (
    <div className="space-y-4 mb-4">
      {/* Search and Filter Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={transactionTypeFilter} onValueChange={onTransactionTypeFilterChange}>
          <SelectTrigger>
            <SelectValue placeholder="All transaction types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="cash_in">Cash In</SelectItem>
            <SelectItem value="cash_out">Cash Out</SelectItem>
            <SelectItem value="transfer_in">Transfer In</SelectItem>
            <SelectItem value="transfer_out">Transfer Out</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onExportCSV}
            className="flex-1 sm:flex-none"
          >
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExportPDF}
            className="flex-1 sm:flex-none"
          >
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>
      
      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {totalTransactions} transaction{totalTransactions !== 1 ? 's' : ''} found
      </div>
    </div>
  );
};

export default CashTransactionsFilters;
