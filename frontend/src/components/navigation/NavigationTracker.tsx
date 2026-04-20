"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useNavigationStore } from "@/store/useNavigationStore";

/**
 * 🛰️ NAVIGATION TRACKER
 * 
 * Invisible component that monitors pathname and search params changes.
 * It updates the global Navigation Store history on every transition.
 */
export function NavigationTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const addToHistory = useNavigationStore((state) => state.addToHistory);

  useEffect(() => {
    // Construct the full URL including search params
    const search = searchParams.toString();
    const fullPath = search ? `${pathname}?${search}` : pathname;
    
    addToHistory(fullPath);
  }, [pathname, searchParams, addToHistory]);

  return null;
}
