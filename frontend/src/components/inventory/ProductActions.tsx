"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Info } from 'lucide-react';
import { Product } from '@/types';
import { useProfiles } from '@/contexts/ProfileContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProductActionsProps {
  product: Product;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
}

const ProductActions: React.FC<ProductActionsProps> = ({
  product,
  onView,
  onEdit,
}) => {
  const { hasPermission } = useProfiles();
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onView(product.id)}>
            <Info className="mr-2 h-4 w-4" /> View details
          </DropdownMenuItem>
          {hasPermission('inventory', 'edit') && (
            <DropdownMenuItem onClick={() => onEdit(product.id)}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export default ProductActions;
