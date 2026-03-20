
"use client";

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface DateRangeFilterProps {
  dateFilter: string;
  dateRange: { from: Date | undefined; to: Date | undefined; };
  specificDate?: Date | undefined;
  isCustomRange: boolean;
  isSpecificDate?: boolean;
  onDateFilterChange: (value: string) => void;
  onDateRangeChange: (range: { from: Date | undefined; to: Date | undefined; }) => void;
  onSpecificDateChange?: (date: Date | undefined) => void;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  dateFilter,
  dateRange,
  specificDate,
  isCustomRange,
  isSpecificDate = false,
  onDateFilterChange,
  onDateRangeChange,
  onSpecificDateChange
}) => {
  // Simplified event prevention
  const preventPropagation = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
  };
  
  return (
    <div 
      className="flex gap-4 items-center flex-wrap mb-4"
      onClick={preventPropagation}
    >
      <div className="w-[240px] relative">
        <Select value={dateFilter} onValueChange={onDateFilterChange}>
          <SelectTrigger className="bg-white shadow-sm">
            <SelectValue placeholder="Select date range" />
          </SelectTrigger>
          <SelectContent className="z-[9999] bg-white shadow-lg border border-border/50">
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="this-week">This Week</SelectItem>
            <SelectItem value="last-week">Last Week</SelectItem>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="last-month">Last Month</SelectItem>
            <SelectItem value="this-year">This Year</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="specific">Specific Date</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isSpecificDate && onSpecificDateChange && (
        <div className="flex items-center">
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
            <PopoverContent className="w-auto p-0 z-[9999] bg-white shadow-lg" align="start">
              <Calendar
                initialFocus
                mode="single"
                defaultMonth={specificDate}
                selected={specificDate}
                onSelect={onSpecificDateChange}
                className="p-3 pointer-events-auto"
                showOutsideDays={true}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {isCustomRange && (
        <div className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="bg-white flex items-center gap-2 h-10 pl-3 text-left font-normal"
              >
                <CalendarIcon className="h-4 w-4" />
                <span>{dateRange.from ? format(dateRange.from, "MMM d, yyyy") : "Start Date"}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[9999] bg-white shadow-lg" align="start">
              <Calendar
                initialFocus
                mode="single"
                defaultMonth={dateRange?.from}
                selected={dateRange?.from}
                onSelect={(date) => onDateRangeChange({ ...dateRange, from: date })}
                className="p-3 pointer-events-auto"
                showOutsideDays={true}
              />
            </PopoverContent>
          </Popover>
          
          <span className="text-muted-foreground">to</span>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="bg-white flex items-center gap-2 h-10 pl-3 text-left font-normal"
              >
                <CalendarIcon className="h-4 w-4" />
                <span>{dateRange.to ? format(dateRange.to, "MMM d, yyyy") : "End Date"}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[9999] bg-white shadow-lg" align="start">
              <Calendar
                initialFocus
                mode="single"
                defaultMonth={dateRange?.to}
                selected={dateRange?.to}
                onSelect={(date) => onDateRangeChange({ ...dateRange, to: date })}
                className="p-3 pointer-events-auto"
                showOutsideDays={true}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
};

export default DateRangeFilter;
