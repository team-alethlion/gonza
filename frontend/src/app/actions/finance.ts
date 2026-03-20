/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from 'next/cache';
import { verifyBranchAccess, verifyUserAccess } from '@/lib/auth-guard';
import { djangoFetch } from '@/lib/django-client';

const toSafeNumber = (val: any): number => {
    if (val === null || val === undefined) return 0;
    const num = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(num)) return 0;
    return Math.round(num * 100) / 100;
};

export interface ExpenseInput {
    amount: number;
    description: string;
    category?: string;
    date: Date;
    paymentMethod?: string;
    personInCharge?: string;
    receiptImage?: string;
    cashAccountId?: string;
    userId: string;
    locationId: string;
}

export async function createExpenseAction(data: ExpenseInput, linkToCash: boolean) {
    try {
        await verifyBranchAccess(data.locationId);
        
        const payload = {
            userId: data.userId,
            branchId: data.locationId,
            amount: data.amount,
            description: data.description,
            category: data.category,
            date: data.date,
            paymentMethod: data.paymentMethod,
            personInCharge: data.personInCharge,
            receiptImage: data.receiptImage,
            cashAccountId: data.cashAccountId,
            linkToCash: linkToCash
        };

        const result = await djangoFetch('finance/expenses/', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        revalidatePath('/finance');
        return { success: true, data: { ...result, amount: toSafeNumber(result.amount) } };
    } catch (error: any) {
        console.error('Error creating expense:', error);
        return { success: false, error: error.message };
    }
}

export async function getExpensesAction(locationId: string, page: number = 1, pageSize: number = 50, filters?: any) {
    try {
        await verifyBranchAccess(locationId);
        const offset = (page - 1) * pageSize;
        let url = `finance/expenses/?branch_id=${locationId}&limit=${pageSize}&offset=${offset}`;
        
        if (filters) {
            if (filters.category) url += `&category=${filters.category}`;
            if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`;
            if (filters.dateFrom) url += `&date_from=${filters.dateFrom}`;
            if (filters.dateTo) url += `&date_to=${filters.dateTo}`;
        }

        const data = await djangoFetch<any>(url);
        const results = data.results || [];
        const count = data.count || results.length;

        return {
            success: true,
            data: {
                expenses: results.map((e: any) => ({
                    ...e,
                    amount: toSafeNumber(e.amount),
                    created_at: e.created_at,
                    updated_at: e.updated_at,
                    payment_method: e.payment_method,
                    person_in_charge: e.person_in_charge,
                    receipt_image: e.receipt_image,
                    cash_account_id: e.cash_account,
                    cash_transaction_id: e.cash_transaction
                })),
                count
            }
        };
    } catch (error: any) {
        console.error('Error fetching expenses:', error);
        return { success: false, error: error.message };
    }
}

export async function updateExpenseAction(id: string, branchId: string, updates: any) {
    try {
        await verifyBranchAccess(branchId);
        const payload = {
            ...updates,
            linkToCash: !!updates.cashAccountId
        };

        const result = await djangoFetch(`finance/expenses/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });

        revalidatePath('/finance');
        return { success: true, data: result };
    } catch (error: any) {
        console.error('Error updating expense:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteExpenseAction(id: string, branchId: string) {
    try {
        await verifyBranchAccess(branchId);
        await djangoFetch(`finance/expenses/${id}/`, { method: 'DELETE' });
        revalidatePath('/finance');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- INSTALLMENT PAYMENTS ---

export async function getInstallmentPaymentsAction(saleId: string, branchId: string) {
    try {
        await verifyBranchAccess(branchId);
        const data = await djangoFetch(`sales/installments/?saleId=${saleId}&branchId=${branchId}`);
        const results = Array.isArray(data) ? data : (data.results || []);

        return {
            success: true,
            data: results.map((p: any) => ({
                id: p.id,
                saleId: p.sale,
                userId: p.received_by,
                amount: toSafeNumber(p.amount),
                paymentDate: p.payment_date,
                notes: p.notes,
                cashTransactionId: p.cash_transaction,
                createdAt: p.created_at,
                updatedAt: p.updated_at
            }))
        };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function createInstallmentPaymentAction(data: any) {
    try {
        await verifyBranchAccess(data.locationId);
        
        const payload = {
            saleId: data.saleId,
            locationId: data.locationId,
            accountId: data.accountId,
            amount: data.amount,
            notes: data.notes,
            paymentDate: data.paymentDate
        };

        const result = await djangoFetch('sales/installments/', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        revalidatePath('/finance');
        return { success: true, data: { ...result, amount: toSafeNumber(result.amount), paymentDate: result.payment_date } };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function updateInstallmentPaymentAction(id: string, branchId: string, updates: any) {
    try {
        await verifyBranchAccess(branchId);
        const result = await djangoFetch(`sales/installments/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
        revalidatePath('/finance');
        return { success: true, data: { ...result, amount: toSafeNumber(result.amount), paymentDate: result.payment_date } };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function deleteInstallmentPaymentAction(id: string, branchId: string) {
    try {
        await verifyBranchAccess(branchId);
        await djangoFetch(`sales/installments/${id}/`, { method: 'DELETE' });
        revalidatePath('/finance');
        return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function linkInstallmentToCashAction(paymentId: string, branchId: string, accountId: string) {
    try {
        await verifyBranchAccess(branchId);
        const result = await djangoFetch(`sales/installments/${paymentId}/link_cash/`, {
            method: 'POST',
            body: JSON.stringify({ accountId, locationId: branchId })
        });
        revalidatePath('/finance');
        return { success: true, data: result };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function unlinkInstallmentFromCashAction(paymentId: string, branchId: string) {
    try {
        await verifyBranchAccess(branchId);
        await djangoFetch(`sales/installments/${paymentId}/unlink_cash/`, { method: 'POST' });
        revalidatePath('/finance');
        return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
}

// --- EXPENSE CATEGORIES ---

export async function getExpenseCategoriesAction(locationId: string) {
    try {
        await verifyBranchAccess(locationId);
        const data = await djangoFetch(`finance/categories/?branchId=${locationId}`);
        const results = Array.isArray(data) ? data : (data.results || []);
        return { success: true, data: results.map((c: any) => ({ ...c, isDefault: c.is_default, createdAt: c.created_at })) };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function createExpenseCategoryAction(data: any) {
    try {
        await verifyBranchAccess(data.locationId);
        await verifyUserAccess(data.userId);
        const result = await djangoFetch('finance/categories/', {
            method: 'POST',
            body: JSON.stringify({
                user: data.userId,
                branch: data.locationId,
                name: data.name,
                is_default: data.isDefault || false
            })
        });
        revalidatePath('/finance');
        return { success: true, data: result };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function deleteExpenseCategoryAction(id: string, branchId: string) {
    try {
        await verifyBranchAccess(branchId);
        await djangoFetch(`finance/categories/${id}/`, { method: 'DELETE' });
        revalidatePath('/finance');
        return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function createDefaultExpenseCategoriesAction(userId: string, locationId: string, categoryNames: string[]) {
    try {
        await verifyBranchAccess(locationId);
        await verifyUserAccess(userId);
        await djangoFetch('finance/categories/create_defaults/', {
            method: 'POST',
            body: JSON.stringify({ locationId, names: categoryNames, userId })
        });
        revalidatePath('/finance');
        return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
}

// --- CASH ACCOUNTS ---

export async function getCashAccountsAction(locationId: string) {
    try {
        await verifyBranchAccess(locationId);
        const data = await djangoFetch(`finance/accounts/?branchId=${locationId}`);
        const results = Array.isArray(data) ? data : (data.results || []);

        return {
            success: true,
            data: results.map((a: any) => ({
                id: a.id,
                name: a.name,
                description: a.description,
                openingBalance: toSafeNumber(a.initial_balance),
                isDefault: a.is_default,
                createdAt: a.created_at,
                updatedAt: a.updated_at
            }))
        };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function createCashAccountAction(data: any) {
    try {
        await verifyBranchAccess(data.locationId);
        await verifyUserAccess(data.userId);
        const result = await djangoFetch('finance/accounts/', {
            method: 'POST',
            body: JSON.stringify({
                user: data.userId,
                branch: data.locationId,
                name: data.name,
                description: data.description,
                initial_balance: data.openingBalance,
                is_default: data.isDefault || false
            })
        });

        revalidatePath('/finance');
        return { success: true, data: result };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function updateCashAccountAction(id: string, branchId: string, updates: any) {
    try {
        await verifyBranchAccess(branchId);
        const payload: any = {};
        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.description !== undefined) payload.description = updates.description;
        if (updates.openingBalance !== undefined) payload.initial_balance = updates.openingBalance;
        if (updates.isDefault !== undefined) payload.is_default = updates.isDefault;

        const result = await djangoFetch(`finance/accounts/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });

        revalidatePath('/finance');
        return { success: true, data: result };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function deleteCashAccountAction(id: string, locationId: string) {
    try {
        await verifyBranchAccess(locationId);
        const result = await djangoFetch(`finance/accounts/${id}/`, { method: 'DELETE' });
        // Assume backend delete handles success code 204 or conflict with custom message
        if (result && result.error) {
            return {
                success: false,
                hasTransactions: true,
                details: result.error
            };
        }
        revalidatePath('/finance');
        return { success: true, hasTransactions: false };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function deleteCashAccountWithTransactionsAction(id: string, locationId: string, deleteTransactions: boolean) {
    try {
        await verifyBranchAccess(locationId);
        await djangoFetch(`finance/accounts/${id}/delete_with_transactions/?branchId=${locationId}`, {
            method: 'DELETE',
            body: JSON.stringify({ deleteTransactions })
        });
        revalidatePath('/finance');
        return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function getCashAccountBalanceAction(accountId: string, locationId: string) {
    try {
        await verifyBranchAccess(locationId);
        const data = await djangoFetch(`finance/accounts/${accountId}/balance/?branchId=${locationId}`);
        return { success: true, data: toSafeNumber(data.balance) };
    } catch (error: any) { return { success: false, error: error.message }; }
}

// --- CASH TRANSACTIONS ---

export async function getCashTransactionsAction(locationId: string, accountId?: string, page: number = 1, pageSize: number = 50, filters?: any) {
    try {
        await verifyBranchAccess(locationId);
        const offset = (page - 1) * pageSize;
        let url = `finance/transactions/?branch_id=${locationId}&limit=${pageSize}&offset=${offset}`;
        
        if (accountId) url += `&account=${accountId}`;
        if (filters) {
            if (filters.transactionType) url += `&transaction_type=${filters.transactionType}`;
            if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`;
            if (filters.dateFrom) url += `&date_from=${filters.dateFrom}`;
            if (filters.dateTo) url += `&date_to=${filters.dateTo}`;
        }
        
        const data = await djangoFetch<any>(url);
        const results = data.results || [];
        const count = data.count || results.length;

        return {
            success: true,
            data: results.map((t: any) => ({
                ...t,
                amount: toSafeNumber(t.amount),
                created_at: t.created_at,
                updated_at: t.updated_at,
                user_id: t.user,
                account_id: t.account,
                location_id: t.branch,
                transaction_type: t.transaction_type,
                person_in_charge: t.person_in_charge,
                payment_method: t.payment_method,
                receipt_image: t.receipt_image
            })),
            count
        };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function createCashTransactionAction(data: any) {
    try {
        await verifyBranchAccess(data.locationId);
        const result = await djangoFetch('finance/transactions/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        revalidatePath('/finance');
        return { success: true, data: result };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function updateCashTransactionAction(id: string, branchId: string, updates: any) {
    try {
        await verifyBranchAccess(branchId);
        const result = await djangoFetch(`finance/transactions/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
        revalidatePath('/finance');
        return { success: true, data: result };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function findCashTransactionAction(id: string, branchId: string) {
    try {
        await verifyBranchAccess(branchId);
        const data = await djangoFetch(`finance/transactions/${id}/?branchId=${branchId}`);
        return { success: true, data: { accountId: data.account } };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function deleteCashTransactionAction(id: string, locationId: string) {
    try {
        await verifyBranchAccess(locationId);
        await djangoFetch(`finance/transactions/${id}/`, { method: 'DELETE' });
        revalidatePath('/finance');
        return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function getAccountOpeningBalanceAction(accountId: string, locationId: string) {
    try {
        await verifyBranchAccess(locationId);
        const data = await djangoFetch(`finance/accounts/${accountId}/?branchId=${locationId}`);
        return { success: true, data: toSafeNumber(data.initial_balance) };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function getCashAccountSummaryAction(accountId: string, locationId: string, startDate: Date, endDate: Date) {
    try {
        await verifyBranchAccess(locationId);
        const start = startDate.toISOString();
        const end = endDate.toISOString();
        const data = await djangoFetch(`finance/accounts/${accountId}/summary/?branchId=${locationId}&startDate=${start}&endDate=${end}`);
        return { 
            success: true, 
            data: {
                ...data,
                openingBalance: toSafeNumber(data.openingBalance),
                cashIn: toSafeNumber(data.cashIn),
                cashOut: toSafeNumber(data.cashOut),
                transfersIn: toSafeNumber(data.transfersIn),
                transfersOut: toSafeNumber(data.transfersOut),
                closingBalance: toSafeNumber(data.closingBalance)
            } 
        };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function getProfitLossAction(locationId: string, startDate: Date, endDate: Date, taxPercentage: number = 0) {
    try {
        await verifyBranchAccess(locationId);
        const start = startDate.toISOString();
        const end = endDate.toISOString();
        const data = await djangoFetch(`finance/accounts/profit_loss/?branchId=${locationId}&startDate=${start}&endDate=${end}&taxPercentage=${taxPercentage}`);
        return { 
            success: true, 
            data: {
                ...data,
                sales: toSafeNumber(data.sales),
                salesReturns: toSafeNumber(data.salesReturns),
                netSales: toSafeNumber(data.netSales),
                carriageInwards: toSafeNumber(data.carriageInwards),
                totalCostSales: toSafeNumber(data.totalCostSales),
                totalCOGS: toSafeNumber(data.totalCOGS),
                grossProfit: toSafeNumber(data.grossProfit),
                totalExpenses: toSafeNumber(data.totalExpenses),
                netProfitLoss: toSafeNumber(data.netProfitLoss),
                taxAmount: toSafeNumber(data.taxAmount),
                finalProfitAfterTax: toSafeNumber(data.finalProfitAfterTax)
            } 
        };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function createBulkCashTransactionsAction(transactions: any[]) {
    try {
        if (!transactions || transactions.length === 0) return { success: true, data: [] };
        
        // Take branchId from first item
        const branchId = transactions[0].locationId;
        await verifyBranchAccess(branchId);

        const result = await djangoFetch('finance/transactions/', {
            method: 'POST',
            body: JSON.stringify(transactions)
        });
        revalidatePath('/finance');
        return { success: true, data: result };
    } catch (error: any) { return { success: false, error: error.message }; }
}
