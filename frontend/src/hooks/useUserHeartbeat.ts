"use client";

import { useEffect, useRef } from 'react';
import { updateLastSeenAction } from '@/app/actions/user-activity';

/**
 * Throttled heartbeat hook to update the user's "last seen" timestamp.
 * Updates every 5 minutes while the application is active and focused.
 */
export const useUserHeartbeat = (userId: string | undefined) => {
    const lastUpdateRef = useRef<number>(0);
    const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes

    useEffect(() => {
        if (!userId) return;

        const performUpdate = async () => {
            const now = Date.now();
            // Only update if interval has passed
            if (now - lastUpdateRef.current < HEARTBEAT_INTERVAL) return;

            try {
                await updateLastSeenAction(userId);
                lastUpdateRef.current = now;
            } catch (err) {
                console.error('Heartbeat failed:', err);
            }
        };

        // Update on mount with a small delay (3s) to prioritize layout and initial shell rendering
        const initialDelay = setTimeout(performUpdate, 3000);

        // Setup interval for subsequent updates
        const interval = setInterval(() => {
            // Only update if tab is focused to avoid unnecessary database writes
            if (document.visibilityState === 'visible') {
                performUpdate();
            }
        }, 60000); // Check every minute, but performUpdate throttles to 5m

        return () => {
            clearTimeout(initialDelay);
            clearInterval(interval);
        };
    }, [userId]);
};
