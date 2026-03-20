"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search, RefreshCw } from "lucide-react";
import { ActivityFilters } from "@/app/(agency)/agency/history/page";
import { ActivityType, ModuleType } from "@/hooks/useActivityLogger";

interface HistoryFiltersProps {
  filters: ActivityFilters;
  onFiltersChange: (filters: ActivityFilters) => void;
  onRefresh: () => void;
}

export const HistoryFilters: React.FC<HistoryFiltersProps> = ({
  filters,
  onFiltersChange,
  onRefresh,
}) => {
  const updateFilter = (key: keyof ActivityFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-card border rounded-lg p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Date Range
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start text-left font-normal">
                  {filters.dateRange.from
                    ? filters.dateRange.from.toLocaleDateString()
                    : "From date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.dateRange.from}
                  onSelect={(date) =>
                    updateFilter("dateRange", {
                      ...filters.dateRange,
                      from: date,
                    })
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start text-left font-normal">
                  {filters.dateRange.to
                    ? filters.dateRange.to.toLocaleDateString()
                    : "To date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.dateRange.to}
                  onSelect={(date) =>
                    updateFilter("dateRange", {
                      ...filters.dateRange,
                      to: date,
                    })
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Activity Type
          </label>
          <Select
            value={filters.activityType}
            onValueChange={(value: ActivityType) =>
              updateFilter("activityType", value)
            }>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="CREATE">Created</SelectItem>
              <SelectItem value="UPDATE">Updated</SelectItem>
              <SelectItem value="DELETE">Deleted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Module</label>
          <Select
            value={filters.module}
            onValueChange={(value: ModuleType) =>
              updateFilter("module", value)
            }>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Modules</SelectItem>
              <SelectItem value="SALES">Sales</SelectItem>
              <SelectItem value="INVENTORY">Inventory</SelectItem>
              <SelectItem value="EXPENSES">Expenses</SelectItem>
              <SelectItem value="FINANCE">Finance</SelectItem>
              <SelectItem value="CUSTOMERS">Customers</SelectItem>
              <SelectItem value="TASKS">Tasks</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <Button
          onClick={onRefresh}
          variant="outline"
          size="sm"
          className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
    </div>
  );
};
