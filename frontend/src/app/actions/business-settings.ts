"use server";

import { revalidatePath } from 'next/cache';
import { verifyBranchAccess, verifyUserAccess } from '@/lib/auth-guard';
import { djangoFetch } from '@/lib/django-client';

export async function getBusinessSettingsAction(branchId: string) {
    await verifyBranchAccess(branchId);
    try {
        const result = await djangoFetch(`core/settings/?branchId=${branchId}`);
        const settings = Array.isArray(result) ? result[0] : (result.results?.[0]);

        if (!settings) {
            return null;
        }

        return {
            id: settings.id,
            business_name: settings.business_name,
            business_address: settings.address,
            business_phone: settings.phone,
            business_email: settings.email,
            business_logo: settings.logo,
            currency: settings.currency,
            signature: settings.signature_image,
            metadata: settings.metadata || {}
        };
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

        return {
            success: true,
            data: {
                id: result.id,
                business_name: result.business_name,
                business_address: result.address,
                business_phone: result.phone,
                business_email: result.email,
                business_logo: result.logo,
                currency: result.currency,
                signature: result.signature_image,
                metadata: result.metadata
            }
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

export async function getAccountStatusAction(userId: string) {
    await verifyUserAccess(userId);
    try {
        const user = await djangoFetch(`users/users/${userId}/`);
        if (!user || user.error) return null;

        let agency = null;
        if (user.agency) {
            // Robust extraction: handles ID string or nested Agency object
            const agencyId = typeof user.agency === 'object' ? user.agency.id : user.agency;
            agency = await djangoFetch(`core/agencies/${agencyId}/`);
        }

        const now = new Date();
        const isFrozen = user.status === 'SUSPENDED' || user.status === 'EXPIRED' || user.status === 'INACTIVE';

        let daysRemaining = 0;
        let nextBillingDate = '';

        if (agency) {
            const expiryDate = agency.subscription_expiry || agency.trial_end_date;
            if (expiryDate) {
                const expiryDateObj = new Date(expiryDate);
                daysRemaining = Math.max(0, Math.ceil((expiryDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                
                if (expiryDateObj > now) {
                    nextBillingDate = expiryDateObj.toISOString();
                }
            }
        }

        let billingAmount = 50000;
        let locationLimit = 1;
        const isTrial = agency?.subscription_status === 'trial';

        if (agency && agency.package) {
            // Robust extraction: handles ID string or nested Package object
            const packageId = typeof agency.package === 'object' ? agency.package.id : agency.package;
            const pkg = await djangoFetch(`core/packages/${packageId}/`);
            if (pkg && !pkg.error) {
                billingAmount = Number(pkg.monthly_price) || 50000;
                
                if (isTrial) {
                    locationLimit = 1;
                } else if (pkg.unlimited_locations) {
                    locationLimit = 999;
                } else {
                    locationLimit = pkg.max_locations || 1;
                }
            }
        }

        return {
            is_frozen: isFrozen,
            location_limit: locationLimit,
            billing_amount: billingAmount,
            billing_duration: 'Monthly',
            days_remaining: daysRemaining,
            next_billing_date: nextBillingDate,
            package_id: (typeof agency?.package === 'object' ? agency?.package.id : agency?.package) || null,
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
            completed: !!settings.business_name && !!settings.phone, 
            is_frozen: false 
        };
    } catch (error) {
        console.error('Error fetching onboarding status:', error);
        return null;
    }
}
