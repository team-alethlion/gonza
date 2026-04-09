"use server";

import { revalidatePath } from 'next/cache';
import { checkUserQuota } from '@/lib/quota-check';
import { verifyBranchAccess } from '@/lib/auth-guard';
import { djangoFetch } from '@/lib/django-client';

export async function getProfilesAction(branchId: string, session?: any) {
    try {
        await verifyBranchAccess(branchId, session);

        const users = await djangoFetch(`users/users/?branchId=${branchId}`, {
            accessToken: session?.accessToken
        });
        const usersList = Array.isArray(users) ? users : (users.results || []);

        return usersList.map((u: any) => {
            let roleName = u.role?.name || 'staff';
            
            if (roleName.toLowerCase() === 'admin') {
                roleName = 'Admin';
            } else if (roleName.toLowerCase() === 'superadmin') {
                roleName = 'superadmin';
            } else {
                roleName = roleName.charAt(0).toUpperCase() + roleName.slice(1).toLowerCase();
            }

            return {
                id: u.id,
                business_location_id: u.branch,
                profile_name: u.first_name + (u.last_name ? ' ' + u.last_name : ''),
                email: u.email,
                phone_number: u.phone,
                role: roleName,
                pin: u.pin || '0000',
                role_id: u.role?.id,
                business_role: u.role ? {
                    id: u.role.id,
                    name: roleName,
                    permissions: u.role.permissions?.reduce((acc: any, p: any) => {
                        const parts = p.name.split(':');
                        const module = parts[0];
                        const action = parts[1] || 'all';
                        if (!acc[module]) acc[module] = [];
                        acc[module].push(action);
                        return acc;
                    }, {}) || {}
                } : undefined,
                is_active: u.status === 'ACTIVE',
                sms_credits: u.credits,
                created_by: u.agency || u.id,
                created_at: u.created_at || new Date().toISOString(),
                updated_at: u.updated_at || new Date().toISOString(),
            };
        });
    } catch (error: any) {
        if (error.message?.includes("Session stale")) {
            console.warn(`[ProfilesAction] Request blocked: Session is orphaned (Redirection expected).`);
        } else {
            console.error('Error fetching profiles:', error.message || error);
        }
        return [];
    }
}

export async function createProfileAction(branchId: string, profileData: any) {
    try {
        const sessionUser = await verifyBranchAccess(branchId);
        const userAgencyId = (sessionUser as any).agencyId;
        
        if (userAgencyId) { 
            await checkUserQuota(userAgencyId); 
        }

        let roleId = profileData.role_id;
        if (!roleId) {
            // Find default role logic would ideally reside on Django, but we pass None if we rely on it.
            // For now, let Django handle it or we fetch roles to find "Staff"
            const allRoles = await djangoFetch(`users/roles/?branchId=${branchId}`);
            const rolesList = Array.isArray(allRoles) ? allRoles : (allRoles.results || []);
            const defaultRole = rolesList.find((r: any) => r.name === (profileData.role || 'Staff'));
            roleId = defaultRole?.id;
        }

        const newUser = await djangoFetch('users/users/', {
            method: 'POST',
            body: JSON.stringify({
                email: profileData.email,
                name: profileData.profile_name,
                pin: profileData.pin,
                status: profileData.is_active !== undefined ? (profileData.is_active ? 'ACTIVE' : 'INACTIVE') : 'ACTIVE',
                roleId: roleId,
                branchId: branchId
            })
        });

        revalidatePath('/profiles');
        return { success: true, data: newUser };
    } catch (error: any) {
        console.error('Error creating profile:', error);
        return { success: false, error: error.message };
    }
}

export async function updateProfileAction(userId: string, branchId: string, updateData: any) {
    try {
        await verifyBranchAccess(branchId);

        const payload: any = {};
        if (updateData.profile_name !== undefined) payload.name = updateData.profile_name;
        if (updateData.email !== undefined) payload.email = updateData.email;
        if (updateData.pin !== undefined) payload.pin = updateData.pin;
        if (updateData.is_active !== undefined) payload.status = updateData.is_active ? 'ACTIVE' : 'INACTIVE';
        if (updateData.role_id !== undefined) payload.roleId = updateData.role_id;

        const updatedUser = await djangoFetch(`users/users/${userId}/`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });

        revalidatePath('/profiles');
        return { success: true, data: updatedUser };
    } catch (error: any) {
        console.error('Error updating profile:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteProfileAction(userId: string, branchId: string) {
    try {
        await verifyBranchAccess(branchId);
        await djangoFetch(`users/users/${userId}/`, { method: 'DELETE' });
        revalidatePath('/profiles');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting profile:', error);
        return { success: false, error: error.message };
    }
}

export async function getRolesAction(branchId: string) {
    try {
        await verifyBranchAccess(branchId);
        const roles = await djangoFetch(`users/roles/?branchId=${branchId}`);
        const list = Array.isArray(roles) ? roles : (roles.results || []);

        return list.map((r: any) => ({
            id: r.id,
            name: r.name,
            description: r.description,
            business_location_id: r.branch,
            permissions: (r.permissions || []).reduce((acc: any, p: any) => {
                const parts = p.name.split(':');
                const module = parts[0];
                const action = parts[1] || 'all';
                if (!acc[module]) acc[module] = [];
                acc[module].push(action);
                return acc;
            }, {})
        }));
    } catch (error: any) {
        console.error("Error getRolesAction", error);
        return [];
    }
}

export async function upsertRoleAction(branchId: string, roleData: any) {
    try {
        await verifyBranchAccess(branchId);
        
        const flatPermissions: string[] = [];
        if (roleData.permissions) {
            Object.keys(roleData.permissions).forEach(module => {
                roleData.permissions[module].forEach((action: string) => {
                    flatPermissions.push(`${module}:${action}`);
                });
            });
        }

        const payload = {
            name: roleData.name,
            description: roleData.description,
            branchId: branchId,
            permissions: flatPermissions
        };

        let result;
        if (roleData.id) {
            result = await djangoFetch(`users/roles/${roleData.id}/`, {
                method: 'PATCH',
                body: JSON.stringify(payload)
            });
        } else {
            result = await djangoFetch('users/roles/', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        }

        revalidatePath('/profiles');
        return { success: true, data: result };
    } catch (error: any) {
        console.error('Error upserting role:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteRoleAction(roleId: string, branchId: string) {
    try {
        await verifyBranchAccess(branchId);
        await djangoFetch(`users/roles/${roleId}/`, { method: 'DELETE' });
        revalidatePath('/profiles');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting role:', error);
        return { success: false, error: error.message };
    }
}
