/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from 'next/cache';
import { verifyBranchAccess, verifyUserAccess } from '@/lib/auth-guard';
import { djangoFetch } from '@/lib/django-client';
import { Sale, DbSale, mapDbSaleToSale } from '@/types';

const toValidNum = (val: unknown) => {
    if (val === null || val === undefined || val === '' || String(val).toLowerCase() === 'none') return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
};

export async function getSalesAction(businessId: string, page: number = 1, pageSize: number = 50, filters?: any) {
    try {
        await verifyBranchAccess(businessId);
        
        // Ensure numeric values to prevent NaN
        const p = Math.max(1, Number(page) || 1);
        const ps = Math.max(1, Number(pageSize) || 50);
        const offset = (p - 1) * ps;
        
        let url = `sales/sales/?branch_id=${businessId}&limit=${ps}&offset=${offset}`;
        
        if (filters) {
            if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`;
            if (filters.status) url += `&status=${filters.status}`;
            if (filters.customerId) url += `&customer_id=${filters.customerId}`;
            if (filters.dateFrom) url += `&date_from=${filters.dateFrom}`;
            if (filters.dateTo) url += `&date_to=${filters.dateTo}`;
            if (filters.ordering) url += `&ordering=${filters.ordering}`;
        } else {
            url += `&ordering=-date`; // Default
        }

        const data = await djangoFetch<any>(url);
        const results = data.results || [];
        const count = data.count || results.length;

        // Return raw database objects to let mapDbSaleToSale handle mapping consistently
        return { success: true, data: { sales: results, count } };
    } catch (error: any) {
        if (error.message?.includes("Session stale")) {
            console.log(`[SalesAction] Request blocked: Session is orphaned (Redirection expected).`);
        } else {
            console.error('Error fetching sales:', error.message || error);
        }
        return { success: false, data: { sales: [], count: 0 }, error: (error as Error).message };
    }
}

export async function deleteSaleAction(id: string, businessId: string, reason?: string) {
    try {
        await verifyBranchAccess(businessId);
        let url = `sales/sales/${id}/`;
        if (reason) {
            url += `?deletedReason=${encodeURIComponent(reason)}`;
        }
        await djangoFetch(url, { method: 'DELETE' });
        revalidatePath('/sales');
        return { success: true };
    } catch (error: unknown) {
        const err = error as Error;
        return { success: false, error: err.message };
    }
}

export async function upsertSaleAction(saleDbData: any, isUpdate: boolean, updateId?: string) {
    try {
        if (!saleDbData.location_id) throw new Error("Location ID is required");
        const sessionUser = await verifyBranchAccess(saleDbData.location_id);
        const userId = sessionUser.id;

        let status = saleDbData.payment_status;
        if (status === 'NOT PAID') status = 'UNPAID';
        else if (status === 'Installment Sale') status = 'INSTALLMENT';
        else if (status === 'Paid') status = 'COMPLETED';
        else if (status === 'Quote') status = 'QUOTE';

        const payload = {
            userId: userId,
            branchId: saleDbData.location_id,
            agencyId: sessionUser.agencyId,
            receipt_number: saleDbData.receipt_number,
            customerName: saleDbData.customer_name,
            customerContact: saleDbData.customer_contact,
            customerAddress: saleDbData.customer_address,
            customerId: saleDbData.customer_id,
            categoryId: saleDbData.category_id,
            items: saleDbData.items,
            paymentStatus: status,
            taxRate: saleDbData.tax_rate,
            amountPaid: saleDbData.amount_paid,
            amountDue: saleDbData.amount_due,
            cashTransactionId: saleDbData.cash_transaction_id,
            notes: saleDbData.notes,
            shippingCost: saleDbData.shipping_cost,
            discountReason: saleDbData.discount_reason,
            paymentReference: saleDbData.payment_reference,
            linkToCash: saleDbData.linkToCash,
            cashAccountId: saleDbData.cashAccountId
        };

        let result;
        if (isUpdate && updateId) {
            result = await djangoFetch(`sales/sales/${updateId}/`, {
                method: 'PATCH',
                body: JSON.stringify(payload)
            });
        } else {
            result = await djangoFetch(`sales/sales/`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        }

        revalidatePath('/sales');
        return { success: true, data: result };
    } catch (error: unknown) {
        const err = error as Error;
        return { success: false, error: err.message };
    }
}

export async function createReceiptAction(saleData: {
    paymentStatus: string;
    receiptNumber: string;
    customerName: string;
    customerContact?: string;
    customerAddress?: string;
    customerId: string;
    items: unknown;
    taxRate: number;
    amountPaid: number;
    amountDue: number;
    cashTransactionId?: string;
    notes: string;
    shippingCost?: number;
    discountReason?: string;
    paymentReference?: string;
}, businessId: string) {
    try {
        const sessionUser = await verifyBranchAccess(businessId);
        const userIdFromSession = sessionUser.id;

        let status = saleData.paymentStatus;
        if (status === 'NOT PAID') status = 'UNPAID';
        else if (status === 'Installment Sale') status = 'INSTALLMENT';
        else if (status === 'Paid') status = 'COMPLETED';
        else if (status === 'Quote') status = 'QUOTE';

        const payload = {
            userId: userIdFromSession,
            branchId: businessId,
            agencyId: sessionUser.agencyId,
            receiptNumber: saleData.receiptNumber,
            customerName: saleData.customerName,
            customerContact: saleData.customerContact,
            customerAddress: saleData.customerAddress,
            customerId: saleData.customerId,
            items: saleData.items,
            paymentStatus: status,
            taxRate: saleData.taxRate,
            amountPaid: saleData.amountPaid,
            amountDue: saleData.amountDue,
            cashTransactionId: saleData.cashTransactionId,
            notes: saleData.notes,
            shippingCost: saleData.shippingCost,
            discountReason: saleData.discountReason,
            paymentReference: saleData.paymentReference,
            linkToCash: (saleData as any).linkToCash,
            cashAccountId: (saleData as any).cashAccountId
        };

        const result = await djangoFetch(`sales/sales/`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        revalidatePath('/sales');
        revalidatePath('/customers');

        return { success: true, data: result };
    } catch (error: unknown) {
        const err = error as Error;
        return { success: false, error: err.message };
    }
}

export async function getSalesCategoriesAction(businessId: string) {
    try {
        await verifyBranchAccess(businessId);
        const data = await djangoFetch(`sales/categories/?branchId=${businessId}`);
        const results = Array.isArray(data) ? data : (data.results || []);
        return { success: true, data: results };
    } catch (error: unknown) {
        const err = error as Error;
        return { success: false, error: err.message };
    }
}

export async function getSaleDraftAction(businessId: string, userId: string): Promise<{ success: boolean; data: Sale | null; error?: string }> {
    try {
        await verifyBranchAccess(businessId);
        const data = await djangoFetch(`sales/sales/draft/?branchId=${businessId}&userId=${userId}`);
        if (data && (data as any).id) {
            const dbSale = data as DbSale;
            return {
                success: true,
                data: mapDbSaleToSale(dbSale)
            };
        }
        return { success: true, data: null };
    } catch (error: unknown) {
        const err = error as Error;
        return { success: false, data: null, error: err.message };
    }
}

export async function createSalesCategoryAction(businessId: string, userId: string, name: string, isDefault: boolean = false) {
    try {
        await verifyBranchAccess(businessId);
        // userId is provided but we can also use session user if preferred. 
        // Keeping it for signature compatibility.
        const result = await djangoFetch(`sales/categories/`, {
            method: 'POST',
            body: JSON.stringify({ branch: businessId, user: userId, name, is_default: isDefault })
        });
        revalidatePath('/sales');
        return { success: true, data: result };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function updateSalesCategoryAction(id: string, name: string) {
    try {
        const result = await djangoFetch(`sales/categories/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify({ name })
        });
        revalidatePath('/sales');
        return { success: true, data: result };
    } catch (error: unknown) {
        const err = error as Error;
        return { success: false, error: err.message };
    }
}

