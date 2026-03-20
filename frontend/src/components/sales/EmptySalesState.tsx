"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

const EmptySalesState: React.FC = () => {
  const router = useRouter();

  return (
    <div className="text-center py-12 bg-white rounded-lg shadow-md p-8">
      <div className="flex flex-col items-center gap-4">
        <div className="bg-slate-100 rounded-full p-4 w-16 h-16 flex items-center justify-center">
          <FileText className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-semibold">No sales records found</h3>
        <p className="text-gray-500 mb-4">
          Create your first sale to start tracking your business performance
        </p>
        <Button onClick={() => router.push('/agency/new-sale')} className="mt-2">
          Create Your First Sale
        </Button>
      </div>
    </div>
  );
};

export default EmptySalesState;
