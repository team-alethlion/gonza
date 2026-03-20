/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { djangoFetch } from '@/lib/django-client';

export async function getPackagesAction() {
    try {
        const packages = await djangoFetch('core/packages/');
        // Can filter for active on server if needed
        const list = Array.isArray(packages) ? packages.filter((p: any) => p.is_active) : (packages.results || []).filter((p: any) => p.is_active);

        return { 
            success: true, 
            data: list.map((pkg: any) => ({
                ...pkg,
                monthlyPrice: Number(pkg.monthly_price || 0),
                yearlyPrice: Number(pkg.yearly_price || 0),
                maxUsers: pkg.max_users,
                unlimitedUsers: pkg.unlimited_users,
                maxSalesPerMonth: pkg.max_sales_per_month,
                unlimitedSales: pkg.unlimited_sales,
                maxProducts: pkg.max_products,
                unlimitedProducts: pkg.unlimited_products,
                maxLocations: pkg.max_locations,
                unlimitedLocations: pkg.unlimited_locations,
                maxCustomers: pkg.max_customers,
                unlimitedCustomers: pkg.unlimited_customers,
                hasFreeTrial: pkg.has_free_trial,
                trialDays: pkg.trial_days,
                isDefault: pkg.is_default,
                isActive: pkg.is_active
            })).sort((a: any, b: any) => a.monthlyPrice - b.monthlyPrice)
        };
    } catch (error: any) {
        console.error('Error fetching packages:', error);
        return { success: false, error: error.message };
    }
}
