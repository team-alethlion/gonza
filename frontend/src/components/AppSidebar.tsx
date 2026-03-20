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
      <SidebarContent className="p-4 pt-8 flex flex-col gap-6">
        {businessLocations.length > 0 && (
          <div className="space-y-4">
            <div className="px-2">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground/40 mb-3 group-data-[collapsible=icon]:hidden">
                Active Branch
              </h3>
              <BusinessSelector variant="sidebar" />
            </div>
          </div>
        )}
        <div className="flex-1">
          <NavLinks isSidebar={true} isCollapsed={state === 'collapsed'} />
        </div>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-primary-foreground/20">
        <SidebarMenu>
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
