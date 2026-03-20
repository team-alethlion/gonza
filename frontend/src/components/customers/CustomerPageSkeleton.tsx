import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const CustomerPageSkeleton = () => (
  <div className="space-y-8">
    <div className="bg-white rounded-lg border p-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>

    <div className="bg-white rounded-lg border">
      <div className="p-6">
        <Skeleton className="h-40" />
      </div>
    </div>
  </div>
);

export default CustomerPageSkeleton;