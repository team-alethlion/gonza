"use server";

import { revalidatePath } from 'next/cache';
import { verifyBranchAccess, verifyUserAccess } from '@/lib/auth-guard';
import { djangoFetch } from '@/lib/django-client';

export async function getMessagesAction(userId: string, businessId: string) {
    await verifyBranchAccess(businessId);
    await verifyUserAccess(userId);
    try {
        const messages = await djangoFetch(`messaging/messages/?userId=${userId}&locationId=${businessId}`);
        const list = Array.isArray(messages) ? messages : (messages.results || []);

        return {
            success: true,
            data: list.map((msg: any) => ({
                id: msg.id,
                userId: msg.user,
                locationId: msg.location_id,
                profileId: msg.profile_id,
                customerId: msg.customer,
                phoneNumber: msg.phone_number,
                content: msg.content,
                status: msg.status,
                smsCreditsUsed: msg.sms_credits_used,
                templateId: msg.template_id,
                errorMessage: msg.error_message,
                sentAt: msg.sent_at,
                deliveredAt: msg.delivered_at,
                createdAt: msg.created_at,
                updatedAt: msg.updated_at,
                metadata: msg.metadata
            }))
        };
    } catch (error: any) {
        console.error('Error fetching messages:', error);
        return { success: false, error: error.message };
    }
}

export async function createMessageAction(data: any) {
    await verifyBranchAccess(data.locationId);
    await verifyUserAccess(data.userId);
    try {
        const result = await djangoFetch('messaging/messages/', {
            method: 'POST',
            body: JSON.stringify({
                userId: data.userId,
                locationId: data.locationId,
                profileId: data.profileId,
                customerId: data.customerId,
                phoneNumber: data.phoneNumber,
                content: data.content,
                status: data.status,
                smsCreditsUsed: data.smsCreditsUsed,
                templateId: data.templateId,
                metadata: data.metadata
            })
        });

        if (result && result.error) throw new Error(result.error);

        revalidatePath('/messages');
        return { success: true, data: result };
    } catch (error: any) {
        console.error('Error creating message:', error);
        return { success: false, error: error.message };
    }
}

export async function getMessageTemplatesAction(userId: string, businessId: string) {
    await verifyBranchAccess(businessId);
    await verifyUserAccess(userId);
    try {
        const templates = await djangoFetch(`messaging/templates/?userId=${userId}&locationId=${businessId}`);
        const list = Array.isArray(templates) ? templates : (templates.results || []);

        return { 
            success: true, 
            data: list.map((t: any) => ({
                ...t,
                locationId: t.location_id,
                userId: t.user,
                isDefault: t.is_default,
                createdAt: t.created_at,
                updatedAt: t.updated_at
            }))
        };
    } catch (error: any) {
        console.error('Error fetching message templates:', error);
        return { success: false, error: error.message };
    }
}

export async function createMessageTemplateAction(data: any) {
    await verifyBranchAccess(data.locationId);
    await verifyUserAccess(data.userId);
    try {
        const template = await djangoFetch('messaging/templates/', {
            method: 'POST',
            body: JSON.stringify({
                user: data.userId,
                location_id: data.locationId,
                name: data.name,
                content: data.content,
                category: data.category,
                variables: data.variables,
                is_default: data.isDefault || false
            })
        });

        if (template && template.error) throw new Error(template.error);

        revalidatePath('/messages');
        return { success: true, data: template };
    } catch (error: any) {
        console.error('Error creating message template:', error);
        return { success: false, error: error.message };
    }
}

export async function updateMessageTemplateAction(id: string, data: any) {
    if (data.locationId) await verifyBranchAccess(data.locationId);
    if (data.userId) await verifyUserAccess(data.userId);
    try {
        const template = await djangoFetch(`messaging/templates/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify({
                name: data.name,
                content: data.content,
                category: data.category,
                variables: data.variables,
                is_default: data.isDefault
            })
        });

        if (template && template.error) throw new Error(template.error);

        revalidatePath('/messages');
        return { success: true, data: template };
    } catch (error: any) {
        console.error('Error updating message template:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteMessageTemplateAction(id: string) {
    const session = await import("@/auth").then(m => m.auth());
    if (!session?.user) throw new Error("Unauthorized");
    try {
        await djangoFetch(`messaging/templates/${id}/`, { method: 'DELETE' });

        revalidatePath('/messages');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting message template:', error);
        return { success: false, error: error.message };
    }
}
