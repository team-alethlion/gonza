"use client";
import React from 'react';
import { useRouter } from 'next/navigation';

const NoBusinessState: React.FC = () => {
  const router = useRouter();

  return (
    <div className="p-6 text-center">
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-md">
        <p className="text-amber-800 mb-4">
          No business location found. Please create a business location to manage sales.
        </p>
        <button
          onClick={() => router.push('/agency/business-management')}
          className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700"
        >
          Manage Business Locations
        </button>
      </div>
    </div>
  );
};

export default NoBusinessState;