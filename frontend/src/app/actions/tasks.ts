"use server";

import { revalidatePath } from 'next/cache';
import { verifyBranchAccess, verifyUserAccess } from '@/lib/auth-guard';
import { djangoFetch } from '@/lib/django-client';
import { auth } from '@/auth';
import { addDays, addWeeks, addMonths } from 'date-fns';

export interface CreateTaskInput {
    userId: string;
    locationId: string;
    title: string;
    description?: string | null;
    priority: string;
    dueDate: Date;
    category?: string | null;
    reminderEnabled?: boolean;
    reminderTime?: string | null;
    isRecurring?: boolean;
    recurrenceType?: string | null;
    recurrenceEndDate?: Date | null;
}

export async function getTasksAction(userId: string, locationId: string, filters?: any) {
    await verifyBranchAccess(locationId);
    await verifyUserAccess(userId);
    try {
        const session = await auth();
        const token = (session?.user as any)?.accessToken;

        let url = `tasks/tasks/?userId=${userId}&locationId=${locationId}`;
        if (filters) {
            if (filters.status) url += `&status=${filters.status}`;
            if (filters.priority) url += `&priority=${filters.priority}`;
            if (filters.category) url += `&category=${encodeURIComponent(filters.category)}`;
            if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`;
        }

        const tasks = await djangoFetch(url, { accessToken: token });
        const list = Array.isArray(tasks) ? tasks : (tasks.results || []);

        return {
            success: true,
            data: list.map((t: any) => ({
                ...t,
                user_id: t.created_by,
                location_id: t.branch,
                due_date: t.due_date,
                completed_at: t.completed_at,
                created_at: t.created_at,
                updated_at: t.updated_at,
                reminder_enabled: t.reminder_enabled,
                reminder_time: t.reminder_time,
                is_recurring: t.is_recurring,
                recurrence_type: t.recurrence_type,
                recurrence_end_date: t.recurrence_end_date,
                parent_task_id: t.parent_task_id,
                recurrence_count: t.recurrence_count
            }))
        };
    } catch (error: any) {
        console.error('Error fetching tasks:', error);
        return { success: false, error: error.message };
    }
}

export async function getTaskStatsAction(userId: string, locationId: string, filters?: any) {
    await verifyBranchAccess(locationId);
    await verifyUserAccess(userId);
    try {
        const session = await auth();
        const token = (session?.user as any)?.accessToken;

        let url = `tasks/tasks/stats/?userId=${userId}&locationId=${locationId}`;
        if (filters) {
            if (filters.category) url += `&category=${encodeURIComponent(filters.category)}`;
        }
        const stats = await djangoFetch(url, { accessToken: token });
        return { success: true, data: stats };
    } catch (error: any) {
        console.error('Error fetching task stats:', error);
        return { success: false, error: error.message };
    }
}

export async function createTaskAction(data: CreateTaskInput) {
    await verifyBranchAccess(data.locationId);
    await verifyUserAccess(data.userId);
    try {
        const session = await auth();
        const token = (session?.user as any)?.accessToken;

        const payload = {
            created_by: data.userId,
            branch: data.locationId,
            title: data.title,
            description: data.description || null,
            priority: data.priority,
            due_date: data.dueDate.toISOString(),
            category: data.category || null,
            reminder_enabled: data.reminderEnabled || false,
            reminder_time: data.reminderTime || null,
            is_recurring: data.isRecurring || false,
            recurrence_type: data.recurrenceType || null,
            recurrence_end_date: data.recurrenceEndDate ? data.recurrenceEndDate.toISOString() : null
        };

        const task = await djangoFetch('tasks/tasks/', {
            method: 'POST',
            body: JSON.stringify(payload),
            accessToken: token
        });

        if (task && task.error) throw new Error(task.error);


        revalidatePath('/tasks');
        return { success: true, data: task };
    } catch (error: any) {
        console.error('Error creating task:', error);
        return { success: false, error: error.message };
    }
}

export async function updateTaskAction(id: string, userId: string, updates: any) {
    await verifyUserAccess(userId);
    try {
        // Map camelCase to snake_case
        const payload: any = {};
        if (updates.title !== undefined) payload.title = updates.title;
        if (updates.description !== undefined) payload.description = updates.description;
        if (updates.priority !== undefined) payload.priority = updates.priority;
        if (updates.dueDate !== undefined) payload.due_date = updates.dueDate;
        if (updates.category !== undefined) payload.category = updates.category;
        if (updates.completed !== undefined) payload.completed = updates.completed;
        if (updates.completedAt !== undefined) payload.completed_at = updates.completedAt;
        if (updates.reminderEnabled !== undefined) payload.reminder_enabled = updates.reminderEnabled;
        if (updates.reminderTime !== undefined) payload.reminder_time = updates.reminderTime;
        if (updates.isRecurring !== undefined) payload.is_recurring = updates.isRecurring;
        if (updates.recurrenceType !== undefined) payload.recurrence_type = updates.recurrenceType;
        if (updates.recurrenceEndDate !== undefined) payload.recurrence_end_date = updates.recurrenceEndDate;

        const session = await auth();
        const token = (session?.user as any)?.accessToken;

        const task = await djangoFetch(`tasks/tasks/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
            accessToken: token
        });

        if (task && task.error) throw new Error(task.error);

        revalidatePath('/tasks');
        return { success: true, data: task };
    } catch (error: any) {
        console.error('Error updating task:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteTaskAction(id: string, userId: string) {
    await verifyUserAccess(userId);
    try {
        const session = await auth();
        const token = (session?.user as any)?.accessToken;

        await djangoFetch(`tasks/tasks/${id}/`, { 
            method: 'DELETE',
            accessToken: token
        });
        revalidatePath('/tasks');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting task:', error);
        return { success: false, error: error.message };
    }
}

export async function bulkUpdateTasksAction(ids: string[], userId: string, updates: any) {
    await verifyUserAccess(userId);
    try {
        const session = await auth();
        const token = (session?.user as any)?.accessToken;

        const result = await djangoFetch('tasks/tasks/bulk_update/', {
            method: 'PATCH',
            body: JSON.stringify({ ids, updates }),
            accessToken: token
        });
        revalidatePath('/tasks');
        return { success: true, data: result };
    } catch (error: any) {
        console.error('Error bulk updating tasks:', error);
        return { success: false, error: error.message };
    }
}

export async function bulkDeleteTasksAction(ids: string[], userId: string) {
    await verifyUserAccess(userId);
    try {
        const session = await auth();
        const token = (session?.user as any)?.accessToken;

        const result = await djangoFetch('tasks/tasks/bulk_delete/', {
            method: 'DELETE',
            body: JSON.stringify({ ids }),
            accessToken: token
        });
        revalidatePath('/tasks');
        return { success: true, data: result };
    } catch (error: any) {
        console.error('Error bulk deleting tasks:', error);
        return { success: false, error: error.message };
    }
}

export async function getTaskCategoriesAction(userId: string, locationId: string) {
    await verifyBranchAccess(locationId);
    await verifyUserAccess(userId);
    try {
        const session = await auth();
        const token = (session?.user as any)?.accessToken;

        const categories = await djangoFetch(`tasks/task-categories/?locationId=${locationId}`, { accessToken: token });
        const list = Array.isArray(categories) ? categories : (categories.results || []);

        return {
            success: true,
            data: list.map((c: any) => ({
                ...c,
                user_id: c.user,
                location_id: c.branch,
                created_at: c.created_at,
                updated_at: c.updated_at
            }))
        };
    } catch (error: any) {
        console.error('Error fetching categories:', error);
        return { success: false, error: error.message };
    }
}

export async function createTaskCategoryAction(userId: string, locationId: string, name: string) {
    await verifyBranchAccess(locationId);
    await verifyUserAccess(userId);
    try {
        const session = await auth();
        const token = (session?.user as any)?.accessToken;

        const category = await djangoFetch('tasks/task-categories/', {
            method: 'POST',
            body: JSON.stringify({ user: userId, branch: locationId, name }),
            accessToken: token
        });
        
        // Handle DRF unique constraint error specifically
        if (category && category.non_field_errors && category.non_field_errors[0]?.includes('unique set')) {
            return { success: true, alreadyExists: true };
        }

        if (category && category.error) throw new Error(category.error);

        return { success: true, data: category };
    } catch (error: any) {
        // If the error message itself contains the unique constraint message
        if (error.message?.includes('unique set')) {
            return { success: true, alreadyExists: true };
        }
        console.error('Error creating category:', error);
        return { success: false, error: error.message };
    }
}

export async function updateTaskCategoryAction(id: string, userId: string, name: string) {
    await verifyUserAccess(userId);
    try {
        const session = await auth();
        const token = (session?.user as any)?.accessToken;

        const category = await djangoFetch(`tasks/task-categories/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify({ name }),
            accessToken: token
        });
        if (category && category.error) throw new Error(category.error);

        return { success: true, data: category };
    } catch (error: any) {
        console.error('Error updating category:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteTaskCategoryAction(id: string, userId: string) {
    await verifyUserAccess(userId);
    try {
        const session = await auth();
        const token = (session?.user as any)?.accessToken;

        await djangoFetch(`tasks/task-categories/${id}/`, { 
            method: 'DELETE',
            accessToken: token
        });
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting category:', error);
        return { success: false, error: error.message };
    }
}

export async function createDefaultTaskCategoriesAction(userId: string, locationId: string) {
    await verifyBranchAccess(locationId);
    await verifyUserAccess(userId);
    try {
        const session = await auth();
        const token = (session?.user as any)?.accessToken;

        const defaultNames = ['General', 'Marketing', 'Operations', 'Finance', 'Follow-up'];
        
        const result = await djangoFetch('tasks/task-categories/bulk_create/', {
            method: 'POST',
            body: JSON.stringify({ 
                branch: locationId, 
                user: userId, 
                names: defaultNames 
            }),
            accessToken: token
        });

        return { success: true, data: result };
    } catch (error: any) {
        console.error('Error creating default categories:', error);
        return { success: false, error: error.message };
    }
}
