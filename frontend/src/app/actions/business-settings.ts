"use server";

import { revalidatePath } from 'next/cache';
import { verifyBranchAccess, verifyUserAccess } from '@/lib/auth-guard';
import { djangoFetch } from '@/lib/django-client';

export async function getBusinessSettingsAction(branchId: string, session?: any) {
    await verifyBranchAccess(branchId, session);
    try {
        const result = await djangoFetch(`core/settings/?branchId=${branchId}`, {
            accessToken: session?.accessToken
        });
        const settings = Array.isArray(result) ? result[0] : (result.results?.[0]);

        if (!settings) {
            return null;
        }

        // Return raw database object (snake_case) to let the BusinessContext handle mapping
        return settings;
    } catch (error) {
        console.error('Error fetching business settings:', error);
        return null;
    }
}

export async function upsertBusinessSettingsAction(branchId: string, userId: string, updateData: any) {
    await verifyBranchAccess(branchId);
    await verifyUserAccess(userId);
    try {
        const payload = {
            branch: branchId,
            business_name: updateData.business_name,
            address: updateData.business_address,
            phone: updateData.business_phone,
            email: updateData.business_email,
            logo: updateData.business_logo,
            currency: updateData.currency,
            signature_image: updateData.signature,
            metadata: updateData.metadata,
            needs_onboarding: updateData.completed === true ? false : undefined
        };

        const existing = await djangoFetch(`core/settings/?branchId=${branchId}`);
        const existingData = Array.isArray(existing) ? existing[0] : (existing.results?.[0]);

        let result;
        if (existingData) {
            result = await djangoFetch(`core/settings/${existingData.id}/`, {
                method: 'PATCH',
                body: JSON.stringify(payload)
            });
        } else {
            result = await djangoFetch('core/settings/', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        }

        // Return raw result to allow consistent mapping in hooks
        return {
            success: true,
            data: result
        };
    } catch (error: any) {
        console.error('Error upserting business settings:', error);
        return { success: false, error: error.message || 'Failed to update settings' };
    }
}

export async function completeInitialOnboardingAction(data: any) {
    const { userId } = data;
    if (!userId) throw new Error("User ID is required for onboarding.");
    
    await verifyUserAccess(userId);
    try {
        const result = await djangoFetch('core/branches/onboarding/', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        if (result && result.error) throw new Error(result.error);

        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        console.error('Error completing initial onboarding:', error);
        return { success: false, error: error.message || 'Failed to complete onboarding' };
    }
}

export async function getAccountStatusAction(userId: string, session?: any) {
    await verifyUserAccess(userId, session);
    try {
        // 🚀 OPTIMIZATION: Fetch user, agency, and package in ONE call via optimized 'me' endpoint
        const user = await djangoFetch(`users/users/me/`, {
            accessToken: session?.accessToken
        });
        if (!user || user.error) return null;

        const agency = user.agency;
        const pkg = agency?.package;

        const now = new Date();
        const isFrozen = user.status === 'SUSPENDED' || user.status === 'EXPIRED' || user.status === 'INACTIVE';

        let daysRemaining = 0;
        let nextBillingDate = '';

        if (agency) {
            const expiryDate = agency.subscription_expiry || agency.trial_end_date;
            if (expiryDate) {
                const expiryDateObj = new Date(expiryDate);
                daysRemaining = Math.max(0, Math.ceil((expiryDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                if (expiryDateObj > now) nextBillingDate = expiryDateObj.toISOString();
            }
        }

        let billingAmount = 50000;
        let locationLimit = 1;
        const isTrial = agency?.subscription_status === 'trial';

        if (pkg) {
            billingAmount = Number(pkg.monthly_price) || 50000;
            if (isTrial) locationLimit = 1;
            else if (pkg.unlimited_locations) locationLimit = 999;
            else locationLimit = pkg.max_locations || 1;
        }

        return {
            is_frozen: isFrozen,
            location_limit: locationLimit,
            billing_amount: billingAmount,
            billing_duration: 'Monthly',
            days_remaining: daysRemaining,
            next_billing_date: nextBillingDate,
            package_id: pkg?.id || null,
            subscription_status: agency?.subscription_status || 'trial',
            is_trial: isTrial
        };
    } catch (error) {
        console.error('Error fetching account status:', error);
        return { 
            is_frozen: false, 
            location_limit: 1, 
            billing_amount: 50000, 
            billing_duration: 'Monthly', 
            days_remaining: 30, 
            next_billing_date: '', 
            package_id: null 
        };
    }
}

export async function getOnboardingStatusAction(locationId: string) {
    await verifyBranchAccess(locationId);
    try {
        const existing = await djangoFetch(`core/settings/?branchId=${locationId}`);
        const settings = Array.isArray(existing) ? existing[0] : (existing.results?.[0]);

        if (!settings) return null;

        return {
            id: settings.id,
            location_id: settings.branch,
            business_name: settings.business_name,
            business_address: settings.address,
            business_phone: settings.phone,
            business_email: settings.email,
            business_logo: settings.logo,
            nature_of_business: settings.metadata?.natureOfBusiness || "",
            business_size: settings.metadata?.businessSize || "",
            completed: !!settings.business_name && !!settings.phone, 
            is_frozen: false 
        };
    } catch (error) {
        console.error('Error fetching onboarding status:', error);
        return null;
    }
}