export async function deleteSalesCategoryAction(id: string) {
    try {
        await djangoFetch(`sales/categories/${id}/`, { method: 'DELETE' });
        revalidatePath('/sales');
        return { success: true };
    } catch (error: unknown) {
        const err = error as Error;
        return { success: false, error: err.message };
    }
}

export async function getCustomerByNameAction(branchId: string, name: string) {
    try {
        // Defer to customer module. Assuming we have customers setup in backend.
        const data = await djangoFetch(`customers/customers/?branchId=${branchId}&search=${name}`);
        const results = Array.isArray(data) ? data : (data.results || []);
        return results.length > 0 ? results[0] : null;
    } catch { return null; }
}

export async function updateSaleCustomerAction(saleId: string, customerId: string, branchId: string) {
    try {
        await verifyBranchAccess(branchId);
        await djangoFetch(`sales/sales/${saleId}/`, {
            method: 'PATCH',
            body: JSON.stringify({ customer: customerId })
        });
        revalidatePath('/sales');
        return { success: true };
    } catch (error: unknown) {
        const err = error as Error;
        return { success: false, error: err.message };
    }
}

export async function getSalesGoalAction(
    userId: string, 
    branchId: string, 
    periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY',
    startDate: Date,
    endDate: Date
) {
    try {
        await verifyUserAccess(userId);
        await verifyBranchAccess(branchId);
        
        // Construct a unique period identifier based on type and dates
        let periodId = '';
        const dateStr = startDate.toISOString().split('T')[0];
        
        if (periodType === 'DAILY') {
            periodId = `DAILY-${dateStr}`;
        } else if (periodType === 'WEEKLY') {
            // Get week number or just start date
            periodId = `WEEKLY-${dateStr}`;
        } else {
            periodId = `MONTHLY-${dateStr.substring(0, 7)}`;
        }

        const data = await djangoFetch(`sales/goals/?branchId=${branchId}&period_name=${periodId}`);
        const results = Array.isArray(data) ? data : (data.results || []);
        
        if (results.length > 0) {
            const goal = results[0];
            return {
                success: true,
                data: {
                    ...goal,
                    target: toValidNum(goal.amount_target),
                    current: toValidNum(goal.current_amount),
                    startDate: goal.start_date,
                    endDate: goal.end_date
                }
            };
        }
        return { success: true, data: null };
    } catch (error: unknown) {
        const err = error as Error;
        return { success: false, error: err.message };
    }
}

