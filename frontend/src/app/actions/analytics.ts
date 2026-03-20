/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { djangoFetch } from '@/lib/django-client';
import { mapDbSaleToSale } from '@/types';

export interface InventoryStats {
    totalCostValue: number;
    totalStockValue: number;
    lowStockCount: number;
    outOfStockCount: number;
}

export async function getGlobalInventoryStatsAction(businessId: string) {
    try {
        const result = await djangoFetch(`core/analytics/inventory_stats/?branchId=${businessId}`);
        if (result && result.error) throw new Error(result.error);

        return {
            success: true,
            data: {
                totalCostValue: Number(result.totalCostValue || 0),
                totalStockValue: Number(result.totalStockValue || 0),
                outOfStockCount: Number(result.outOfStockCount || 0),
                lowStockCount: Number(result.lowStockCount || 0)
            }
        };
    } catch (error: any) {
        console.error('Error fetching global inventory stats:', error);
        return { success: false, error: error.message };
    }
}

export async function getAnalyticsSummaryAction(branchId: string, startDate?: string, endDate?: string) {
    try {
        let qs = `branchId=${branchId}`;
        if (startDate) qs += `&startDate=${startDate}`;
        if (endDate) qs += `&endDate=${endDate}`;

        const result = await djangoFetch(`core/analytics/summary/?${qs}`);
        if (result && result.error) throw new Error(result.error);

        return {
            success: true,
            data: {
                totalSales: Number(result.totalSales || 0),
                totalCost: Number(result.totalCost || 0),
                totalProfit: Number(result.totalProfit || 0),
                paidSalesCount: Number(result.paidSalesCount || 0),
                pendingSalesCount: Number(result.pendingSalesCount || 0),
                totalExpenses: Number(result.totalExpenses || 0),
                recentSales: (result.recentSales || []).map((s: any) => mapDbSaleToSale(s))
            }
        };
    } catch (error: any) {
        console.error('Error fetching analytics summary:', error);
        return { success: false, error: error.message };
    }
}
