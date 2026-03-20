import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CashAccount } from '@/types/cash';

export const useCashAccountRedirect = (accounts: CashAccount[]) => {
  const router = useRouter();
  const [hasCheckedRedirect, setHasCheckedRedirect] = useState(false);

  // Check for last visited cash account and redirect if found
  useEffect(() => {
    if (!hasCheckedRedirect && accounts.length > 0) {
      const lastVisitedAccountId = localStorage.getItem('lastVisitedCashAccount');
      const lastVisitedUrl = localStorage.getItem('lastVisitedCashAccountUrl');
      
      if (lastVisitedAccountId && lastVisitedUrl) {
        // Verify the account still exists
        const accountExists = accounts.some(acc => acc.id === lastVisitedAccountId);
        if (accountExists) {
          // Use the complete URL to preserve filters and pagination
          router.push(lastVisitedUrl.replace(window.location.origin, ''));
          return;
        } else {
          // Clean up invalid stored account data
          localStorage.removeItem('lastVisitedCashAccount');
          localStorage.removeItem('lastVisitedCashAccountUrl');
        }
      }
      const timer = setTimeout(() => {
        setHasCheckedRedirect(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [accounts, hasCheckedRedirect, router]);

  return { hasCheckedRedirect };
};