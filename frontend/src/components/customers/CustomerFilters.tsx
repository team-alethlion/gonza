"use client";
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, CalendarIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CustomerFiltersProps {
  activeTab: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  dateFilter: string;
  setDateFilter: (filter: string) => void;
  dateRange: { from: Date | undefined; to: Date | undefined };
  setDateRange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  validCategories: Array<{ id: string; name: string }>;
  filteredCustomers: any[];
  customerStats: {
    categoryBreakdown: Record<string, number>;
  };
  getCategoryName: (categoryId: string | null) => string;
}

const CustomerFilters: React.FC<CustomerFiltersProps> = ({
  activeTab,
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  dateFilter,
  setDateFilter,
  dateRange,
  setDateRange,
  validCategories,
  filteredCustomers,
  customerStats,
  getCategoryName
}) => {
  const isCustomRange = dateFilter === 'custom';

  // Ensure dateRange has valid default values
  const safeDateRange = dateRange || { from: undefined, to: undefined };

  if (activeTab !== 'list' && activeTab !== 'top' && activeTab !== 'inactive') {
    return null;
  }

  return (
    <div className="xl:w-80 w-full space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Search & Filter</h3>
        <p className="text-gray-600 text-sm">Find customers quickly</p>
      </div>
      {activeTab === 'list' && (
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            placeholder="Search by name, contact, or location..."
            autoComplete="off"
            className="pl-12 h-12 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg shadow-sm transition-all duration-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}

      {/* Category Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Filter by Category</Label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="h-12">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {validCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name} ({customerStats.categoryBreakdown[category.id] || 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date Filter */}
      {(activeTab === 'top' || activeTab === 'list') && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Filter by Date</Label>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="All time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="last-week">Last Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Custom Date Range Picker */}
      {isCustomRange && (activeTab === 'top' || activeTab === 'list') && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Select Date Range</Label>
          <div className="flex flex-col gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-12",
                    !safeDateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {safeDateRange.from ? format(safeDateRange.from, "MMM d, yyyy") : "Start Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                <Calendar
                  mode="single"
                  selected={safeDateRange.from}
                  onSelect={(date) => setDateRange({ ...safeDateRange, from: date })}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-12",
                    !safeDateRange.to && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {safeDateRange.to ? format(safeDateRange.to, "MMM d, yyyy") : "End Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                <Calendar
                  mode="single"
                  selected={safeDateRange.to}
                  onSelect={(date) => setDateRange({ ...safeDateRange, to: date })}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {(searchTerm || selectedCategory !== 'all') && activeTab === 'list' && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <p className="text-sm text-blue-700 font-medium">
            Found {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}
            {selectedCategory !== 'all' && ` in ${getCategoryName(selectedCategory)}`}
          </p>
        </div>
      )}
    </div>
  );
};

export default CustomerFilters;