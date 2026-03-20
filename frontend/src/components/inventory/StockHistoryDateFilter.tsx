
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';

interface StockHistoryDateFilterProps {
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
}

const StockHistoryDateFilter: React.FC<StockHistoryDateFilterProps> = ({
  selectedFilter,
  onFilterChange
}) => {
  return (
    <div className="flex items-center gap-2">
      <Calendar size={16} />
      <Select value={selectedFilter} onValueChange={onFilterChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select date range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="yesterday">Yesterday</SelectItem>
          <SelectItem value="this-week">This Week</SelectItem>
          <SelectItem value="last-week">Last Week</SelectItem>
          <SelectItem value="this-month">This Month</SelectItem>
          <SelectItem value="last-month">Last Month</SelectItem>
          <SelectItem value="this-year">This Year</SelectItem>
          <SelectItem value="all">All Time</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default StockHistoryDateFilter;
