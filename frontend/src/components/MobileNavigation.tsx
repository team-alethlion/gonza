"use client"

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Receipt, DollarSign, Package, Users, Wallet } from 'lucide-react';

const MobileNavigation = () => {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => setMounted(true));
  }, []);

  const isActive = (path: string) => {
    if (path === '/agency' && pathname === '/agency') return true;
    if (path !== '/agency' && pathname?.startsWith(path)) return true;
    return false;
  };

  if (!mounted) return null;

  // Static mobile navigation items - removed Tasks
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 md:hidden safe-area-inset-bottom">
      <div className="flex justify-between items-center px-1 py-2 min-h-[60px]">
        <Link
          href="/agency"
          className={`flex flex-1 flex-col items-center py-2 px-1 rounded-md transition-colors min-h-[48px] ${isActive('/agency') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
            }`}
        >
          <Home className="h-5 w-5 mb-1" />
          <span className="text-xs font-medium text-center">Dashboard</span>
        </Link>

        <Link
          href="/agency/sales"
          className={`flex flex-1 flex-col items-center py-2 px-1 rounded-md transition-colors min-h-[48px] ${isActive('/agency/sales') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
            }`}
        >
          <Receipt className="h-5 w-5 mb-1" />
          <span className="text-xs font-medium text-center">Sales</span>
        </Link>

        <Link
          href="/agency/inventory"
          className={`flex flex-1 flex-col items-center py-2 px-1 rounded-md transition-colors min-h-[48px] ${isActive('/agency/inventory') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
            }`}
        >
          <Package className="h-5 w-5 mb-1" />
          <span className="text-xs font-medium text-center">Inventory</span>
        </Link>

        <Link
          href="/agency/cash"
          className={`flex flex-1 flex-col items-center py-2 px-1 rounded-md transition-colors min-h-[48px] ${isActive('/agency/cash') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
            }`}
        >
          <Wallet className="h-5 w-5 mb-1" />
          <span className="text-xs font-medium text-center">Finance</span>
        </Link>

        <Link
          href="/agency/expenses"
          className={`flex flex-1 flex-col items-center py-2 px-1 rounded-md transition-colors min-h-[48px] ${isActive('/agency/expenses') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
            }`}
        >
          <DollarSign className="h-5 w-5 mb-1" />
          <span className="text-xs font-medium text-center">Expenses</span>
        </Link>

        <Link
          href="/agency/customers"
          className={`flex flex-1 flex-col items-center py-2 px-1 rounded-md transition-colors min-h-[48px] ${isActive('/agency/customers') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
            }`}
        >
          <Users className="h-5 w-5 mb-1" />
          <span className="text-xs font-medium text-center">Customers</span>
        </Link>

      </div>
    </div>
  );
};

export default MobileNavigation;
