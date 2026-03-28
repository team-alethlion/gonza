/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from 'next/cache';
import { verifyBranchAccess, verifyUserAccess } from '@/lib/auth-guard';
import { djangoFetch } from '@/lib/django-client';

export async function getCustomerStatsAction(userId: string, branchId: string) {
    try {
        await verifyUserAccess(userId);
        await verifyBranchAccess(branchId);
        
        const data = await djangoFetch(`customers/customers/stats/?branchId=${branchId}`);
        return { success: true, data };
    } catch (error: any) {
        console.error('Error fetching customer stats:', error);
        return { success: false, error: error.message };
    }
}

export async function mergeCustomersAction(branchId: string, primaryCustomerId: string, duplicateIds: string[]) {
    try {
        await verifyBranchAccess(branchId);
        if (!primaryCustomerId || duplicateIds.length === 0) {
            return { success: false, error: 'Invalid selection' };
        }

        await djangoFetch(`customers/customers/merge/`, {
            method: 'POST',
            body: JSON.stringify({ branchId, primaryCustomerId, duplicateIds })
        });

        revalidatePath('/customers');
        return { success: true };
    } catch (error: any) {
        console.error('Error merging customers:', error);
        return { success: false, error: error.message || 'Failed to merge customers' };
    }
}

export async function getCustomersAction(branchId: string, page: number = 1, pageSize: number = 50, filters?: any) {
    try {
        await verifyBranchAccess(branchId);
        
        // 🛡️ DATA INTEGRITY: Ensure valid numeric pagination parameters
        const p = Math.max(1, Number(page) || 1);
        const ps = Math.max(1, Number(pageSize) || 50);
        const offset = (p - 1) * ps;
        
        let url = `customers/customers/?branchId=${branchId}&limit=${ps}&offset=${offset}`;
        
        if (filters) {
            if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`;
            if (filters.category) url += `&category=${filters.category}`;
            if (filters.gender) url += `&gender=${filters.gender}`;
        }

        const data = await djangoFetch<any>(url);
        
        let customersList = [];
        let count = 0;
        
        if (data && data.results !== undefined) {
             customersList = data.results;
             count = data.count;
        } else if (Array.isArray(data)) {
             customersList = data;
             count = data.length;
        }

        const mappedCustomers = customersList.map((c: any) => ({
            id: c.id,
            fullName: c.name,
            phoneNumber: c.phone,
            email: c.email,
            birthday: c.birthday ? new Date(c.birthday).toISOString() : null,
            gender: c.gender,
            location: c.address,
            categoryId: c.category,
            notes: c.notes,
            tags: c.tags || [],
            socialMedia: c.social_media || null,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
            lifetimeValue: Number(c.lifetimeValue || 0),
            orderCount: Number(c.orderCount || 0),
            creditLimit: Number(c.credit_limit || 0)
        }));

        return { success: true, data: { customers: mappedCustomers, count } };
    } catch (error: any) {
        console.error('Error fetching customers:', error);
        return { success: false, error: error.message };
    }
}

export async function createCustomerAction(branchId: string, userId: string, data: any) {
    try {
        await verifyUserAccess(userId);
        await verifyBranchAccess(branchId);
        
        const payload = {
            branch: branchId,
            admin: userId,
            name: data.fullName,
            phone: data.phoneNumber || null,
            email: data.email || null,
            birthday: data.birthday ? new Date(data.birthday).toISOString().split('T')[0] : null,
            gender: data.gender || null,
            address: data.location || null,
            category: data.categoryId || null,
            notes: data.notes || null,
            tags: data.tags || [],
            social_media: data.socialMedia || null,
            credit_limit: data.creditLimit || 0
        };
        
        const newCustomer = await djangoFetch('customers/customers/', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        revalidatePath('/customers');
        return { success: true, data: newCustomer };
    } catch (error: any) {
        console.error('Error creating customer:', error);
        return { success: false, error: error.message };
    }
}

export async function updateCustomerAction(customerId: string, branchId: string, data: any) {
    try {
        await verifyBranchAccess(branchId);
        const updateData: any = {};
        if (data.fullName !== undefined) updateData.name = data.fullName;
        if (data.phoneNumber !== undefined) updateData.phone = data.phoneNumber;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.birthday !== undefined) updateData.birthday = data.birthday ? new Date(data.birthday).toISOString().split('T')[0] : null;
        if (data.gender !== undefined) updateData.gender = data.gender;
        if (data.location !== undefined) updateData.address = data.location;
        if (data.categoryId !== undefined) updateData.category = data.categoryId;
        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.tags !== undefined) updateData.tags = data.tags;
        if (data.socialMedia !== undefined) updateData.social_media = data.socialMedia;
        if (data.creditLimit !== undefined) updateData.credit_limit = data.creditLimit;

        const updatedCustomer = await djangoFetch(`customers/customers/${customerId}/`, {
            method: 'PATCH',
            body: JSON.stringify(updateData)
        });
        
        revalidatePath('/customers');
        return { success: true, data: updatedCustomer };
    } catch (error: any) {
        console.error('Error updating customer:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteCustomerAction(customerId: string, branchId: string) {
    try {
        await verifyBranchAccess(branchId);
        await djangoFetch(`customers/customers/${customerId}/`, { method: 'DELETE' });
        revalidatePath('/customers');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting customer:', error);
        return { success: false, error: error.message };
    }
}

export async function getCustomerAction(customerId: string, branchId: string) {
    try {
        await verifyBranchAccess(branchId);
        const customer = await djangoFetch(`customers/customers/${customerId}/?branchId=${branchId}`);

        if (!customer || customer.error) {
            return { success: false, error: customer?.error || 'Customer not found' };
        }

        const formattedCustomer = {
            id: customer.id,
            fullName: customer.name,
            phoneNumber: customer.phone,
            email: customer.email,
            birthday: customer.birthday ? new Date(customer.birthday).toISOString() : null,
            gender: customer.gender,
            location: customer.address,
            categoryId: customer.category,
            notes: customer.notes,
            tags: customer.tags || [],
            socialMedia: customer.social_media || null,
            createdAt: customer.created_at,
            updatedAt: customer.updated_at,
            lifetimeValue: Number(customer.lifetimeValue || 0),
            orderCount: customer.orderCount || 0,
            creditLimit: Number(customer.credit_limit || 0)
        };

        return { success: true, data: formattedCustomer };
    } catch (error: any) {
        console.error('Error fetching customer:', error);
        return { success: false, error: error.message };
    }
}

export async function getCustomerCategoriesAction(branchId: string) {
    try {
        await verifyBranchAccess(branchId);
        const data = await djangoFetch(`customers/categories/?branchId=${branchId}`);
        const results = Array.isArray(data) ? data : (data.results || []);

        const formattedCategories = results.map((c: any) => ({
            id: c.id,
            name: c.name,
            isDefault: c.is_default,
            createdAt: c.created_at,
            updatedAt: c.updated_at
        }));

        return { success: true, data: formattedCategories };
    } catch (error: any) {
        console.error('Error fetching customer categories:', error);
        return { success: false, error: error.message };
    }
}

export async function createCustomerCategoryAction(branchId: string, userId: string, name: string) {
    try {
        await verifyUserAccess(userId);
        await verifyBranchAccess(branchId);
        const newCategory = await djangoFetch('customers/categories/', {
            method: 'POST',
            body: JSON.stringify({
                branch: branchId,
                name: name.trim(),
                is_default: false,
                user: userId
            })
        });
        revalidatePath('/customers');
        return { success: true, data: newCategory };
    } catch (error: any) {
        console.error('Error creating customer category:', error);
        return { success: false, error: error.message };
    }
}

export async function updateCustomerCategoryAction(categoryId: string, branchId: string, name: string) {
    try {
        await verifyBranchAccess(branchId);
        const updatedCategory = await djangoFetch(`customers/categories/${categoryId}/`, {
            method: 'PATCH',
            body: JSON.stringify({ name: name.trim() })
        });
        revalidatePath('/customers');
        return { success: true, data: updatedCategory };
    } catch (error: any) {
        console.error('Error updating customer category:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteCustomerCategoryAction(categoryId: string, branchId: string) {
    try {
        await verifyBranchAccess(branchId);
        await djangoFetch(`customers/categories/${categoryId}/`, { method: 'DELETE' });
        revalidatePath('/customers');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting customer category:', error);
        return { success: false, error: error.message };
    }
}

export async function getCustomerLifetimeStatsAction(branchId: string, customerName: string) {
    try {
        await verifyBranchAccess(branchId);
        const stats = await djangoFetch(`customers/customers/lifetime_stats/?branchId=${branchId}&customerName=${encodeURIComponent(customerName)}`);

        return {
            success: true,
            data: {
                total: Number(stats.total || 0),
                count: stats.count || 0
            }
        };
    } catch (error: any) {
        console.error('Error fetching customer lifetime stats:', error);
        return { success: false, error: error.message };
    }
}

export async function getTopCustomersAction(branchId: string, filters: { startDate?: string, endDate?: string, categoryId?: string }) {
    try {
        await verifyBranchAccess(branchId);
        let url = `customers/customers/top/?branchId=${branchId}`;
        if (filters.startDate) url += `&startDate=${filters.startDate}`;
        if (filters.endDate) url += `&endDate=${filters.endDate}`;
        if (filters.categoryId) url += `&categoryId=${filters.categoryId}`;

        const data = await djangoFetch<any[]>(url);
        return { success: true, data };
    } catch (error: any) {
        console.error('Error fetching top customers:', error);
        return { success: false, error: error.message };
    }
}

export async function getInactiveCustomersAction(branchId: string, filters: { days: number, categoryId?: string }) {
    try {
        await verifyBranchAccess(branchId);
        let url = `customers/customers/inactive/?branchId=${branchId}&days=${filters.days}`;
        if (filters.categoryId && filters.categoryId !== 'all') url += `&categoryId=${filters.categoryId}`;

        const data = await djangoFetch<any[]>(url);
        
        const mapped = (data || []).map((c: any) => ({
            id: c.id,
            fullName: c.name,
            phoneNumber: c.phone,
            email: c.email,
            location: c.address,
            categoryId: c.category,
            tags: c.tags || [],
            lastPurchaseDate: c.lastPurchaseDate
        }));

        return { success: true, data: mapped };
    } catch (error: any) {
        console.error('Error fetching inactive customers:', error);
        return { success: false, error: error.message };
    }
}

export async function createLedgerEntryAction(data: {
    customer: string;
    branch: string;
    agency?: string;
    user?: string;
    amount: number;
    type: 'CHARGE' | 'PAYMENT' | 'ADJUSTMENT';
    description: string;
    date?: string;
}) {
    try {
        await verifyBranchAccess(data.branch);
        const result = await djangoFetch('customers/ledger/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        revalidatePath('/customers');
        return { success: true, data: result };
    } catch (error: any) {
        console.error('Error creating ledger entry:', error);
        return { success: false, error: error.message };
    }
}

export async function getCustomerLedgerAction(branchId: string, customerId: string) {
    try {
        await verifyBranchAccess(branchId);
        const data = await djangoFetch<any[]>(`customers/ledger/?branchId=${branchId}&customerId=${customerId}`);
        return { success: true, data };
    } catch (error: any) {
        console.error('Error fetching customer ledger:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteLedgerEntryAction(id: string, branchId: string) {
    try {
        await verifyBranchAccess(branchId);
        await djangoFetch(`customers/ledger/${id}/`, { method: 'DELETE' });
        revalidatePath('/customers');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting ledger entry:', error);
        return { success: false, error: error.message };
    }
}

export async function getDuplicateCustomersAction(branchId: string) {
    try {
        await verifyBranchAccess(branchId);
        const data = await djangoFetch<any[][]>(`customers/customers/duplicates/?branchId=${branchId}`);
        
        // Map backend groups to frontend Customer structure
        const mappedGroups = (data || []).map(group => 
            group.map(c => ({
                id: c.id,
                fullName: c.name,
                phoneNumber: c.phone || null,
                email: c.email || null,
                birthday: c.birthday ? new Date(c.birthday) : null,
                gender: c.gender || null,
                location: c.address || null,
                categoryId: c.category || null,
                notes: c.notes || null,
                tags: c.tags || [],
                branchId: c.branch || '',
                socialMedia: c.social_media || null,
                createdAt: new Date(c.created_at),
                updatedAt: new Date(c.updated_at)
            }))
        );

        return { success: true, data: mappedGroups };
    } catch (error: any) {
        console.error('Error fetching duplicate customers:', error);
        return { success: false, error: error.message };
    }
}
