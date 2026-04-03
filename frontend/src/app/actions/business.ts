"use server";

import { revalidatePath } from "next/cache";
import { verifyBranchAccess, verifyUserAccess } from "@/lib/auth-guard";
import { djangoFetch } from "@/lib/django-client";

export async function getBusinessLocationsAction(userId: string, session?: any) {
  try {
    const sessionUser = await verifyUserAccess(userId, session);
    const sessionBranchId = (sessionUser as any).branchId;

    const branches = await djangoFetch('core/branches/', {
        accessToken: session?.accessToken
    });
    const list = Array.isArray(branches) ? branches : (branches.results || []);

    return list.map((b: any, index: number) => ({
      id: b.id,
      name: b.name,
      user_id: b.admin,
      // Prioritize the branch ID in the session, otherwise first one is default
      is_default: b.id === sessionBranchId || (index === 0 && !sessionBranchId),
      created_at: b.created_at,
      updated_at: b.updated_at,
      switch_password_hash: b.access_password,
    }));
  } catch (error) {
    console.error("Error fetching business locations:", error);
    return [];
  }
}

export async function createBusinessAction(userId: string, name: string) {
  try {
    await verifyUserAccess(userId);
    const branch = await djangoFetch('core/branches/', {
        method: 'POST',
        body: JSON.stringify({ name })
    });

    return {
      success: true,
      data: {
        id: branch.id,
        name: branch.name,
        user_id: branch.admin,
        is_default: false,
        created_at: branch.created_at,
        updated_at: branch.updated_at,
        switch_password_hash: branch.access_password,
      },
    };
  } catch (error: any) {
    console.error("Error creating business:", error);
    return { success: false, error: error.message || "Failed to create business" };
  }
}

export async function updateBusinessAction(
  id: string,
  userId: string,
  name: string,
) {
  try {
    await verifyUserAccess(userId);
    await verifyBranchAccess(id);

    const branch = await djangoFetch(`core/branches/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ name })
    });

    return {
      success: true,
      data: {
        id: branch.id,
        name: branch.name,
        user_id: branch.admin,
        is_default: false,
        created_at: branch.created_at,
        updated_at: branch.updated_at,
        switch_password_hash: branch.access_password,
      },
    };
  } catch (error: any) {
    console.error("Error updating business:", error);
    return { success: false, error: error.message || "Failed to update business" };
  }
}

export async function deleteBusinessAction(id: string, userId: string) {
  try {
    await verifyUserAccess(userId);
    await verifyBranchAccess(id);

    await djangoFetch(`core/branches/${id}/`, { method: 'DELETE' });

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting business:", error);
    return { success: false, error: error.message || "Failed to delete business" };
  }
}

// --- BUSINESS RESET ---

export async function resetBusinessAction(id: string, userId: string) {
  try {
    await verifyUserAccess(userId);
    await verifyBranchAccess(id);

    const result = await djangoFetch(`core/branches/${id}/reset/`, { method: 'POST' });
    if (result && result.error) throw new Error(result.error);

    return { success: true };
  } catch (error: any) {
    console.error("Error resetting business:", error);
    return { success: false, error: error.message };
  }
}

// --- BUSINESS PASSWORD ---

export async function setBusinessPasswordAction(
  businessId: string,
  password: string,
) {
  try {
    await verifyBranchAccess(businessId);
    await djangoFetch(`core/branches/${businessId}/set_password/`, {
        method: 'POST',
        body: JSON.stringify({ password })
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error setting business password:", error);
    return { success: false, error: error.message };
  }
}

export async function verifyBusinessPasswordAction(
  businessId: string,
  password: string,
) {
  try {
    const result = await djangoFetch(`core/branches/${businessId}/verify_password/`, {
        method: 'POST',
        body: JSON.stringify({ password })
    });
    return { success: true, verified: result?.verified };
  } catch (error: any) {
    console.error("Error verifying business password:", error);
    return { success: false, verified: false, error: error.message };
  }
}

export async function removeBusinessPasswordAction(businessId: string) {
  try {
    await verifyBranchAccess(businessId);
    await djangoFetch(`core/branches/${businessId}/remove_password/`, { method: 'POST' });
    return { success: true };
  } catch (error: any) {
    console.error("Error removing business password:", error);
    return { success: false, error: error.message };
  }
}
