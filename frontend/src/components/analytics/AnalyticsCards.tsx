
"use client";

import React, { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalyticsData } from '@/types';
import { formatNumber } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { TrendingUp, DollarSign, Percent, UserCheck, CreditCard, Package } from 'lucide-react';

interface AnalyticsCardsProps {
  analyticsData: AnalyticsData;
  nonQuoteSalesCount: number;
  currency: string;
  expenses: number;
  inventoryValue: number;
  canViewProfit?: boolean;
  canViewTotalSales?: boolean;
  canViewTotalExpenses?: boolean;
  canViewInventoryValue?: boolean;
  canViewSalesTypes?: boolean;
}

const AnalyticsCards: React.FC<AnalyticsCardsProps> = memo(({
  analyticsData,
  nonQuoteSalesCount,
  currency,
  expenses,
  inventoryValue,
  canViewProfit = true,
  canViewTotalSales = true,
  canViewTotalExpenses = true,
  canViewInventoryValue = true,
  canViewSalesTypes = true
}) => {
  const isMobile = useIsMobile();

  // 🛡️ DATA HARDENING: Ensure we don't crash if analyticsData is null (loading)
  const safeData = analyticsData || {
    totalSales: 0,
    totalProfit: 0,
    paidSalesCount: 0,
    pendingSalesCount: 0
  };

  const cards = [
    {
      title: "Total Sales",
      value: canViewTotalSales ? `${currency} ${formatNumber(safeData.totalSales)}` : '•••',
      description: canViewTotalSales
        ? (analyticsData ? `From ${nonQuoteSalesCount} transactions (excluding quotes)` : "Loading calculations...")
        : "Requires permission",
      color: "text-sales-primary",
      bgColor: "bg-blue-50",
      icon: <DollarSign className="h-5 w-5 text-sales-primary" />,
      visible: true
    },
    {
      title: "Total Gross Profit",
      value: canViewProfit ? `${currency} ${formatNumber(safeData.totalProfit)}` : '•••',
      description: canViewProfit
        ? (safeData.totalProfit > 0 && safeData.totalSales > 0
          ? `${(safeData.totalProfit / safeData.totalSales * 100).toFixed(1)}% profit margin`
          : (analyticsData ? "No profit yet" : "Loading..."))
        : "Requires permission",
      color: "text-green-600",
      bgColor: "bg-green-50",
      icon: <TrendingUp className="h-5 w-5 text-green-600" />,
      visible: true
    },
    {
      title: "Total Expenses",
      value: canViewTotalExpenses ? `${currency} ${formatNumber(expenses)}` : '•••',
      description: canViewTotalExpenses
        ? (expenses > 0 && safeData.totalSales > 0
          ? `${(expenses / safeData.totalSales * 100).toFixed(1)}% of sales`
          : (analyticsData ? "No expenses recorded" : "Loading..."))
        : "Requires permission",
      color: "text-[#f05a29]",
      bgColor: "bg-orange-50",
      icon: <Percent className="h-5 w-5 text-[#f05a29]" />,
      visible: true
    },
    {
      title: "Inventory Value",
      value: canViewInventoryValue ? `${currency} ${formatNumber(inventoryValue)}` : '•••',
      description: canViewInventoryValue ? "Total value of current inventory" : "Requires permission",
      color: "text-green-600",
      bgColor: "bg-green-50",
      icon: <Package className="h-5 w-5 text-green-600" />,
      visible: true
    },
    {
      title: "Cash Sales",
      value: canViewSalesTypes ? safeData.paidSalesCount.toString() : '•••',
      description: canViewSalesTypes
        ? (safeData.paidSalesCount + safeData.pendingSalesCount > 0
          ? `${(safeData.paidSalesCount / (safeData.paidSalesCount + safeData.pendingSalesCount) * 100).toFixed(1)}% of total`
          : (analyticsData ? "No sales yet" : "Loading..."))
        : "Requires permission",
      color: "text-green-600",
      bgColor: "bg-green-50",
      icon: <UserCheck className="h-5 w-5 text-green-600" />,
      visible: true
    },
    {
      title: "Credit Sales",
      value: canViewSalesTypes ? safeData.pendingSalesCount.toString() : '•••',
      description: canViewSalesTypes
        ? (safeData.pendingSalesCount > 0
          ? `${(safeData.pendingSalesCount / (safeData.paidSalesCount + safeData.pendingSalesCount) * 100).toFixed(1)}% of total`
          : (analyticsData ? "No credit sales" : "Loading..."))
        : "Requires permission",
      color: "text-amber-500",
      bgColor: "bg-amber-50",
      icon: <CreditCard className="h-5 w-5 text-amber-500" />,
      visible: true
    }
  ];

  const visibleCards = cards.filter(c => c.visible);

  return (
    <div className={`grid gap-4 w-full ${isMobile
      ? 'grid-cols-2'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
      }`}>
      {cards.map((card, index) => (
        <Card key={index} className={`w-full transition-all duration-200 hover:shadow-md ${isMobile ? 'border-l-4 border-l-blue-500' : ''
          }`}>
          <CardContent className={`${isMobile ? 'p-3' : 'p-6'}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg ${card.bgColor} ${isMobile ? 'p-1' : 'p-2'}`}>
                    <div className={isMobile ? 'scale-75' : ''}>
                      {card.icon}
                    </div>
                  </div>
                  <p className={`text-sm font-medium text-gray-600 ${isMobile ? 'text-xs leading-tight' : ''
                    }`}>
                    {card.title}
                  </p>
                </div>
                <div className={`${card.color} font-bold mb-1 ${isMobile ? 'text-lg' : 'text-2xl'
                  }`}>
                  {card.value}
                </div>
                <p className={`text-muted-foreground ${isMobile ? 'text-xs leading-tight' : 'text-xs'
                  }`}>
                  {card.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

AnalyticsCards.displayName = 'AnalyticsCards';

export default AnalyticsCards;
