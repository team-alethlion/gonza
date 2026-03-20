import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const InventoryPageSkeleton = () => (
  <div className="space-y-6">
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>

    <div className="mb-4">
      <Skeleton className="h-10 w-full max-w-md" />
    </div>

    <div className="mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>

    <Skeleton className="h-64 mb-6" />
    <Skeleton className="h-96" />
  </div>
);

export default InventoryPageSkeleton;