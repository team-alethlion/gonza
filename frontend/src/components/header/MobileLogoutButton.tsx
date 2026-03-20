
"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';

const MobileLogoutButton = () => {
  const { signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      // Removed duplicate toast - AuthProvider already shows success message
    } catch (error) {
      console.error('Error during logout:', error);
      // Only show error toast if logout fails
      const { toast } = await import('sonner');
      toast.error('Failed to logout. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="absolute bottom-4 left-4 right-4 bg-white">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="w-full justify-start px-4 py-3 text-sm font-medium text-gray-600 hover:text-red-600 flex items-center gap-2 bg-white hover:bg-gray-50"
      >
        {isLoggingOut ? (
          <>
            <span className="animate-spin mr-1">
              <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
            Logging out...
          </>
        ) : (
          <>
            <LogOut className="w-4 h-4" />
            Logout
          </>
        )}
      </Button>
    </div>
  );
};

export default MobileLogoutButton;
