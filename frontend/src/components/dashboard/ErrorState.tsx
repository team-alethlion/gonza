"use client";
import React from 'react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  error: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error }) => {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center px-4">
        <h2 className="text-lg md:text-xl font-semibold mb-2 text-red-600">
          Error Loading Business Data
        </h2>
        <p className="text-gray-600 mb-4 text-sm md:text-base">{error}</p>
        <Button onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
      </div>
    </div>
  );
};

export default ErrorState;