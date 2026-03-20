"use server";

import { verifyBranchAccess, verifyUserAccess } from '@/lib/auth-guard';
import { djangoFetch } from '@/lib/django-client';

interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

// Force module cache invalidation
export async function getSubscriptionTransactionsAction(userId: string) {
    await verifyUserAccess(userId);
    try {
        const transactions = await djangoFetch<any[] | PaginatedResponse<any>>(`core/subscriptions/?userId=${userId}`);
        const list = Array.isArray(transactions) ? transactions : (transactions.results || []);

        return list.map((t: any) => ({
            id: t.id,
            created_at: t.created_at,
            billing_cycle: t.billing_cycle,
            amount: Number(t.amount),
            payment_status: t.status,
            pesapal_tracking_id: t.pesapal_order_tracking_id
        }));
    } catch (error) {
        console.error('Error fetching subscription payments:', error);
        return [];
    }
}



function normalizeUgPhoneNumber(raw: string): string {
    let phone = raw.trim().replace(/\s+/g, '');
    if (phone.startsWith('+256')) phone = phone.substring(4);
    else if (phone.startsWith('256')) phone = phone.substring(3);
    if (!phone.startsWith('0')) phone = '0' + phone;
    if (!/^07\d{8}$/.test(phone)) throw new Error(`Invalid Ugandan phone number format: ${raw}`);
    return phone;
}

export async function initiateSubscriptionPaymentAction(userId: string, locationId: string, billingCycle: string, phone: string, newPackageId?: string) {
    await verifyBranchAccess(locationId);
    await verifyUserAccess(userId);
    try {
        const user = await djangoFetch<any>(`users/users/${userId}/`);
        if (!user || !user.agency) throw new Error("User or Agency not found.");
        
        // Robust extraction: handles ID string or nested Agency object
        const agencyId = typeof user.agency === 'object' ? user.agency.id : user.agency;
        const agency = await djangoFetch<any>(`core/agencies/${agencyId}/`);
        let pkg;
        
        if (newPackageId) {
            pkg = await djangoFetch<any>(`core/packages/${newPackageId}/`);
        } else {
            // Robust extraction: handles ID string or nested Package object
            const packageId = typeof agency.package === 'object' ? agency.package.id : agency.package;
            pkg = await djangoFetch<any>(`core/packages/${packageId}/`);
        }
        if (!pkg || pkg.error) throw new Error("Subscription package not found.");

        const billingCycleLower = billingCycle.toLowerCase();
        const amount = billingCycleLower === 'yearly' ? Number(pkg.yearly_price) : Number(pkg.monthly_price);

        const response = await djangoFetch<any>('finance/transactions/initiate_payment/', {
            method: 'POST',
            body: JSON.stringify({
                amount,
                description: `Subscription Renewal - ${pkg.name} (${billingCycle})`,
                type: 'subscription',
                agency_id: agency.id,
                package_id: pkg.id,
                billing_cycle: billingCycleLower,
                branch_id: locationId,
                phone: normalizeUgPhoneNumber(phone)
            })
        });

        if (response && response.redirect_url) {
            return { success: true, redirect_url: response.redirect_url };
        } else {
            throw new Error(response?.error || "Failed to initiate payment");
        }
    } catch (error: any) {
        console.error('Error initiating subscription payment:', error);
        return { success: false, error: error.message };
    }
}
