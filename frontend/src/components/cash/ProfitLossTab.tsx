"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useProfitLossData } from '@/hooks/useProfitLossData';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useBusiness } from '@/contexts/BusinessContext';
import DateRangeFilter from '@/components/analytics/DateRangeFilter';
import ProfitLossTable from './ProfitLossTable';
import { getDateRangeFromFilter } from '@/utils/dateFilters';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ProfitLossTab = () => {
  const { currentBusiness } = useBusiness();
  const { settings } = useBusinessSettings();
  
  // Date filter state - default to current month
  const [dateFilter, setDateFilter] = useState('this-month');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [specificDate, setSpecificDate] = useState<Date | undefined>(undefined);

  // 🚀 REALIZATION BASIS: Accrual (all sales) vs Cash (only paid amount)
  const [basis, setBasis] = useState<'accrual' | 'cash'>('accrual');

  // Tax percentage state
  const [taxPercentage, setTaxPercentage] = useState(0);

  // Calculate derived states based on dateFilter
  const isCustomRange = dateFilter === 'custom';
  const isSpecificDate = dateFilter === 'specific';

  // Reset relevant states when filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (dateFilter === 'custom') {
        if (specificDate !== undefined) setSpecificDate(undefined);
      } else if (dateFilter === 'specific') {
        if (dateRange.from !== undefined || dateRange.to !== undefined) {
          setDateRange({ from: undefined, to: undefined });
        }
      } else {
        if (dateRange.from !== undefined || dateRange.to !== undefined) {
          setDateRange({ from: undefined, to: undefined });
        }
        if (specificDate !== undefined) setSpecificDate(undefined);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [dateFilter]);

  const currency = settings?.currency || 'USD';

  // Get profit & loss data using updated parameters including 'basis'
  const { profitLossData, isLoading } = useProfitLossData(
    dateFilter, 
    dateRange, 
    specificDate, 
    taxPercentage,
    basis
  );

  const effectiveDateRange = useMemo(() => {
    if (dateFilter === 'custom' && dateRange.from && dateRange.to) {
      return dateRange;
    } else if (dateFilter === 'specific' && specificDate) {
      return { from: specificDate, to: specificDate };
    } else if (dateFilter !== 'custom' && dateFilter !== 'specific') {
      return getDateRangeFromFilter(dateFilter);
    }
    return { from: undefined, to: undefined };
  }, [dateFilter, dateRange, specificDate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex-1 w-full">
            <h2 className="text-xl font-semibold mb-4 text-blue-900 flex items-center gap-2">
                Profit & Loss Account
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                            <p className="text-xs">
                                <strong>Accrual Basis:</strong> Records revenue when sales are made, even if payment is pending.
                            </p>
                            <p className="text-xs mt-2">
                                <strong>Cash Basis:</strong> Records revenue only when actual cash is received from the customer.
                            </p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </h2>
            <DateRangeFilter
                dateFilter={dateFilter}
                dateRange={dateRange}
                specificDate={specificDate}
                isCustomRange={isCustomRange}
                isSpecificDate={isSpecificDate}
                onDateFilterChange={setDateFilter}
                onDateRangeChange={setDateRange}
                onSpecificDateChange={setSpecificDate}
            />
        </div>
        
        {/* Realization Basis Toggle */}
        <div className="bg-muted p-1 rounded-lg">
            <Tabs 
                value={basis} 
                onValueChange={(v) => setBasis(v as 'accrual' | 'cash')} 
                className="w-[240px]"
            >
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="accrual" className="text-xs uppercase font-bold tracking-tight">Accrual Basis</TabsTrigger>
                    <TabsTrigger value="cash" className="text-xs uppercase font-bold tracking-tight">Cash Basis</TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
      </div>

      <ProfitLossTable
        data={profitLossData}
        isLoading={isLoading}
        formatCurrency={formatCurrency}
        onTaxChange={setTaxPercentage}
        dateRange={effectiveDateRange}
        businessName={currentBusiness?.name}
        businessLogo={settings?.businessLogo}
        currency={currency}
        dateFilter={dateFilter}
      />
    </div>
  );
};

export default ProfitLossTab;
