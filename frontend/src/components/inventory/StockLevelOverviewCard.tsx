"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StockLevelChart from '@/components/inventory/StockLevelChart';
import { Product } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';

interface StockLevelOverviewCardProps {
  products: Product[];
}

const StockLevelOverviewCard: React.FC<StockLevelOverviewCardProps> = ({ products }) => {
  const isMobile = useIsMobile();

  // Only show on desktop or if there are products
  if (isMobile && products.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="pb-3 md:pb-6">
        <CardTitle className="text-base md:text-lg">Stock Level Overview</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <StockLevelChart products={products} />
      </CardContent>
    </Card>
  );
};

export default StockLevelOverviewCard;