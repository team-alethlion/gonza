"use client";
import React from 'react';
import { HistoryList } from './HistoryList';
import { HistoryStats } from './HistoryStats';
import { ActivityHistoryItem } from '@/hooks/useActivityHistory';

import LoadingSpinner from '@/components/LoadingSpinner';

interface HistoryContentProps {
  activities: ActivityHistoryItem[];
  isLoading: boolean;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const HistoryContent: React.FC<HistoryContentProps> = ({
  activities,
  isLoading,
  totalCount,
  currentPage,
  totalPages,
  onPageChange
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <HistoryStats activities={activities} totalCount={totalCount} />
      
      <div className="bg-card border rounded-lg">
        <div className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h2 className="text-lg md:text-xl font-semibold text-foreground">Recent Activities</h2>
            <span className="text-sm text-muted-foreground">
              {totalCount} total
            </span>
          </div>
          
          <HistoryList activities={activities} />
          
          {totalPages > 1 && (
            <div className="mt-4 md:mt-6 flex justify-center">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-2 md:px-3 py-1 text-xs md:text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                >
                  Prev
                </button>
                <span className="text-xs md:text-sm px-2">
                  {currentPage}/{totalPages}
                </span>
                <button
                  onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 md:px-3 py-1 text-xs md:text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};