import React from 'react';

const SalesTableSkeleton = () => (
  <div className="bg-white rounded-lg shadow-sm border border-border/50">
    <div className="p-4 sm:p-6 border-b border-border/50">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-32 mt-2 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
      </div>
    </div>
    <div className="p-4 sm:p-6">
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
        ))}
      </div>
    </div>
  </div>
);

export default SalesTableSkeleton;