export async function getSalesGoalProgressAction(
    branchId: string,
    periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY',
    startDate: Date,
    endDate: Date
) {
    try {
        await verifyBranchAccess(branchId);
        
        let periodId = '';
        const dateStr = startDate.toISOString().split('T')[0];
        if (periodType === 'DAILY') {
            periodId = `DAILY-${dateStr}`;
        } else if (periodType === 'WEEKLY') {
            periodId = `WEEKLY-${dateStr}`;
        } else {
            periodId = `MONTHLY-${dateStr.substring(0, 7)}`;
        }

        const data = await djangoFetch(
            `sales/goals/progress/?branchId=${branchId}&period_name=${periodId}&start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`
        );
        
        return { success: true, data };
    } catch (error: unknown) {
        const err = error as Error;
        return { success: false, error: err.message };
    }
}

export async function upsertSalesGoalAction(
    userId: string,
    branchId: string,
    periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY',
    startDate: Date,
    endDate: Date,
    amount: number,
    existingGoalId?: string | null
) {
    try {
        await verifyUserAccess(userId);
        await verifyBranchAccess(branchId);
        
        let periodId = '';
        const dateStr = startDate.toISOString().split('T')[0];
        
        if (periodType === 'DAILY') {
            periodId = `DAILY-${dateStr}`;
        } else if (periodType === 'WEEKLY') {
            periodId = `WEEKLY-${dateStr}`;
        } else {
            periodId = `MONTHLY-${dateStr.substring(0, 7)}`;
        }

        let result;
        if (existingGoalId) {
            result = await djangoFetch(`sales/goals/${existingGoalId}/`, {
                method: 'PATCH',
                body: JSON.stringify({ amount_target: amount })
            });
        } else {
            result = await djangoFetch(`sales/goals/`, {
                method: 'POST',
                body: JSON.stringify({
                    user: userId,
                    branch: branchId,
                    amount_target: amount,
                    period: periodType,
                    period_name: periodId,
                    start_date: startDate.toISOString(),
                    end_date: endDate.toISOString()
                })
            });
        }
        
        revalidatePath('/');
        return { success: true, data: result };
    } catch (error: unknown) {
        const err = error as Error;
        return { success: false, error: err.message };
    }
}

