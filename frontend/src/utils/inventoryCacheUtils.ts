import { QueryClient } from "@tanstack/react-query";

/**
 * Utility to clear inventory-related caches (both localStorage and React Query)
 * to ensure real-time data accuracy.
 */
export const clearInventoryCaches = (queryClient?: QueryClient) => {
    if (typeof window === 'undefined') return;

    // 1. Clear LocalStorage (Legacy / Manual caches)
    const keys = Object.keys(localStorage);
    const patterns = [
        'allProductsStats_',
        'stockSummary_',
        'soldItems_',
        'dashboardData_',
        'analyticsData_'
    ];

    let clearedCount = 0;
    keys.forEach(key => {
        if (patterns.some(pattern => key.startsWith(pattern))) {
            localStorage.removeItem(key);
            clearedCount++;
        }
    });

    if (clearedCount > 0) {
        console.log(`[Cache] Cleared ${clearedCount} inventory-related localStorage entries.`);
    }

    // 2. Invalidate React Query Keys (Modern State)
    if (queryClient) {
        console.log('[Cache] Invalidating React Query inventory keys...');
        // Invalidate specific keys used in the inventory module
        queryClient.invalidateQueries({ queryKey: ['inventory_global_stats'] });
        queryClient.invalidateQueries({ queryKey: ['stockSummary'] });
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['sales'] });
        queryClient.invalidateQueries({ queryKey: ['all-products-for-scanner'] });
        queryClient.invalidateQueries({ queryKey: ['all-products'] });
    }
};
