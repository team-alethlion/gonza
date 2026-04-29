"use client";

import React, { useRef } from "react";
import Header from "./Header";
import MobileNavigation from "./MobileNavigation";
import FloatingActionButton from "./FloatingActionButton";
import { useIsMobile } from "@/hooks/use-mobile";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "./ui/sidebar";
import AppSidebar from "./AppSidebar";
import LoadingSpinner from "./LoadingSpinner";
import NetworkStatusIndicator from "./NetworkStatusIndicator";
import { ProfileSelectionOverlay } from "./profiles/ProfileSelectionOverlay";
import { PinEntryOverlay } from "./profiles/PinEntryOverlay";
import { FirstTimePinSetup } from "./profiles/FirstTimePinSetup";
import { useAuth } from "./auth/AuthProvider";
import { useUserHeartbeat } from "@/hooks/useUserHeartbeat";
import ScrollProgressBar from "./ScrollProgressBar";

interface AgencyLayoutProps {
  children: React.ReactNode;
}

const AgencyLayout = ({ children }: AgencyLayoutProps) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  
  // 🚀 TRACK CONTENT SCROLL: Ref for the scrollable container
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Track user activity
  useUserHeartbeat(user?.id);

  return (
    <SidebarProvider>
      <TooltipProvider>
        {/* Progress bar fixed at top, tracking the contentRef scroll */}
        <ScrollProgressBar containerRef={contentRef} />
        
        {isMobile ? (
          // Mobile layout
          <div className="min-h-screen bg-gray-50 w-full">
            <Header />
            <NetworkStatusIndicator />
            <main 
              ref={contentRef}
              className="pt-20 pb-20 min-h-screen overflow-y-auto"
            >
              <div className="px-2 py-2 max-w-full overflow-x-hidden">
                <React.Suspense
                  fallback={<LoadingSpinner message="Loading page..." />}>
                  {children}
                </React.Suspense>
              </div>
            </main>
            <footer className="fixed bottom-0 left-0 right-0 bg-background border-t text-center text-xs text-muted-foreground py-2 mb-16 z-40">
              © {new Date().getFullYear()} Gonza Systems. All rights reserved.
            </footer>
            <MobileNavigation />
          </div>
        ) : (
          // Desktop layout
          <div className="flex h-screen w-full overflow-hidden">
            <AppSidebar />
            <div className="flex flex-1 flex-col h-full min-w-0">
              <Header />
              <NetworkStatusIndicator />
              <main 
                ref={contentRef}
                className="flex-1 bg-gray-50 p-6 overflow-y-auto scroll-smooth"
              >
                <div className="w-full">
                  <React.Suspense
                    fallback={<LoadingSpinner message="Loading page..." />}>
                    {children}
                  </React.Suspense>
                </div>
              </main>
              <footer className="bg-background border-t text-center text-xs text-muted-foreground py-3">
                © {new Date().getFullYear()} Gonza Systems. All rights reserved.
              </footer>
            </div>
            <FloatingActionButton />
          </div>
        )}
        {/* <ProfileSelectionOverlay /> */}
        {/* <PinEntryOverlay /> */}
        <FirstTimePinSetup />
      </TooltipProvider>
    </SidebarProvider>
  );
};

export default AgencyLayout;
