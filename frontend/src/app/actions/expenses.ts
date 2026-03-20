/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { verifyBranchAccess, verifyUserAccess } from '@/lib/auth-guard';
import { djangoFetch } from '@/lib/django-client';

export async function getExpensesForChartAction(
    branchId: string,
    from?: string,
    to?: string
): Promise<{ date: string; amount: number }[]> {
    await verifyBranchAccess(branchId);
    try {
        let url = `finance/expenses/?branch_id=${branchId}`;
        if (from) url += `&date_from=${from}`;
        if (to) url += `&date_to=${to}`;
        
        const expensesData = await djangoFetch<any>(url);
        const list = Array.isArray(expensesData) ? expensesData : (expensesData.results || []);

        return list.map((e: any) => ({
            date: e.date,
            amount: Number(e.amount),
        }));
    } catch (error) {
        console.error('[getExpensesForChartAction]', error);
        return [];
    }
}

export async function getBusinessBackupDataAction(userId: string, branchId: string) {
    await verifyBranchAccess(branchId);
    await verifyUserAccess(userId);
    try {
        const [
            products, categories, stockHistory, sales, customers, 
            expenses, expenseCategories, tasks, taskCategories, carriageInwards
        ] = await Promise.all([
            djangoFetch(`inventory/products/?branchId=${branchId}`),
            djangoFetch(`inventory/categories/?branchId=${branchId}`),
            djangoFetch(`inventory/history/?locationId=${branchId}`),
            djangoFetch(`sales/sales/?branchId=${branchId}`),
            djangoFetch(`customers/customers/?branchId=${branchId}`),
            djangoFetch(`finance/expenses/?branchId=${branchId}`),
            djangoFetch(`finance/expense-categories/?branchId=${branchId}`),
            djangoFetch(`core/tasks/?locationId=${branchId}`),
            djangoFetch(`core/task-categories/?locationId=${branchId}`),
            djangoFetch(`finance/carriage-inwards/?branchId=${branchId}`),
        ]);

        const formatData = (res: any) => Array.isArray(res) ? res : (res.results || []);

        return {
            success: true,
            data: {
                products: formatData(products),
                product_categories: formatData(categories),
                stock_history: formatData(stockHistory),
                sales: formatData(sales),
                customers: formatData(customers),
                expenses: formatData(expenses),
                expense_categories: formatData(expenseCategories),
                tasks: formatData(tasks),
                task_categories: formatData(taskCategories),
                carriage_inwards: formatData(carriageInwards),
            },
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createSubscriptionPaymentAction(
    purchaseId: string,
    userId: string,
    branchId: string,
    amount: number,
    billingCycle: string
) {
    await verifyBranchAccess(branchId);
    await verifyUserAccess(userId);
    try {
        console.log('[createSubscriptionPaymentAction] Payment record:', { purchaseId, userId, branchId, amount, billingCycle });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getLatestSubscriptionPaymentAction(userId: string) {
    await verifyUserAccess(userId);
    try {
        return { success: true, data: null };
    } catch (error: any) {
        return { success: false, data: null, error: error.message };
    }
}
