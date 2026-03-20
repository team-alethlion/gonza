"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, Building2, RefreshCw } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import Link from 'next/link';
import NavLinks from './NavLinks';
import MobileLogoutButton from './MobileLogoutButton';
import { BusinessSelector } from '@/components/business/BusinessSelector';
import { ProfileSelector } from '@/components/profiles/ProfileSelector';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppUpdate } from '@/hooks/useAppUpdate';

const MobileMenuButton = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { updateAvailable, isUpdating, triggerUpdate } = useAppUpdate();

  return (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} modal>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:w-72 pt-10 flex flex-col z-[60]">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-left">Menu</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="pb-16">
            {/* Update App Button - First item */}
            <div className="px-6 pb-4 border-b">
              <Button
                onClick={triggerUpdate}
                disabled={isUpdating}
                className="w-full flex items-center gap-2 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-sm font-medium transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
                {isUpdating ? 'UPDATING...' : 'UPDATE APP'}
              </Button>
            </div>

            {/* Business Selector */}
            <BusinessSelector
              variant="mobile"
              onItemClick={() => {
                // Don't close menu immediately when business switch happens
                // This allows the password dialog to show properly
                console.log('Business selector item clicked');
              }}
            />

            {/* Profile Selector */}
            <div className="px-6 pb-4">
              <ProfileSelector />
            </div>

            {/* Manage Businesses Button */}
            <div className="px-6 pb-4 border-b">
              <Link
                href="/business-management"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                <Building2 className="h-4 w-4" />
                Manage Businesses
              </Link>
            </div>

            {/* Mobile Navigation Links */}
            <NavLinks
              className="p-4"
              onClick={() => setMobileMenuOpen(false)}
            />
          </div>
        </ScrollArea>

        <MobileLogoutButton />
      </SheetContent>
    </Sheet>
  );
};

export default MobileMenuButton;
