import { useProfiles } from '@/contexts/ProfileContext';

/**
 * Hook to handle financial data visibility based on permissions
 */
export const useFinancialVisibility = () => {
    const { hasPermission } = useProfiles();

    const canViewCostPrice = hasPermission('inventory', 'view_cost_price');
    const canViewProfit = hasPermission('inventory', 'view_profit');
    const canViewSellingPrice = hasPermission('inventory', 'view_selling_price');

    // Dashboard-specific permissions
    const canViewTotalSales = hasPermission('dashboard', 'view_total_sales');
    const canViewTotalGrossProfit = hasPermission('dashboard', 'view_gross_profit');
    const canViewTotalExpenses = hasPermission('dashboard', 'view_total_expenses');
    const canViewInventoryValue = hasPermission('dashboard', 'view_inventory_value');
    const canViewSalesTypes = hasPermission('dashboard', 'view_sales_types');
    const canViewAvgPrice = hasPermission('dashboard', 'view_avg_price');
    const canViewTotalAmount = hasPermission('dashboard', 'view_total_amount');

    // Finance and Expenses permissions
    const canManageFinanceAccounts = hasPermission('finance', 'manage_accounts');
    const canViewFinance = hasPermission('finance', 'view');
    const canViewExpenses = hasPermission('expenses', 'view');
    const canCreateExpenses = hasPermission('expenses', 'create');
    const canEditExpenses = hasPermission('expenses', 'edit');
    const canDeleteExpenses = hasPermission('expenses', 'delete');

    /**
     * Format a financial value or return a hidden indicator
     */
    const formatFinancial = (value: number | null | undefined, type: 'cost' | 'selling' | 'profit'): string => {
        const hasAccess =
            (type === 'cost' && canViewCostPrice) ||
            (type === 'selling' && canViewSellingPrice) ||
            (type === 'profit' && canViewProfit);

        if (!hasAccess) {
            return '•••';
        }

        return value?.toLocaleString() || '0';
    };

    return {
        canViewCostPrice,
        canViewProfit,
        canViewSellingPrice,
        canViewTotalSales,
        canViewTotalGrossProfit,
        canViewTotalExpenses,
        canViewInventoryValue,
        canViewSalesTypes,
        canViewAvgPrice,
        canViewTotalAmount,
        canManageFinanceAccounts,
        canViewFinance,
        canViewExpenses,
        canCreateExpenses,
        canEditExpenses,
        canDeleteExpenses,
        formatFinancial,
    };
};
