"use client";
import React from 'react';
import { useRouter } from 'next/navigation';

const NewSaleNoBusinessState: React.FC = () => {
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto p-6">
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

export default NewSaleNoBusinessState;