"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { useBusiness } from "@/contexts/BusinessContext";
import { useActivityHistory } from "@/hooks/useActivityHistory";
import { HistoryList } from "@/components/history/HistoryList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { format } from "date-fns";
import { Calendar as CalendarIcon, Filter, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import LoadingSpinner from "@/components/LoadingSpinner";

export interface ActivityFilters {
  activityType: "ALL" | "CREATE" | "UPDATE" | "DELETE";
  module:
    | "ALL"
    | "SALES"
    | "INVENTORY"
    | "EXPENSES"
    | "FINANCE"
    | "CUSTOMERS"
    | "TASKS";
  search: string;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

const HistoryPage = () => {
  const { currentBusiness } = useBusiness();
  const [filters, setFilters] = useState<ActivityFilters>({
    activityType: "ALL",
    module: "ALL",
    search: "",
    dateRange: {
      from: undefined,
      to: undefined,
    },
  });

  const { activities, isLoading, totalPages, currentPage, setCurrentPage } =
    useActivityHistory(currentBusiness?.id, filters);

  const clearFilters = () => {
    setFilters({
      activityType: "ALL",
      module: "ALL",
      search: "",
      dateRange: {
        from: undefined,
        to: undefined,
      },
    });
  };

  const hasActiveFilters =
    filters.activityType !== "ALL" ||
    filters.module !== "ALL" ||
    filters.search !== "" ||
    filters.dateRange.from !== undefined;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recent Activity</h1>
          <p className="text-muted-foreground mt-1">
            Track all actions and changes across your business
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 px-2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                className="pl-9"
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
              />
            </div>

            {/* Module Filter */}
            <Select
              value={filters.module}
              onValueChange={(value: any) =>
                setFilters((prev) => ({ ...prev, module: value }))
              }>
              <SelectTrigger>
                <SelectValue placeholder="All Modules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Modules</SelectItem>
                <SelectItem value="SALES">Sales</SelectItem>
                <SelectItem value="INVENTORY">Inventory</SelectItem>
                <SelectItem value="EXPENSES">Expenses</SelectItem>
                <SelectItem value="CUSTOMERS">Customers</SelectItem>
                <SelectItem value="FINANCE">Finance</SelectItem>
                <SelectItem value="TASKS">Tasks</SelectItem>
              </SelectContent>
            </Select>

            {/* Activity Type Filter */}
            <Select
              value={filters.activityType}
              onValueChange={(value: any) =>
                setFilters((prev) => ({ ...prev, activityType: value }))
              }>
              <SelectTrigger>
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Actions</SelectItem>
                <SelectItem value="CREATE">Created</SelectItem>
                <SelectItem value="UPDATE">Updated</SelectItem>
                <SelectItem value="DELETE">Deleted</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "justify-start text-left font-normal",
                    !filters.dateRange.from && "text-muted-foreground",
                  )}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange.from ? (
                    filters.dateRange.to ? (
                      <>
                        {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                        {format(filters.dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(filters.dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={filters.dateRange.from}
                  selected={filters.dateRange}
                  onSelect={(range) =>
                    setFilters((prev) => ({
                      ...prev,
                      dateRange: { from: range?.from, to: range?.to },
                    }))
                  }
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner message="Loading activity history..." />
        </div>
      ) : (
        <div className="space-y-4">
          <HistoryList activities={activities} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}>
                Previous
              </Button>
              <div className="flex items-center px-4 text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}>
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
