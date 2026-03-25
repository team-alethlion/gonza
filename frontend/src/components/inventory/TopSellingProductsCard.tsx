import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TopSellingProductsTable from '@/components/inventory/TopSellingProductsTable';
import { SoldItem } from '@/hooks/useSoldItemsData';

interface TopSellingProductsCardProps {
  topSellingProducts: SoldItem[];
  isLoading?: boolean;
  period: 'today' | 'yesterday' | 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'all-time';
  onPeriodChange: (period: 'today' | 'yesterday' | 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'all-time') => void;
}

const TopSellingProductsCard: React.FC<TopSellingProductsCardProps> = ({
  topSellingProducts,
  isLoading,
  period,
  onPeriodChange
}) => {
  return (
    <Card className="shadow-sm border-t-0 bg-white">
      <CardHeader className="pb-3 md:pb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="text-base md:text-lg">Top Selling Products</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Period:</span>
            <Select value={period} onValueChange={(value) => onPeriodChange(value as typeof period)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="last-week">Last Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="all-time">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <TopSellingProductsTable
          products={topSellingProducts}
          isLoading={isLoading}
          period={period}
        />
      </CardContent>
    </Card>
  );
};

export default TopSellingProductsCard;