"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface PLDateFilterProps {
  dateRange: { from: Date | undefined; to: Date | undefined };
  onDateRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
}

const PLDateFilter: React.FC<PLDateFilterProps> = ({
  dateRange,
  onDateRangeChange
}) => {
  const setCurrentMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    onDateRangeChange({ from: firstDay, to: lastDay });
  };

  const setCurrentYear = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), 0, 1);
    const lastDay = new Date(now.getFullYear(), 11, 31);
    onDateRangeChange({ from: firstDay, to: lastDay });
  };

  const setLastMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    onDateRangeChange({ from: firstDay, to: lastDay });
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={setCurrentMonth}>
          This Month
        </Button>
        <Button variant="outline" size="sm" onClick={setLastMonth}>
          Last Month
        </Button>
        <Button variant="outline" size="sm" onClick={setCurrentYear}>
          This Year
        </Button>
      </div>

      <div className="flex gap-2 items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "justify-start text-left font-normal",
                !dateRange.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from ? format(dateRange.from, "MMM dd, yyyy") : "From date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateRange.from}
              onSelect={(date) => onDateRangeChange({ ...dateRange, from: date })}
              disabled={(date) => date > new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "justify-start text-left font-normal",
                !dateRange.to && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.to ? format(dateRange.to, "MMM dd, yyyy") : "To date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateRange.to}
              onSelect={(date) => onDateRangeChange({ ...dateRange, to: date })}
              disabled={(date) => date > new Date() || !!(dateRange.from && date < dateRange.from)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default PLDateFilter;
