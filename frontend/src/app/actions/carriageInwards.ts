"use server";

import { revalidatePath } from 'next/cache';
import { verifyBranchAccess, verifyUserAccess } from '@/lib/auth-guard';
import { djangoFetch } from '@/lib/django-client';

export async function getCarriageInwardsAction(branchId: string) {
    await verifyBranchAccess(branchId);
    try {
        const records = await djangoFetch(`finance/carriage-inwards/?branchId=${branchId}`);
        const list = Array.isArray(records) ? records : (records.results || []);

        return {
            success: true,
            data: list.map((r: any) => ({
                id: r.id,
                userId: r.user,
                locationId: r.branch,
                supplierName: r.supplier_name,
                details: r.details,
                amount: Number(r.amount),
                date: r.date,
                cashAccountId: r.cash_account,
                cashTransactionId: r.cash_transaction,
                createdAt: r.created_at,
                updatedAt: r.updated_at,
            })),
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createCarriageInwardAction(
    userId: string,
    branchId: string,
    data: { supplierName: string; details: string; amount: number; date: Date; cashAccountId?: string }
) {
    await verifyBranchAccess(branchId);
    await verifyUserAccess(userId);
    try {
        const record = await djangoFetch('finance/carriage-inwards/', {
            method: 'POST',
            body: JSON.stringify({
                user: userId,
                branch: branchId,
                supplier_name: data.supplierName,
                details: data.details,
                amount: data.amount,
                date: data.date.toISOString(),
                cash_account: data.cashAccountId || null,
            }),
        });
        if (record && record.error) throw new Error(record.error);
        
        revalidatePath('/agency/inventory/carriage');
        return { success: true, data: record };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateCarriageInwardAction(
    id: string,
    branchId: string,
    updates: Partial<{ supplierName: string; details: string; amount: number; date: Date }>
) {
    await verifyBranchAccess(branchId);
    try {
        const updateData: any = {};
        if (updates.supplierName !== undefined) updateData.supplier_name = updates.supplierName;
        if (updates.details !== undefined) updateData.details = updates.details;
        if (updates.amount !== undefined) updateData.amount = updates.amount;
        if (updates.date !== undefined) updateData.date = updates.date.toISOString();

        const result = await djangoFetch(`finance/carriage-inwards/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(updateData),
        });
        if (result && result.error) throw new Error(result.error);
        
        revalidatePath('/agency/inventory/carriage');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteCarriageInwardAction(id: string, branchId: string) {
    await verifyBranchAccess(branchId);
    try {
        const result = await djangoFetch(`finance/carriage-inwards/${id}/`, {
            method: 'DELETE',
        });
        if (result && result.error) throw new Error(result.error);
        
        revalidatePath('/agency/inventory/carriage');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
