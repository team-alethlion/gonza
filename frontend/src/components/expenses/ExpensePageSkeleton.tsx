import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const ExpensePageSkeleton = () => (
  <div className="space-y-4 md:space-y-6 p-4 md:p-0">
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-24" />
      </div>
      <Skeleton className="h-12 w-full" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>

    <Skeleton className="h-64" />
  </div>
);

export default ExpensePageSkeleton;