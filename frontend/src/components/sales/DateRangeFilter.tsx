"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface DateRangeFilterProps {
  dateRange: { from: Date | undefined; to: Date | undefined; };
  onDateRangeChange: (range: { from: Date | undefined; to: Date | undefined; }) => void;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  dateRange,
  onDateRangeChange
}) => {
  // Improved event prevention that doesn't interfere with the button click
  const preventPropagation = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
  };
  
  return (
    <div 
      className="flex items-center space-x-2"
      onClick={preventPropagation}
    >
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
        <PopoverContent className="w-auto p-0 z-[100] bg-white shadow-lg" align="start">
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
        <PopoverContent className="w-auto p-0 z-[100] bg-white shadow-lg" align="start">
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
  );
};

export default DateRangeFilter;
