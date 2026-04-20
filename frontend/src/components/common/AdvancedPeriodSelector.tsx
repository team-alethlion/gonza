/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths,
  format,
} from "date-fns";

export type PeriodType = "daily" | "weekly" | "monthly" | "custom";

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface AdvancedPeriodSelectorProps {
  initialPeriod?: PeriodType;
  onRangeChange: (range: DateRange) => void;
}

const AdvancedPeriodSelector: React.FC<AdvancedPeriodSelectorProps> = ({
  initialPeriod = "custom",
  onRangeChange,
}) => {
  const [periodType, setPeriodType] = useState<PeriodType>(initialPeriod);

  // Daily State
  const [dailyDate, setDailyDate] = useState<Date>(new Date());

  // Weekly State
  const [weeklyMode, setWeeklyMode] = useState<"past" | "specific">("past");
  const [pastWeeks, setPastWeeks] = useState<number>(2);

  // Monthly State
  const [monthlyMode, setMonthlyMode] = useState<"past" | "specific">("past");
  const [pastMonths, setPastMonths] = useState<number>(2);
  const [specificMonth, setSpecificMonth] = useState<Date>(new Date());

  // Custom State
  const [customStart, setCustomStart] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  });
  const [customEnd, setCustomEnd] = useState<Date>(new Date());

  // 🚀 CORE LOGIC: Calculate exact start/end dates based on current state
  useEffect(() => {
    let start: Date;
    let end: Date;
    const now = new Date();

    switch (periodType) {
      case "daily":
        start = startOfDay(dailyDate);
        end = endOfDay(dailyDate);
        break;

      case "weekly":
        if (weeklyMode === "past") {
          end = endOfDay(now);
          start = startOfDay(subWeeks(now, pastWeeks));
        } else {
          // Default to current week if specific not fully implemented yet
          start = startOfWeek(now);
          end = endOfWeek(now);
        }
        break;

      case "monthly":
        if (monthlyMode === "past") {
          end = endOfDay(now);
          start = startOfDay(subMonths(now, pastMonths));
        } else {
          start = startOfMonth(specificMonth);
          end = endOfMonth(specificMonth);
        }
        break;

      case "custom":
      default:
        start = startOfDay(customStart);
        end = endOfDay(customEnd);
        break;
    }

    onRangeChange({ startDate: start, endDate: end });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    periodType,
    dailyDate,
    weeklyMode,
    pastWeeks,
    monthlyMode,
    pastMonths,
    specificMonth,
    customStart,
    customEnd,
  ]);

  return (
    <div className="flex flex-col sm:flex-row flex-wrap items-end gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
      <div className="space-y-1.5 w-full sm:w-auto">
        <Label className="text-xs text-muted-foreground font-semibold uppercase">
          Period Type
        </Label>
        <Select
          value={periodType}
          onValueChange={(v: PeriodType) => setPeriodType(v)}>
          <SelectTrigger className="w-full sm:w-[150px] bg-white">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {periodType === "daily" && (
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="space-y-1.5 flex-1">
            <Label className="text-xs text-muted-foreground font-semibold uppercase">
              Select Date
            </Label>
            <Input
              type="date"
              value={format(dailyDate, "yyyy-MM-dd")}
              onChange={(e) => setDailyDate(new Date(e.target.value))}
              className="bg-white"
            />
          </div>
          <Button
            variant="outline"
            className="mt-6 bg-white"
            onClick={() => setDailyDate(new Date())}>
            Today
          </Button>
        </div>
      )}

      {periodType === "weekly" && (
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="space-y-1.5 flex-1">
            <Label className="text-xs text-muted-foreground font-semibold uppercase">
              Range
            </Label>
            <Select
              value={pastWeeks.toString()}
              onValueChange={(v) => {
                setWeeklyMode("past");
                setPastWeeks(parseInt(v));
              }}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Current Week</SelectItem>
                <SelectItem value="2">2 Weeks</SelectItem>
                <SelectItem value="3">3 Weeks</SelectItem>
                <SelectItem value="4">4 Weeks</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {periodType === "monthly" && (
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <div className="space-y-1.5 flex-1 w-full sm:w-auto">
            <Label className="text-xs text-muted-foreground font-semibold uppercase">
              Mode
            </Label>
            <Select
              value={monthlyMode}
              onValueChange={(v: any) => setMonthlyMode(v)}>
              <SelectTrigger className="w-full sm:w-[140px] bg-white">
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="past">Range</SelectItem>
                <SelectItem value="specific">Specific Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {monthlyMode === "past" ? (
            <div className="space-y-1.5 flex-1 w-full sm:w-auto">
              <Label className="text-xs text-muted-foreground font-semibold uppercase">
                Range
              </Label>
              <Select
                value={pastMonths.toString()}
                onValueChange={(v) => setPastMonths(parseInt(v))}>
                <SelectTrigger className="w-full sm:w-[140px] bg-white">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Current Month</SelectItem>
                <SelectItem value="2">2 Months</SelectItem>
                <SelectItem value="3">3 Months</SelectItem>
                <SelectItem value="5">5 Months</SelectItem>
                <SelectItem value="6">6 Months</SelectItem>
                <SelectItem value="12">Full Year</SelectItem>
              </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5 flex-1 w-full sm:w-auto">
              <Label className="text-xs text-muted-foreground font-semibold uppercase">
                Month
              </Label>
              <Input
                type="month"
                value={format(specificMonth, "yyyy-MM")}
                onChange={(e) => setSpecificMonth(new Date(e.target.value))}
                className="bg-white"
              />
            </div>
          )}
        </div>
      )}

      {periodType === "custom" && (
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="space-y-1.5 flex-1">
            <Label className="text-xs text-muted-foreground font-semibold uppercase">
              From
            </Label>
            <Input
              type="date"
              value={format(customStart, "yyyy-MM-dd")}
              onChange={(e) => setCustomStart(new Date(e.target.value))}
              className="bg-white"
            />
          </div>
          <div className="space-y-1.5 flex-1">
            <Label className="text-xs text-muted-foreground font-semibold uppercase">
              To
            </Label>
            <Input
              type="date"
              value={format(customEnd, "yyyy-MM-dd")}
              onChange={(e) => setCustomEnd(new Date(e.target.value))}
              className="bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedPeriodSelector;
