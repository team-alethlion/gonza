"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Search, Filter, Tag } from 'lucide-react';
import DateRangeFilter from './DateRangeFilter';
import { useSalesCategories } from '@/hooks/useSalesCategories';

interface SalesTableFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  paymentFilter: string;
  setPaymentFilter: (filter: string) => void;
  cashTransactionFilter: string;
  setCashTransactionFilter: (filter: string) => void;
  categoryFilter: string;
  setCategoryFilter: (filter: string) => void;
  dateFilter: string;
  setDateFilter: (filter: string) => void;
  dateRange: { from: Date | undefined; to: Date | undefined; };
  setDateRange: (range: { from: Date | undefined; to: Date | undefined; }) => void;
  specificDate: Date | undefined;
  setSpecificDate: (date: Date | undefined) => void;
  isCustomRange: boolean;
  isSpecificDate: boolean;
  sortOrder?: string;
  setSortOrder?: (order: string) => void;
}

const SalesTableFilters: React.FC<SalesTableFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  paymentFilter,
  setPaymentFilter,
  cashTransactionFilter,
  setCashTransactionFilter,
  categoryFilter,
  setCategoryFilter,
  dateFilter,
  setDateFilter,
  dateRange,
  setDateRange,
  specificDate,
  setSpecificDate,
  isCustomRange,
  isSpecificDate,
  sortOrder = 'desc',
  setSortOrder
}) => {
  const { categories } = useSalesCategories();
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleDateFilterChange = (value: string) => {
    setDateFilter(value);
  };

  return (
    <div className="mb-6 space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {/* Search Input - Full Width */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer, item, or receipt number..."
            className="pl-10 bg-white border-border/50 focus:border-primary h-10"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
              <Filter className="h-4 w-4 text-muted-foreground" />
            </div>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="bg-white border-border/50 pl-10 h-10">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent className="bg-white shadow-lg border border-border/50">
                <SelectItem value="all">All Payment Statuses</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="NOT PAID">NOT PAID</SelectItem>
                <SelectItem value="Quote">Quote</SelectItem>
                <SelectItem value="Installment Sale">Installment Sale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
              <Filter className="h-4 w-4 text-muted-foreground" />
            </div>
            <Select value={cashTransactionFilter} onValueChange={setCashTransactionFilter}>
              <SelectTrigger className="bg-white border-border/50 pl-10 h-10">
                <SelectValue placeholder="Cash Transaction" />
              </SelectTrigger>
              <SelectContent className="bg-white shadow-lg border border-border/50">
                <SelectItem value="all">All Sales</SelectItem>
                <SelectItem value="linked">Linked to Cash</SelectItem>
                <SelectItem value="unlinked">Not Linked to Cash</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
              <Tag className="h-4 w-4 text-muted-foreground" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="bg-white border-border/50 pl-10 h-10">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-white shadow-lg border border-border/50">
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="none">No Source</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <Select value={dateFilter} onValueChange={handleDateFilterChange}>
              <SelectTrigger className="bg-white border-border/50 pl-10 h-10">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent className="bg-white shadow-lg border border-border/50">
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="last-week">Last Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
                <SelectItem value="specific">Specific Date</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isSpecificDate && (
        <div className="pt-2 pb-1 border-t border-border/20">
          <div className="flex items-center space-x-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-white flex items-center gap-2 h-10 pl-3 text-left font-normal"
                >
                  <CalendarIcon className="h-4 w-4" />
                  <span>{specificDate ? format(specificDate, "MMM d, yyyy") : "Select Date"}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[100] bg-white shadow-lg" align="start">
                <Calendar
                  initialFocus
                  mode="single"
                  defaultMonth={specificDate}
                  selected={specificDate}
                  onSelect={setSpecificDate}
                  className="p-3 pointer-events-auto"
                  showOutsideDays={true}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {isCustomRange && (
        <div className="pt-2 pb-1 border-t border-border/20">
          <DateRangeFilter 
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </div>
      )}
    </div>
  );
};

export default SalesTableFilters;
