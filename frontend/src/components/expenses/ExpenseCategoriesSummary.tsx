/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PieChart,
  Pie,
  ResponsiveContainer,
  Cell,
  Legend,
  Tooltip,
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Expense } from "@/hooks/useExpenses";
import { useFinancialVisibility } from "@/hooks/useFinancialVisibility";

type CategorySummaryItem = {
  name: string;
  value: number;
  percentage: number;
  count: number;
};

type ExpenseCategoriesSummaryProps = {
  expenses: Expense[];
  formatCurrency: (amount: number) => string;
};

// Generate improved color palette for pie chart segments
const COLORS = [
  "#9b87f5",
  "#7E69AB",
  "#6E59A5",
  "#D6BCFA",
  "#E5DEFF",
  "#0EA5E9",
  "#F97316",
  "#D946EF",
  "#F2FCE2",
  "#FEF7CD",
  "#FEC6A1",
  "#FFDEE2",
  "#FDE1D3",
  "#D3E4FD",
  "#F1F0FB",
];

// Custom tooltip for the pie chart
const CustomTooltip = ({
  active,
  payload,
  canViewTotalExpenses,
  formatCurrency,
}: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card p-3 shadow rounded border border-border text-sm">
        <p className="font-medium text-foreground">{data.name}</p>
        <p className="text-primary">
          {canViewTotalExpenses ? formatCurrency(data.value) : "•••"}
        </p>
        <p className="text-muted-foreground">
          {data.percentage.toFixed(1)}% of total
        </p>
        <p className="text-xs">
          {data.count} expense{data.count !== 1 ? "s" : ""}
        </p>
      </div>
    );
  }
  return null;
};

const ExpenseCategoriesSummary: React.FC<ExpenseCategoriesSummaryProps> = ({
  expenses,
  formatCurrency,
}) => {
  const { canViewTotalExpenses } = useFinancialVisibility();
  const [viewMode, setViewMode] = useState<"category" | "person">("category");

  // Process expenses data to get category or person in charge summaries
  const summarizedData = useMemo(() => {
    const totalExpenseAmount = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0,
    );

    if (viewMode === "category") {
      // Group by category (case insensitive)
      const categoryMap = new Map<string, { total: number; count: number }>();

      expenses.forEach((expense) => {
        // Normalize category name (case insensitive) and handle null
        const categoryName = (expense.category || "Uncategorized")
          .toLowerCase()
          .trim();

        const existingCategory = categoryMap.get(categoryName);
        if (existingCategory) {
          existingCategory.total += expense.amount;
          existingCategory.count += 1;
        } else {
          categoryMap.set(categoryName, { total: expense.amount, count: 1 });
        }
      });

      // Convert map to array and sort by amount (descending)
      return Array.from(categoryMap.entries())
        .map(([name, { total, count }]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize first letter
          value: total,
          percentage: (total / totalExpenseAmount) * 100,
          count,
        }))
        .sort((a, b) => b.value - a.value);
    } else {
      // Group by person in charge (case insensitive)
      const personMap = new Map<string, { total: number; count: number }>();

      expenses.forEach((expense) => {
        // Normalize person name (case insensitive) and handle null
        const personName = (expense.personInCharge || "Unassigned")
          .toLowerCase()
          .trim();

        const existingPerson = personMap.get(personName);
        if (existingPerson) {
          existingPerson.total += expense.amount;
          existingPerson.count += 1;
        } else {
          personMap.set(personName, { total: expense.amount, count: 1 });
        }
      });

      // Convert map to array and sort by amount (descending)
      return Array.from(personMap.entries())
        .map(([name, { total, count }]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize first letter
          value: total,
          percentage: (total / totalExpenseAmount) * 100,
          count,
        }))
        .sort((a, b) => b.value - a.value);
    }
  }, [expenses, viewMode]);

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg sm:text-xl">
            Expense Distribution
          </CardTitle>
          <Tabs
            value={viewMode}
            onValueChange={(value) =>
              setViewMode(value as "category" | "person")
            }
            className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="category">By Category</TabsTrigger>
              <TabsTrigger value="person">By Person</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {summarizedData.length > 0 ? (
          <div className="flex flex-col lg:flex-row space-y-6 lg:space-y-0 lg:space-x-4">
            {/* Chart section */}
            <div className="w-full lg:w-1/2 flex flex-col items-center">
              <div className="h-[220px] sm:h-[260px] w-full max-w-[280px] mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <Pie
                      data={summarizedData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      innerRadius={36}
                      paddingAngle={1.5}
                      dataKey="value"
                      stroke="#ffffff"
                      strokeWidth={1.5}>
                      {summarizedData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          className="hover:opacity-80 transition-opacity"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={
                        <CustomTooltip
                          canViewTotalExpenses={canViewTotalExpenses}
                          formatCurrency={formatCurrency}
                        />
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-2 text-xs text-center text-muted-foreground">
                <p>Tap segments for details</p>
              </div>
            </div>

            {/* Legend section - Mobile optimized */}
            <div className="w-full lg:w-1/2">
              <div className="space-y-1">
                <h3 className="text-sm font-medium mb-1.5 px-1">
                  {viewMode === "category" ? "Categories" : "People"} Breakdown
                </h3>
                <div className="space-y-0 max-h-[220px] sm:max-h-[260px] overflow-y-auto pr-1 rounded-md">
                  {summarizedData.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center border-b border-border/40 py-2 px-1 hover:bg-muted/50 rounded-sm transition-colors">
                      <div className="flex items-center space-x-1.5">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                        <span className="truncate max-w-[120px] sm:max-w-[160px] text-xs sm:text-sm">
                          {item.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-xs sm:text-sm">
                          {canViewTotalExpenses
                            ? formatCurrency(item.value)
                            : "•••"}
                        </div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground">
                          {item.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[160px] sm:h-[200px] text-center text-muted-foreground">
            <p className="text-sm">No expense data available.</p>
            <p className="text-xs mt-2">
              Try a different date range or add some expenses.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpenseCategoriesSummary;
