"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight, Home, Receipt, Package, DollarSign, HelpCircle, MessageSquare, Users, Wallet, Settings, CheckSquare, History as HistoryIcon, UserCircle, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { useProfiles } from '@/contexts/ProfileContext';

interface NavLink {
  name: string;
  path: string;
  icon: React.ReactNode;
  module?: string;
}

interface NavLinksProps {
  className?: string;
  onClick?: () => void;
  isSidebar?: boolean;
  isCollapsed?: boolean;
}

const NavLinks = ({ className = '', onClick, isSidebar = false, isCollapsed = false }: NavLinksProps) => {
  const pathname = usePathname();

  const { hasPermission } = useProfiles();

  // State for minimizable sections
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Core: true,
    Business: true,
    System: true
  });

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const coreLinks: NavLink[] = [
    { name: 'Dashboard', path: '/agency', icon: <Home className="w-4 h-4" /> },
    { name: 'Sales', path: '/agency/sales', icon: <Receipt className="w-4 h-4" />, module: 'sales' },
    { name: 'Inventory', path: '/agency/inventory', icon: <Package className="w-4 h-4" />, module: 'inventory' },
    { name: 'Customers', path: '/agency/customers', icon: <Users className="w-4 h-4" />, module: 'customers' },
  ].filter(link => !link.module || hasPermission(link.module, 'view'));

  const businessLinks: NavLink[] = [
    { name: 'Finance', path: '/agency/cash', icon: <Wallet className="w-4 h-4" />, module: 'finance' },
    { name: 'Expenses', path: '/agency/expenses', icon: <DollarSign className="w-4 h-4" />, module: 'expenses' },
    { name: 'Messages', path: '/agency/messages', icon: <MessageSquare className="w-4 h-4" />, module: 'messages' },
    { name: 'Tasks', path: '/agency/tasks', icon: <CheckSquare className="w-4 h-4" />, module: 'tasks' },
    { name: 'History', path: '/agency/history', icon: <HistoryIcon className="w-4 h-4" /> },
  ].filter(link => !link.module || hasPermission(link.module, 'view'));

  const systemLinks: NavLink[] = [
    { name: 'Settings', path: '/agency/settings', icon: <Settings className="w-4 h-4" />, module: 'settings' },
    { name: 'Help', path: '/agency/help', icon: <HelpCircle className="w-4 h-4" /> },
    { name: 'Privacy Policy', path: '/agency/privacy-policy', icon: <HelpCircle className="w-4 h-4" /> },
  ].filter(link => !link.module || hasPermission(link.module, 'view'));

  const isActive = (path: string) => {
    if (path === '/agency' && pathname === '/agency') return true;
    if (path !== '/agency' && pathname?.startsWith(path)) return true;
    return false;
  };

  const renderSidebarGroup = (title: string, links: NavLink[]) => {
    const isExpanded = expandedGroups[title];

    return (
      <div className="space-y-1">
        {!isCollapsed && (
          <button
            onClick={() => toggleGroup(title)}
            className="w-full flex items-center justify-between px-3 text-[11px] font-black uppercase tracking-[0.15em] text-amber-400 mb-2 mt-6 first:mt-0 hover:text-amber-300 transition-all group"
          >
            <span className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></div>
              {title}
            </span>
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        )}
        {isCollapsed && <div className="h-2"></div>}

        {(isExpanded || isCollapsed) && (
          <SidebarMenu className="w-full animate-in fade-in slide-in-from-top-1 duration-200 group-data-[collapsible=icon]:items-center">
            {links.map((link) => (
              <SidebarMenuItem key={link.name}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(link.path)}
                  tooltip={link.name}
                  className="text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground data-[active=true]:bg-secondary data-[active=true]:text-secondary-foreground"
                >
                  <Link href={link.path} onClick={onClick}>
                    {link.icon}
                    <span className="group-data-[collapsible=icon]:hidden">{link.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        )}
      </div>
    );
  };

  if (isSidebar) {
    return (
      <div className="flex flex-col space-y-4">
        {renderSidebarGroup('Core', coreLinks)}
        {renderSidebarGroup('Business', businessLinks)}
        {renderSidebarGroup('System', systemLinks)}
      </div>
    );
  }

  // For Mobile Menu
  const allLinks = [...coreLinks, ...businessLinks, ...systemLinks];

  return (
    <nav className={cn('flex flex-col space-y-1', className)}>
      {allLinks.map((link) => (
        <Link
          key={link.name}
          href={link.path}
          className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${isActive(link.path)
            ? 'bg-blue-50 text-blue-700'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          onClick={onClick}
        >
          {link.icon}
          <span>{link.name}</span>
        </Link>
      ))}
    </nav>
  );
};

export default NavLinks;
