"use server";

import { djangoFetch } from '@/lib/django-client';

export async function requestDataDeletionAction(data: { name: string, email: string, reason: string }) {
    try {
        const result = await djangoFetch('users/users/request_deletion/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        if (result && result.error) {
            return { success: false, error: result.error };
        }
        return { success: true };
    } catch (error: any) {
        console.error('Error recording deletion request:', error);
        return { success: false, error: error.message };
    }
}
