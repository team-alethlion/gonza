/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthProvider";
import { useBusiness } from "@/contexts/BusinessContext";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { toast } from "sonner";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
} from "date-fns";
import BusinessGoalsTip from "@/components/BusinessGoalsTip";
import { useFinancialVisibility } from "@/hooks/useFinancialVisibility";
import {
  getSalesGoalAction,
  upsertSalesGoalAction,
  getPeriodSalesAction,
  getSalesGoalProgressAction,
} from "@/app/actions/sales";

type GoalType = "daily" | "weekly" | "monthly";

interface GoalContentProps {
  goalType: GoalType;
  isLoading: boolean;
  currentGoal: number;
  currentSales: number;
  progress: number;
  periodLabel: string;
  formatCurrency: (amount: number) => string;
  goalInput: string;
  onGoalInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpdateGoal: () => void;
  isUpdating: boolean;
  canViewTotalSales?: boolean;
}

const GoalContent = React.memo<GoalContentProps>(
  ({
    goalType,
    isLoading,
    currentGoal,
    currentSales,
    progress,
    periodLabel,
    formatCurrency,
    goalInput,
    onGoalInputChange,
    onUpdateGoal,
    isUpdating,
    canViewTotalSales = true,
  }) => (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">{periodLabel}</div>

      {isLoading ? (
        <div className="text-center py-4">
          <p className="text-muted-foreground">Loading sales data...</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {goalType.charAt(0).toUpperCase() + goalType.slice(1)} Goal
            </span>
            <span className="text-sm font-bold">
              {canViewTotalSales ? formatCurrency(currentGoal) : "•••"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Sales</span>
            <span className="text-sm font-bold">
              {canViewTotalSales ? formatCurrency(currentSales || 0) : "•••"}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm font-bold">{progress.toFixed(1)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                key={`${goalType}-input`}
                type="number"
                placeholder={`Enter ${goalType} goal amount`}
                value={goalInput}
                onChange={onGoalInputChange}
                min="0"
                step="0.01"
                className="flex-1"
              />
              <Button
                onClick={onUpdateGoal}
                disabled={isUpdating || !goalInput.trim()}>
                {isUpdating ? "Updating..." : "Set Goal"}
              </Button>
            </div>
          </div>

          {currentGoal > 0 && (
            <div className="text-xs text-muted-foreground">
              {currentSales >= currentGoal ? (
                <span className="text-green-600 font-medium">
                  🎉 Goal achieved!
                </span>
              ) : (
                <span>
                  {canViewTotalSales
                    ? `${formatCurrency(
                        currentGoal - (currentSales || 0),
                      )} remaining to reach goal`
                    : "••• remaining"}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  ),
);

GoalContent.displayName = "GoalContent";

const SalesGoalTracker = ({ 
  initialGoal, 
  initialGoals = {},
  isSummaryLoading = false 
}: { 
  initialGoal?: any; 
  initialGoals?: Record<string, any>;
  isSummaryLoading?: boolean;
}) => {
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();
  const { settings } = useBusinessSettings();
  const { canViewTotalSales } = useFinancialVisibility();
  const queryClient = useQueryClient();

  // 🚀 PERF: Detect if we have any data (even null) from SSR
  const hasInitialGoalData = initialGoal !== undefined || Object.keys(initialGoals).length > 0;

  const [currentDate] = useState(() => new Date());
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const [goalInput, setGoalInput] = useState("");
  const [selectedGoalType, setSelectedGoalType] = useState<GoalType>("monthly");

  const currentPeriod = useMemo(() => {
    let startDate: Date, endDate: Date;
    switch (selectedGoalType) {
      case "daily":
        startDate = startOfDay(currentDate);
        endDate = endOfDay(currentDate);
        break;
      case "weekly":
        startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
        endDate = endOfWeek(currentDate, { weekStartsOn: 1 });
        break;
      case "monthly":
      default:
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
        break;
    }
    return { startDate, endDate };
  }, [selectedGoalType, currentDate]);

  useEffect(() => {
    // Reset goal input when business changes
    if (currentBusiness?.id) {
      setTimeout(() => setGoalInput(""), 0);
    }
  }, [currentBusiness?.id]);

  // 🚀 OPTIMIZED: Combined Fetch for Goal and Progress
  const { data: progressData, isLoading: isProgressLoading } = useQuery({
    queryKey: [
      "sales-goal-progress",
      currentBusiness?.id,
      selectedGoalType,
      currentPeriod.startDate.toISOString(),
    ],
    queryFn: async () => {
      if (!currentBusiness?.id) return null;
      const result = await getSalesGoalProgressAction(
        currentBusiness.id,
        selectedGoalType.toUpperCase() as any,
        currentPeriod.startDate,
        currentPeriod.endDate
      );
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: !!currentBusiness?.id,
    staleTime: (hasInitialGoalData) ? 300000 : 60000,
    // 🚀 PERF: Trust the pre-fetched map for ANY selected period
    initialData: () => {
      const type = selectedGoalType.toLowerCase();
      const mappedGoal = initialGoals[type];
      
      if (mappedGoal) {
        return {
          goal: {
            id: mappedGoal.id,
            target: mappedGoal.amountTarget,
            period: mappedGoal.period,
            period_name: mappedGoal.periodName,
          },
          current_sales: mappedGoal.currentAmount || 0,
          progress_percentage: mappedGoal.progressPercentage || 0
        };
      }
      
      // Fallback to legacy single initialGoal if it matches the current type
      if (selectedGoalType === 'monthly' && initialGoal) {
        return {
          goal: {
            id: initialGoal.id,
            target: initialGoal.amountTarget,
            period: initialGoal.period,
            period_name: initialGoal.periodName,
          },
          current_sales: initialGoal?.currentAmount || 0,
          progress_percentage: initialGoal ? (initialGoal.currentAmount / initialGoal.amountTarget * 100) : 0
        };
      }
      return undefined;
    }
  });

  const salesGoal = progressData?.goal;
  const currentSales = progressData?.current_sales ?? 0;

  // Update sales goal mutation
  const updateGoalMutation = useMutation({
    mutationFn: async ({ amount }: { amount: number }) => {
      if (!user?.id || !currentBusiness?.id)
        throw new Error("User or location not available");
      const result = await upsertSalesGoalAction(
        user.id,
        currentBusiness.id,
        selectedGoalType.toUpperCase() as any,
        currentPeriod.startDate,
        currentPeriod.endDate,
        amount,
        salesGoal?.id ?? null,
      );
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      toast.success(
        `${
          selectedGoalType.charAt(0).toUpperCase() + selectedGoalType.slice(1)
        } goal updated successfully!`,
      );
      queryClient.invalidateQueries({
        queryKey: [
          "sales-goal-progress",
          currentBusiness?.id,
          selectedGoalType,
          currentPeriod.startDate.toISOString(),
        ],
      });
      setGoalInput("");
    },
    onError: (error: any) => {
      console.error("Failed to update sales goal:", error);
      toast.error(
        error.message || "Failed to update sales goal. Please try again.",
      );
    },
  });

  const handleGoalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setGoalInput(value);
    }
  };

  const handleUpdateGoal = () => {
    const goal = parseFloat(goalInput);
    if (isNaN(goal) || goal < 0) {
      toast.error("Please enter a valid goal amount");
      return;
    }
    updateGoalMutation.mutate({ amount: goal });
  };

  const handleTabChange = (value: string) => {
    setSelectedGoalType(value as GoalType);
  };

  const currentGoal = Number(salesGoal?.target ?? 0);
  const progress = Math.min(progressData?.progress_percentage ?? 0, 100);
  const isLoading = isProgressLoading;

  const periodLabel = useMemo(() => {
    switch (selectedGoalType) {
      case "daily":
        return format(currentDate, "MMMM d, yyyy");
      case "weekly":
        return `Week of ${format(
          startOfWeek(currentDate, { weekStartsOn: 1 }),
          "MMM d",
        )}`;
      case "monthly":
        return format(currentDate, "MMMM yyyy");
      default:
        return "";
    }
  }, [selectedGoalType, currentDate]);

  const formatCurrency = useMemo(
    () => (amount: number) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: settings?.currency || "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
    },
    [settings?.currency],
  );

  if (!user || !currentBusiness) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales Goal Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Please select a business location to track sales goals.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gonza Sales Goal Tracker</CardTitle>
        <div className="text-sm text-muted-foreground">
          Business: {currentBusiness.name}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedGoalType} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>

          <TabsContent value="daily">
            <GoalContent
              goalType="daily"
              isLoading={isLoading}
              currentGoal={currentGoal}
              currentSales={currentSales ?? 0}
              progress={progress}
              periodLabel={periodLabel}
              formatCurrency={formatCurrency}
              goalInput={goalInput}
              onGoalInputChange={handleGoalInputChange}
              onUpdateGoal={handleUpdateGoal}
              isUpdating={updateGoalMutation.isPending}
              canViewTotalSales={canViewTotalSales}
            />
          </TabsContent>

          <TabsContent value="weekly">
            <GoalContent
              goalType="weekly"
              isLoading={isLoading}
              currentGoal={currentGoal}
              currentSales={currentSales ?? 0}
              progress={progress}
              periodLabel={periodLabel}
              formatCurrency={formatCurrency}
              goalInput={goalInput}
              onGoalInputChange={handleGoalInputChange}
              onUpdateGoal={handleUpdateGoal}
              isUpdating={updateGoalMutation.isPending}
              canViewTotalSales={canViewTotalSales}
            />
          </TabsContent>

          <TabsContent value="monthly">
            <GoalContent
              goalType="monthly"
              isLoading={isLoading}
              currentGoal={currentGoal}
              currentSales={currentSales ?? 0}
              progress={progress}
              periodLabel={periodLabel}
              formatCurrency={formatCurrency}
              goalInput={goalInput}
              onGoalInputChange={handleGoalInputChange}
              onUpdateGoal={handleUpdateGoal}
              isUpdating={updateGoalMutation.isPending}
              canViewTotalSales={canViewTotalSales}
            />
          </TabsContent>
        </Tabs>

        <BusinessGoalsTip />
      </CardContent>
    </Card>
  );
};

export default SalesGoalTracker;
