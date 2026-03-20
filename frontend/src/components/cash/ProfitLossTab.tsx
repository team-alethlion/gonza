"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useProfitLossData } from '@/hooks/useProfitLossData';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useBusiness } from '@/contexts/BusinessContext';
import DateRangeFilter from '@/components/analytics/DateRangeFilter';
import ProfitLossTable from './ProfitLossTable';
import { getDateRangeFromFilter } from '@/utils/dateFilters';

const ProfitLossTab = () => {
  const { currentBusiness } = useBusiness();
  const { settings } = useBusinessSettings();
  
  // Date filter state - default to current month
  const [dateFilter, setDateFilter] = useState('this-month');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [specificDate, setSpecificDate] = useState<Date | undefined>(undefined);

  // Tax percentage state
  const [taxPercentage, setTaxPercentage] = useState(0);

  // Calculate derived states based on dateFilter
  const isCustomRange = dateFilter === 'custom';
  const isSpecificDate = dateFilter === 'specific';

  // Reset relevant states when filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (dateFilter === 'custom') {
        // Clear specific date when switching to custom
        if (specificDate !== undefined) setSpecificDate(undefined);
      } else if (dateFilter === 'specific') {
        // Clear date range when switching to specific
        if (dateRange.from !== undefined || dateRange.to !== undefined) {
          setDateRange({ from: undefined, to: undefined });
        }
      } else {
        // Clear both when switching to predefined filters
        if (dateRange.from !== undefined || dateRange.to !== undefined) {
          setDateRange({ from: undefined, to: undefined });
        }
        if (specificDate !== undefined) setSpecificDate(undefined);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [dateFilter]);

  // Get the currency from settings, defaulting to USD only if settings is null
  const currency = settings?.currency || 'USD';

  // Get profit & loss data using same parameters as sold items report
  const { profitLossData, isLoading } = useProfitLossData(dateFilter, dateRange, specificDate, taxPercentage);

  // Calculate the effective date range for exports (either custom range or calculated from filter)
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

  // Format currency function using the settings currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Profit & Loss Account</h2>
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
