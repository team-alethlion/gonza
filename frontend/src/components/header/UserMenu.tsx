"use client"

import { LogOut, Settings, User, ChevronDown, Check, Building2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/components/auth/AuthProvider';
import Link from 'next/link';
import { BusinessSelector } from '@/components/business/BusinessSelector';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAppUpdate } from '@/hooks/useAppUpdate';

const UserMenu = () => {
  const { user, signOut } = useAuth();
  const { currentBusiness, businessLocations, switchBusiness } = useBusiness();
  const { updateAvailable, isUpdating, triggerUpdate } = useAppUpdate();

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  const handleBusinessSwitch = (businessId: string) => {
    switchBusiness(businessId);
  };

  return (
    <div className="flex items-center gap-2">
      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {user?.email ? getInitials(user.email) : 'U'}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80" align="end" forceMount>
          <div className="flex items-center justify-start gap-2 p-2">
            <div className="flex flex-col space-y-1 leading-none">
              {user?.email && (
                <p className="font-medium">{user.email}</p>
              )}
            </div>
          </div>
          <DropdownMenuSeparator />

          {/* Business selector in user menu */}
          <div className="p-2">
            <BusinessSelector variant="desktop" />
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/agency/business-management" className="flex items-center bg-blue-50 text-blue-700 font-medium">
              <Building2 className="mr-2 h-4 w-4" />
              <span>Manage Businesses</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link href="/agency/settings" className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={triggerUpdate}
              disabled={isUpdating}
              className="flex items-center bg-orange-50 text-orange-700 font-medium hover:bg-orange-100"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
              <span>{isUpdating ? 'UPDATING...' : 'UPDATE APP'}</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default UserMenu;
