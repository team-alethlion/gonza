/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { verifyBranchAccess, verifyUserAccess } from '@/lib/auth-guard';
import { djangoFetch } from '@/lib/django-client';

export interface ActivityLogInput {
    userId: string;
    locationId: string;
    activityType: string;
    module: string;
    entityType: string;
    entityId?: string;
    entityName: string;
    description: string;
    metadata?: any;
    profileId?: string;
    profileName?: string;
}

export async function logActivityAction(data: ActivityLogInput) {
    try {
        await verifyBranchAccess(data.locationId);
        await verifyUserAccess(data.userId);
        
        const payload = {
            user: data.userId,
            location_id: data.locationId,
            activity_type: data.activityType,
            module: data.module,
            entity_type: data.entityType,
            entity_id: data.entityId || null,
            entity_name: data.entityName,
            description: data.description,
            metadata: data.metadata || null,
            profile_id: data.profileId || null,
            profile_name: data.profileName || null
        };

        const result = await djangoFetch('core/activity-history/', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (result && result.error) throw new Error(result.error);

        return { success: true };
    } catch (error: any) {
        console.error('Error logging activity:', error);
        return { success: false, error: error.message };
    }
}

export interface ActivityFilters {
    activityType?: string;
    module?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
}

export async function getActivityHistoryAction(
    locationId: string,
    userId: string,
    page: number = 1,
    pageSize: number = 20,
    filters?: ActivityFilters
) {
    try {
        const sessionUser = await verifyBranchAccess(locationId);
        const userRole = sessionUser.role?.toLowerCase();

        const actualPage = Math.max(1, Number(page) || 1);
        const actualPageSize = Math.max(1, Number(pageSize) || 20);
        const offset = (actualPage - 1) * actualPageSize;

        let queryParams = `locationId=${locationId}&limit=${actualPageSize}&offset=${offset}`;

        // AUTHORIZATION: Only Admin/Manager can see 'ALL' users. Others forced to their own ID.
        const canViewAll = userRole === 'admin' || userRole === 'manager' || userRole === 'superadmin' || userRole === 'agency';

        if (!canViewAll) {
            queryParams += `&userId=${sessionUser.id}`;
        } else if (userId && userId !== 'ALL') {
            queryParams += `&userId=${userId}`;
        }

        if (filters) {
            if (filters.activityType && filters.activityType !== 'ALL') {
                queryParams += `&activityType=${filters.activityType}`;
            }
            if (filters.module && filters.module !== 'ALL') {
                queryParams += `&module=${filters.module}`;
            }
            if (filters.search) {
                queryParams += `&search=${encodeURIComponent(filters.search)}`;
            }
            if (filters.dateFrom) {
                queryParams += `&dateFrom=${filters.dateFrom}`;
            }
            if (filters.dateTo) {
                queryParams += `&dateTo=${filters.dateTo}`;
            }
        }

        const activities = await djangoFetch(`core/activity-history/?${queryParams}`);
        const list = Array.isArray(activities) ? activities : (activities.results || []);

        return {
            success: true,
            data: {
                activities: list.map((a: any) => ({
                    ...a,
                    created_at: a.created_at,
                    activity_type: a.activity_type,
                    location_id: a.location_id,
                    user_id: a.user,
                    entity_type: a.entity_type,
                    entity_id: a.entity_id,
                    entity_name: a.entity_name,
                    profile_id: a.profile_id,
                    profile_name: a.profile_name
                })),
                count: activities.count || list.length
            }
        };
    } catch (error: any) {
        console.error('Error fetching activity history:', error);
        return { success: false, error: error.message };
    }
}

export async function getActivityHistoryByTypeAction(locationId: string, module: string, activityType: string) {
    try {
        await verifyBranchAccess(locationId);

        const records = await djangoFetch(`core/activity-history/?locationId=${locationId}&module=${module}&activityType=${activityType}`);
        const list = Array.isArray(records) ? records : (records.results || []);

        return {
            success: true,
            data: list.map((a: any) => ({
                ...a,
                createdAt: a.created_at,
                profileName: a.profile_name
            }))
        };
    } catch (error: any) {
        console.error('Error fetching activity history by type:', error);
        return { success: false, error: error.message, data: [] };
    }
}