export async function getPeriodSalesAction(branchId: string, startDate: Date, endDate: Date) {
    try {
        await verifyBranchAccess(branchId);
        const data = await djangoFetch(`sales/sales/period_aggregate/?branchId=${branchId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
        return { success: true, data: toValidNum((data as { total: unknown }).total) };
    } catch (error: unknown) {
        const err = error as Error;
        return { success: false, error: err.message };
    }
}

export async function getTopCustomersAction(branchId: string) {
    try {
        await verifyBranchAccess(branchId);
        const data = await djangoFetch(`sales/sales/top_customers/?branchId=${branchId}`);
        return { success: true, data: Array.isArray(data) ? data : [] };
    } catch (error: unknown) {
        const err = error as Error;
        return { success: false, error: err.message };
    }
}

export async function getSalesCategorySummaryAction(branchId: string, startDate?: string, endDate?: string) {
    try {
        await verifyBranchAccess(branchId);
        
        let queryParams = `branchId=${branchId}`;
        if (startDate) queryParams += `&startDate=${startDate}`;
        if (endDate) queryParams += `&endDate=${endDate}`;

        const data = await djangoFetch(`sales/sales/category_summary/?${queryParams}`);
        return { success: true, data: Array.isArray(data) ? data : [] };
    } catch (error: any) {
        console.error('Error in getSalesCategorySummaryAction:', error);
        return { success: false, error: error.message, data: [] };
    }
}

export async function getPerformanceChartAction(
    branchId: string,
    timeframe: 'daily' | 'weekly' | 'monthly',
    year?: string,
    startDate?: string,
    endDate?: string
) {
    try {
        await verifyBranchAccess(branchId);
        
        let url = `sales/sales/performance_chart/?branchId=${branchId}&timeframe=${timeframe}`;
        if (year) url += `&year=${year}`;
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;

        const data = await djangoFetch<any>(url);
        return Array.isArray(data) ? data : [];
    } catch (error: any) {
        console.error('Error in getPerformanceChartAction:', error);
        return [];
    }
}

export async function bulkSyncSalesAction(sales: { localId: string, saleData: any, branchId: string, userId: string }[]) {
    if (sales.length === 0) return { success: true, processed: [], errors: [] };
    
    try {
        await verifyBranchAccess(sales[0].branchId);
        
        // 🔍 SERVER LOGGING: Identify sync request source
        console.log(`[ServerAction] 📥 Received Bulk Sales Sync Request: Count=${sales.length} Branch=${sales[0].branchId}`);
        
        const payload = sales.map(s => ({
            ...s.saleData,
            localId: s.localId,
            branchId: s.branchId,
            userId: s.userId
        }));
        
        const result = await djangoFetch<any>('sales/sales/bulk_sync/', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        revalidatePath('/sales');
        return { success: true, ...result };
    } catch (error: any) {
        console.error('Error in bulkSyncSalesAction:', error);
        return { success: false, error: error.message };
    }
}
