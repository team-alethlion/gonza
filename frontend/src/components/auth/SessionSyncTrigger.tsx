"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

/**
 * 🔐 SESSION SYNC TRIGGER
 * 
 * This invisible component detects a signal from the server (via a prop or short-lived cookie)
 * that the NextAuth JWT session is stale compared to the real-time database status.
 * 
 * It triggers a client-side session update which forces NextAuth to re-fetch the
 * profile from Django and rewrite the JWT cookie with the fresh status.
 */
export function SessionSyncTrigger({ initialSyncNeeded = false }: { initialSyncNeeded?: boolean }) {
  const { update, status } = useSession();
  const syncInProgress = useRef(false);
  const initialSyncProcessed = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || syncInProgress.current) return;

    // 1. Check for the signal from prop OR cookie
    const hasCookieSignal = document.cookie.split('; ').find(row => row.startsWith('session-sync-needed='));
    
    // Only trigger initialSync if we haven't processed it for this mount yet
    const shouldSyncInitial = initialSyncNeeded && !initialSyncProcessed.current;
    const shouldSync = shouldSyncInitial || hasCookieSignal;

    if (shouldSync) {
      console.log(`[SessionSync] 🔄 Stale session detected (Source: ${shouldSyncInitial ? 'Prop' : 'Cookie'}). Triggering JWT update...`);
      syncInProgress.current = true;
      if (shouldSyncInitial) {
        initialSyncProcessed.current = true;
      }
      
      // 2. Clear the cookie if it exists to prevent infinite loops
      if (hasCookieSignal) {
        document.cookie = "session-sync-needed=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      }

      // 3. Programmatically update the session
      update({ refreshFromDb: true }).then(() => {
        console.log("[SessionSync] ✅ JWT session successfully synchronized with DB.");
      }).catch(err => {
        console.error("[SessionSync] ❌ Sync failed:", err);
      }).finally(() => {
        syncInProgress.current = false;
      });
    }
  }, [status, update, initialSyncNeeded]);

  return null;
}
