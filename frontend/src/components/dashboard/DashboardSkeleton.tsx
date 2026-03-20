import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const DashboardSkeleton = () => (
  <div className="space-y-4 animate-fade-in">
    {/* Header skeleton */}
    <div className="flex justify-between items-center">
      <div>
        <Skeleton className="h-6 md:h-8 w-32 md:w-48 mb-2" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-8 md:h-9 md:w-9" />
        <Skeleton className="h-8 w-16 md:h-9 md:w-24" />
      </div>
    </div>
    
    {/* Quick actions skeleton */}
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4 max-w-4xl">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-10 md:h-12" />
      ))}
    </div>

    {/* Analytics cards skeleton */}
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-24 md:h-32" />
      ))}
    </div>

    {/* Charts skeleton */}
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2">
        <Skeleton className="h-64 md:h-80" />
      </div>
      <div className="xl:col-span-1">
        <Skeleton className="h-64 md:h-80" />
      </div>
    </div>

    {/* Recent sales table skeleton */}
    <div className="space-y-2">
      <Skeleton className="h-6 w-32" />
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-12" />
      ))}
    </div>
  </div>
);

export default DashboardSkeleton;