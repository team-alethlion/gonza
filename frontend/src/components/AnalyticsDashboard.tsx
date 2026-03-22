/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useMemo, memo } from "react";
import { Sale, BusinessSettings, Product, AnalyticsData } from "@/types";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { formatNumber } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import DateRangeFilter from "./analytics/DateRangeFilter";
import AnalyticsCards from "./analytics/AnalyticsCards";
import FinancialOverview from "./analytics/FinancialOverview";
import SalesGoalTracker from "./SalesGoalTracker";
import RecentSalesTable from "./analytics/RecentSalesTable";
import SalesPerformanceChart from "./analytics/SalesPerformanceChart";
import { useProductsBase } from "@/hooks/useProductsBase";
import { useAuth } from "@/components/auth/AuthProvider";
import { useFinancialVisibility } from "@/hooks/useFinancialVisibility";

interface AnalyticsDashboardProps {
  sales: Sale[];
  currency?: string;
  initialAnalytics?: AnalyticsData | null;
}

const DEFAULT_SETTINGS: BusinessSettings = {
  businessName: "Your Business Name",
  businessAddress: "Your Business Address",
  businessPhone: "(123) 456-7890",
  businessEmail: "support@yourbusiness.com",
  businessLogo: "",
  currency: "UGX",
};

const AnalyticsDashboard = memo<AnalyticsDashboardProps>(
  ({ sales, currency = "UGX", initialAnalytics }) => {
    const isMobile = useIsMobile();
    const { user } = useAuth();
    const [settings, setSettings] = useState<BusinessSettings>({
      ...DEFAULT_SETTINGS,
      currency,
    });
    const [dateFilter, setDateFilter] = useState("all");
    const [dateRange, setDateRange] = useState<{
      from: Date | undefined;
      to: Date | undefined;
    }>({
      from: undefined,
      to: undefined,
    });
    const [specificDate, setSpecificDate] = useState<Date | undefined>(
      undefined,
    );
    const [isCustomRange, setIsCustomRange] = useState(false);
    const [isSpecificDate, setIsSpecificDate] = useState(false);
    const { products, isLoading: isLoadingProducts } = useProductsBase(
      user?.id,
    );
    const {
      canViewCostPrice,
      canViewTotalSales,
      canViewTotalGrossProfit,
      canViewTotalExpenses,
      canViewInventoryValue,
      canViewSalesTypes,
    } = useFinancialVisibility();

    // Memoize inventory value calculation
    const inventoryValue = useMemo(() => {
      if (!products || products.length === 0) return 0;
      if (!canViewCostPrice) return 0;
      return products.reduce(
        (sum, product) => sum + product.costPrice * product.quantity,
        0,
      );
    }, [products, canViewCostPrice]);

    // Memoize settings update
    const memoizedSettings = useMemo(() => {
      const baseSettings = { ...DEFAULT_SETTINGS, currency };
      if (typeof window === "undefined") return baseSettings;

      const savedSettings = localStorage.getItem("businessSettings");
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          return { ...parsed, currency: currency || parsed.currency };
        } catch {
          return baseSettings;
        }
      }
      return baseSettings;
    }, [currency]);

    useEffect(() => {
      setSettings(memoizedSettings);
    }, [memoizedSettings]);

    // Memoize date filter handlers
    const handleDateFilterChange = useMemo(
      () => (value: string) => {
        setDateFilter(value);
        if (value === "custom") {
          setIsCustomRange(true);
          setIsSpecificDate(false);
          setSpecificDate(undefined);
        } else if (value === "specific") {
          setIsSpecificDate(true);
          setIsCustomRange(false);
          setDateRange({ from: undefined, to: undefined });
        } else {
          setIsCustomRange(false);
          setIsSpecificDate(false);
          setDateRange({ from: undefined, to: undefined });
          setSpecificDate(undefined);
        }
      },
      [],
    );

    const handleRangeSelect = useMemo(
      () => (range: { from: Date | undefined; to: Date | undefined }) => {
        setDateRange(range);
        if (range.from && range.to) {
          setIsCustomRange(true);
          setDateFilter("custom");
        }
      },
      [],
    );

    const handleSpecificDateChange = useMemo(
      () => (date: Date | undefined) => {
        setSpecificDate(date);
        if (date) {
          setIsSpecificDate(true);
          setDateFilter("specific");
        }
      },
      [],
    );

    const {
      analyticsData,
      barChartData,
      recentSales,
      nonQuoteSalesCount,
      expenses,
      isLoadingExpenses,
    } = useAnalyticsData({
      sales,
      dateFilter,
      dateRange,
      specificDate,
      isCustomRange,
      isSpecificDate,
      initialAnalytics,
    });

    const formatCurrency = (value: any) => {
      return `${settings.currency} ${formatNumber(value)}`;
    };

    const isLoading = isLoadingExpenses || isLoadingProducts;

    return (
      <div className="space-y-6 w-full">
        <DateRangeFilter
          dateFilter={dateFilter}
          dateRange={dateRange}
          specificDate={specificDate}
          isCustomRange={isCustomRange}
          isSpecificDate={isSpecificDate}
          onDateFilterChange={handleDateFilterChange}
          onDateRangeChange={handleRangeSelect}
          onSpecificDateChange={handleSpecificDateChange}
        />

        <AnalyticsCards
          analyticsData={analyticsData}
          nonQuoteSalesCount={nonQuoteSalesCount}
          currency={settings.currency}
          expenses={expenses}
          inventoryValue={inventoryValue}
          canViewProfit={canViewTotalGrossProfit}
          canViewTotalSales={canViewTotalSales}
          canViewTotalExpenses={canViewTotalExpenses}
          canViewInventoryValue={canViewInventoryValue}
          canViewSalesTypes={canViewSalesTypes}
        />

        <SalesPerformanceChart
          sales={sales}
          formatCurrency={formatCurrency}
          dateFilter={dateFilter}
          dateRange={dateRange}
          isCustomRange={isCustomRange}
        />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <FinancialOverview
              data={barChartData.filter((d) => {
                const name = d.name.toLowerCase();
                if (name.includes("sales")) return canViewTotalSales;
                if (name.includes("cost") || name.includes("expenses"))
                  return canViewTotalExpenses;
                if (name.includes("profit")) return canViewTotalGrossProfit;
                return true;
              })}
              formatCurrency={formatCurrency}
            />
          </div>

          <div className="xl:col-span-1">
            <SalesGoalTracker />
          </div>
        </div>

        <RecentSalesTable
          recentSales={recentSales}
          currency={settings.currency}
        />
      </div>
    );
  },
);

AnalyticsDashboard.displayName = "AnalyticsDashboard";

export default AnalyticsDashboard;
