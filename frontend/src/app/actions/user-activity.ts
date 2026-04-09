"use server";

import { verifyUserAccess } from '@/lib/auth-guard';
import { djangoFetch } from '@/lib/django-client';

/**
 * Updates the lastSeen timestamp for a user.
 * Throttled by the client to once every 5 minutes.
 */
export async function updateLastSeenAction(userId: string) {
    try {
        if (!userId) return { success: false, error: "User ID is required" };
        await verifyUserAccess(userId);

        const result = await djangoFetch(`users/users/${userId}/`, {
            method: 'PATCH',
            body: JSON.stringify({ last_seen: new Date().toISOString() })
        });
        
        if (result && result.error) throw new Error(result.error);

        return { success: true };
    } catch (error: any) {
        if (error.message?.includes("Session stale")) {
            console.log(`[ActivityAction] Update skipped: Session is orphaned.`);
        } else {
            console.error('Error updating lastSeen:', error.message || error);
        }
        return { success: false, error: error.message };
    }
}
