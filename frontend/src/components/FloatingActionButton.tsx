"use client"

import React, { useState, useEffect } from 'react';
import { Plus, Package, ShoppingCart, Users, DollarSign, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';

const FloatingActionButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const isMobile = useIsMobile();

  useEffect(() => {
    Promise.resolve().then(() => setMounted(true));
  }, []);

  const handleNavigation = (path: string, queryParams?: Record<string, string>) => {
    let url = path;
    if (queryParams) {
      const params = new URLSearchParams(queryParams);
      url += `?${params.toString()}`;
    }
    router.push(url);
    setIsOpen(false);
  };

  if (!mounted) return null;

  return (
    <div className={`fixed ${isMobile ? 'bottom-28' : 'bottom-6'} right-6 z-50`}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => handleNavigation('/agency/new-sale')}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Create Sale
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleNavigation('/agency/new-sale', { defaultPaymentStatus: 'Installment Sale' })}>
            <CreditCard className="mr-2 h-4 w-4" />
            Create Installment Sale
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleNavigation('/agency/inventory/new')}>
            <Package className="mr-2 h-4 w-4" />
            Add Product
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleNavigation('/agency/customers')}>
            <Users className="mr-2 h-4 w-4" />
            Add Customer
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleNavigation('/agency/expenses')}>
            <DollarSign className="mr-2 h-4 w-4" />
            Add Expense
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default FloatingActionButton;