"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import DateRangeFilter from '@/components/sales/DateRangeFilter';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface StockSummaryFiltersProps {
  period: 'today' | 'yesterday' | 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'this-year' | 'all-time' | 'specific-day' | 'custom';
  setPeriod: (period: any) => void;
  dateRange: { from: Date | undefined; to: Date | undefined };
  setDateRange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  specificDay: Date | undefined;
  setSpecificDay: (date: Date | undefined) => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
}

const StockSummaryFilters: React.FC<StockSummaryFiltersProps> = ({
  period,
  setPeriod,
  dateRange,
  setDateRange,
  specificDay,
  setSpecificDay,
  onExportCSV,
  onExportPDF
}) => {
  const getPeriodLabel = () => {
    switch (period) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'this-week': return 'This Week';
      case 'last-week': return 'Last Week';
      case 'this-month': return 'This Month';
      case 'last-month': return 'Last Month';
      case 'this-year': return 'This Year';
      case 'all-time': return 'All Time';
      case 'specific-day': return 'Specific Day';
      case 'custom': return 'Custom Range';
      default: return 'This Month';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Export Buttons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h3 className="text-lg font-semibold">Stock Summary</h3>
        <div className="flex flex-col md:flex-row gap-2">
          <Button onClick={onExportCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button onClick={onExportPDF} variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Period Selector */}
        <div className="w-full md:w-[200px]">
          <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="last-week">Last Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
              <SelectItem value="all-time">All Time</SelectItem>
              <SelectItem value="specific-day">Specific Day</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Specific Day Picker */}
        {period === 'specific-day' && (
          <div className="w-full md:w-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full md:w-[240px] justify-start text-left font-normal bg-white",
                    !specificDay && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {specificDay ? format(specificDay, "PPP") : <span>Pick a specific day</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[100] bg-white shadow-lg" align="start">
                <Calendar
                  mode="single"
                  selected={specificDay}
                  onSelect={setSpecificDay}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Custom Date Range */}
        {period === 'custom' && (
          <DateRangeFilter
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        )}
      </div>

      {/* Current Period Display */}
      <div className="text-sm text-muted-foreground">
        Showing data for: <span className="font-medium">{getPeriodLabel()}</span>
        {period === 'specific-day' && specificDay && (
          <span className="ml-2">
            ({format(specificDay, "MMM d, yyyy")})
          </span>
        )}
        {period === 'custom' && dateRange?.from && dateRange?.to && (
          <span className="ml-2">
            ({format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")})
          </span>
        )}
      </div>
    </div>
  );
};

export default StockSummaryFilters;
