
"use client"

import React, { useState } from 'react';
import { Check, Building2, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/components/auth/AuthProvider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SidebarMenuButton, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem } from '../ui/sidebar';
import { BusinessPasswordDialog } from './BusinessPasswordDialog';
import { useBusinessPassword } from '@/hooks/useBusinessPassword';

interface BusinessSelectorProps {
  variant?: 'desktop' | 'mobile' | 'sidebar';
  onItemClick?: () => void;
}

export const BusinessSelector: React.FC<BusinessSelectorProps> = ({
  variant = 'desktop',
  onItemClick
}) => {
  const { user } = useAuth();
  const { currentBusiness, businessLocations, switchBusiness } = useBusiness();
  const { verifyBusinessPassword } = useBusinessPassword();
  
  const userRole = user?.role?.toLowerCase();
  const canSwitchBusiness = userRole === 'superadmin' || userRole === 'admin';

  const [isOpen, setIsOpen] = useState(true);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordPromptData, setPasswordPromptData] = useState<{
    businessId: string;
    businessName: string;
    onVerified: () => void;
  } | null>(null);

  const handleBusinessSwitch = (businessId: string) => {
    switchBusiness(businessId, (businessId, businessName, onVerified) => {
      setPasswordPromptData({ businessId, businessName, onVerified });
      setShowPasswordDialog(true);
    });
    // Only call onItemClick for non-password protected businesses
    // Password protected businesses will handle menu closing after verification
    if (!passwordPromptData) {
      onItemClick?.();
    }
  };

  const handlePasswordVerified = () => {
    if (passwordPromptData) {
      passwordPromptData.onVerified();
      setShowPasswordDialog(false);
      setPasswordPromptData(null);
      // Close the mobile menu after successful password verification
      setTimeout(() => {
        onItemClick?.();
      }, 100);
    }
  };

  const handleVerifyPassword = async (password: string) => {
    if (passwordPromptData) {
      return await verifyBusinessPassword(passwordPromptData.businessId, password);
    }
    return false;
  };

  if (variant === 'sidebar') {
    if (businessLocations.length <= 1 || !canSwitchBusiness) {
      return (
        <SidebarMenuButton className="w-full text-primary-foreground cursor-default" disabled={!canSwitchBusiness}>
          <Building2 className="size-4" />
          <span className="flex-1 text-left truncate group-data-[collapsible=icon]:hidden">{currentBusiness?.name || 'Business'}</span>
        </SidebarMenuButton>
      );
    }

    return (
      <>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton className="w-full text-primary-foreground hover:bg-white/10">
              <Building2 className="size-4" />
              <span className="flex-1 text-left truncate group-data-[collapsible=icon]:hidden">{currentBusiness?.name || 'Select Business'}</span>
              <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub className="bg-primary">
              {businessLocations.map((business) => (
                <SidebarMenuSubItem key={business.id}>
                  <SidebarMenuSubButton
                    onClick={() => handleBusinessSwitch(business.id)}
                    isActive={currentBusiness?.id === business.id}
                    className="w-full justify-between text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground data-[active=true]:bg-secondary data-[active=true]:text-secondary-foreground"
                  >
                    <span className="truncate">{business.name}</span>
                    {currentBusiness?.id === business.id && <Check className="h-4 w-4" />}
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>

        {passwordPromptData && (
          <BusinessPasswordDialog
            open={showPasswordDialog}
            onOpenChange={setShowPasswordDialog}
            businessName={passwordPromptData.businessName}
            onPasswordVerified={handlePasswordVerified}
            onVerifyPassword={handleVerifyPassword}
          />
        )}
      </>
    );
  }

  if (variant === 'mobile') {
    return (
      <>
        <div className="px-6 py-4 border-b">
          <div className="text-sm text-gray-500 mb-2">Current Business</div>
          <div className="font-medium break-words">{currentBusiness?.name || 'Loading...'}</div>

          {canSwitchBusiness && (
            <div className="mt-3 space-y-1">
              {businessLocations.map((business) => (
                <button
                  key={business.id}
                  onClick={() => handleBusinessSwitch(business.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between transition-colors touch-manipulation ${currentBusiness?.id === business.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'hover:bg-gray-50 active:bg-gray-100'
                    }`}
                  type="button"
                >
                  <span className="flex items-center gap-2 min-w-0 flex-1">
                    <Building2 className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{business.name}</span>
                    {business.is_default && (
                      <span className="text-xs bg-gray-100 px-1 rounded flex-shrink-0">Default</span>
                    )}
                  </span>
                  {currentBusiness?.id === business.id && (
                    <Check className="h-4 w-4 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {passwordPromptData && (
          <BusinessPasswordDialog
            open={showPasswordDialog}
            onOpenChange={(open) => {
              console.log('Mobile dialog open change:', open);
              setShowPasswordDialog(open);
            }}
            businessName={passwordPromptData.businessName}
            onPasswordVerified={handlePasswordVerified}
            onVerifyPassword={handleVerifyPassword}
          />
        )}
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className={`justify-start gap-2 h-auto py-2 ${!canSwitchBusiness ? 'cursor-default' : ''}`}>
            <Building2 className="h-4 w-4" />
            <div className="text-left">
              <div className="text-xs text-gray-500">Business</div>
              <div className="text-sm font-medium">{currentBusiness?.name || 'Loading...'}</div>
            </div>
          </Button>
        </DropdownMenuTrigger>

        {canSwitchBusiness && (
          <DropdownMenuContent align="start" className="w-64">
            {businessLocations.map((business) => (
              <DropdownMenuItem
                key={business.id}
                onClick={() => handleBusinessSwitch(business.id)}
                className="flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {business.name}
                  {business.is_default && (
                    <span className="text-xs bg-gray-100 px-1 rounded">Default</span>
                  )}
                </span>
                {currentBusiness?.id === business.id && (
                  <Check className="h-4 w-4" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        )}
      </DropdownMenu>

      {passwordPromptData && (
        <BusinessPasswordDialog
          open={showPasswordDialog}
          onOpenChange={setShowPasswordDialog}
          businessName={passwordPromptData.businessName}
          onPasswordVerified={handlePasswordVerified}
          onVerifyPassword={handleVerifyPassword}
        />
      )}
    </>
  );
};
