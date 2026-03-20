"use client"

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar
} from '@/components/ui/sidebar';
import NavLinks from './header/NavLinks';
import { Building2, LogOut } from 'lucide-react';
import { BusinessSelector } from './business/BusinessSelector';
import { useProfiles } from '@/contexts/ProfileContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

const AppSidebar = () => {
  const { businessLocations } = useBusiness();
  const { signOut } = useAuth();
  const { hasPermission } = useProfiles();
  const { state } = useSidebar();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const canManageSettings = hasPermission('settings', 'manage');

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
      toast.error('Failed to logout. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };


  return (
    <Sidebar collapsible="icon" className="hidden border-r border-primary-foreground/20 bg-primary text-primary-foreground md:flex">
      <SidebarContent className="p-0 pt-8 flex flex-col gap-6 group-data-[collapsible=icon]:pt-10">
        {businessLocations.length > 0 && (
          <div className="space-y-4 group-data-[collapsible=icon]:space-y-0">
            <div className="px-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
              <div className="w-full flex items-center px-3 text-[11px] font-black uppercase tracking-[0.15em] text-amber-400 mb-2 group-data-[collapsible=icon]:hidden">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] mr-2"></div>
                Active Branch
              </div>
              <BusinessSelector variant="sidebar" />
            </div>
          </div>
        )}
        <div className="flex-1 px-2 group-data-[collapsible=icon]:px-0">
          <NavLinks isSidebar={true} isCollapsed={state === 'collapsed'} />
        </div>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-primary-foreground/20 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:py-4">
        <SidebarMenu className="group-data-[collapsible=icon]:items-center">
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full justify-start hover:bg-white/10 text-primary-foreground"
              tooltip={isLoggingOut ? "Logging out..." : "Logout"}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden truncate">{isLoggingOut ? "Logging out..." : "Logout"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {canManageSettings && (
            <SidebarMenuItem>
              <SidebarMenuButton className="w-full justify-start hover:bg-white/10 text-primary-foreground" asChild tooltip="Manage Businesses">
                <Link href="/agency/business-management">
                  <Building2 className="mr-2 h-4 w-4" />
                  <span className="group-data-[collapsible=icon]:hidden truncate">Manage Businesses</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
