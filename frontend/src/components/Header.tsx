
"use client"

import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { SidebarTrigger } from '@/components/ui/sidebar';
import Logo from './header/Logo';
import UserMenu from './header/UserMenu';
import MobileMenuButton from './header/MobileMenuButton';
import InstallButton from './header/InstallButton';

const Header = () => {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => setMounted(true));
  }, []);

  if (!mounted) {
    return (
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/50 bg-white/80 backdrop-blur-md px-6 sticky top-0 z-50">
        <div className="absolute left-1/2 -translate-x-1/2">
          <Logo />
        </div>
      </header>
    );
  }

  if (isMobile) {
    return (
      <header className="bg-white/80 backdrop-blur-md border-b border-border/50 shadow-sm py-4 fixed top-0 left-0 right-0 z-50">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Logo />
          </div>
          <MobileMenuButton />
        </div>
      </header>
    );
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/50 bg-white/80 backdrop-blur-md px-6 sticky top-0 z-50">
      <div className="flex items-center">
        <SidebarTrigger />
      </div>
      <div className="absolute left-1/2 -translate-x-1/2">
        <Logo />
      </div>
      <nav className="flex items-center gap-2">
        <InstallButton />
        <UserMenu />
      </nav>
    </header>
  );
};

export default Header;
