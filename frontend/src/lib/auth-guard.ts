/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth";
import { djangoFetch } from "./django-client";
import { cache } from "react";

const extractId = (obj: any): string | undefined => {
  if (!obj) return undefined;
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'object' && obj.id) return obj.id;
  return undefined;
};

/**
 * 🚀 PERFORMANCE: Wrapped in React.cache to deduplicate within the same SSR request.
 */
export const verifyUserAccess = cache(async (userId: string, session?: any) => {
  const activeSession = session || (await auth());
  if (!activeSession || !activeSession.user) {
    throw new Error("Unauthorized: No active session");
  }

  const sessionUser = activeSession.user as any;
  const currentUserId = extractId(sessionUser.id);
  const targetUserId = extractId(userId);
  const isSuperAdmin = sessionUser.role?.toLowerCase() === "superadmin";

  if (!isSuperAdmin && currentUserId !== targetUserId) {
    throw new Error("Unauthorized: User access denied");
  }

  return sessionUser;
});

// Server-side cache for branch ownership verification within a single request lifecycle
// This prevents 10+ concurrent actions from hitting the DB 10+ times for the same branch check.
const branchOwnershipCache = new Map<string, any>();

/**
 * 🚀 PERFORMANCE: Wrapped in React.cache to deduplicate within the same SSR request.
 */
export const verifyBranchAccess = cache(async (branchId: string, session?: any) => {
  const activeSession = session || (await auth());
  if (!activeSession || !activeSession.user) {
    throw new Error("Unauthorized: No active session");
  }

  const sessionUser = activeSession.user as any;
  const userRole = sessionUser.role?.toLowerCase();
  const userAgencyId = extractId(sessionUser.agencyId);
  const userBranchId = extractId(sessionUser.branchId);
  const targetBranchId = extractId(branchId);

  if (userRole === "superadmin") {
    return sessionUser;
  }

  // ⚡️ INSTANT PASS: If user is assigned to this branch in their session, skip DB check.
  if (userBranchId && userBranchId === targetBranchId) {
    return sessionUser;
  }

  // If user is an admin, they can access any branch within their agency
  if (userRole === "admin" && userAgencyId && targetBranchId) {
    // 1. Check module-level cache first (persists between concurrent Server Action calls)
    const cacheKey = `${userAgencyId}_${targetBranchId}`;
    if (branchOwnershipCache.has(cacheKey)) {
        return sessionUser;
    }

    try {
      const branch = await djangoFetch(`core/branches/${targetBranchId}/`, { accessToken: (activeSession as any).accessToken });
      const branchAgencyId = extractId(branch.agency);
      
      if (branchAgencyId === userAgencyId) {
        // 2. Cache successful verification
        branchOwnershipCache.set(cacheKey, true);
        return sessionUser;
      }
    } catch (error: any) {
      if (error.message?.includes("Session stale")) {
        console.warn(`[AuthGuard] Verification skipped for branch ${targetBranchId}: Session is orphaned (401).`);
      } else {
        console.error(`[AuthGuard] Could not verify branch ${targetBranchId} ownership:`, error.message || error);
      }
    }
  }

  console.error(`[AuthGuard] Access Denied: User ${sessionUser.email} (Role: ${userRole}) attempted to access branch ${targetBranchId}`);
  throw new Error("Unauthorized: You do not have access to this branch");
});

export const verifyAgencyAccess = cache(async (agencyId: string, session?: any) => {
    const activeSession = session || (await auth());
    if (!activeSession || !activeSession.user) {
      throw new Error("Unauthorized: No active session");
    }
  
    const sessionUser = activeSession.user as any;
    const userRole = sessionUser.role?.toLowerCase();
    const userAgencyId = extractId(sessionUser.agencyId);
    const targetAgencyId = extractId(agencyId);

    console.log(`[AuthGuard] verifyAgencyAccess: userAgencyId="${userAgencyId}", targetAgencyId="${targetAgencyId}"`);
  
    if (userRole === "superadmin") {
      return sessionUser;
    }
  
    if (!userAgencyId || userAgencyId !== targetAgencyId) {
      console.error(`[AuthGuard] Agency Mismatch! Session has ${userAgencyId} but requested ${targetAgencyId}`);
      throw new Error("Unauthorized: Agency access denied");
    }
  
    return sessionUser;
});
