"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Package, Plus } from 'lucide-react';

const EmptyProductState: React.FC = () => {
  const router = useRouter();

  return (
    <div className="text-center py-12 px-4 border-dashed border-2 rounded-lg bg-white">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
        <Package className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-gray-900">No products found</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Start managing your inventory by adding your first product.
      </p>
      <div className="mt-6">
        <Button onClick={() => router.push('/agency/inventory/new')} className="gap-2">
          <Plus size={16} /> Add New Product
        </Button>
      </div>
    </div>
  );
};

export default EmptyProductState;
