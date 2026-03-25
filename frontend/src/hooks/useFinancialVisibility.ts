import { useProfiles } from "@/contexts/ProfileContext";
import { useAuth } from "@/components/auth/AuthProvider";

/**
 * Hook to handle financial data visibility based on permissions
 */
export const useFinancialVisibility = () => {
  const { hasPermission } = useProfiles();
  const { user } = useAuth();

  // 🚀 INSTANT ACCESS: If user is Admin or Manager, grant full financial visibility immediately
  // This prevents the "•••" lag during initial dashboard load while profile data is fetching.
  const userRole = user?.role?.toLowerCase() || "user";
  const isPowerUser =
    userRole === "admin" || userRole === "manager" || userRole === "superadmin";

  const canViewCostPrice =
    isPowerUser || hasPermission("inventory", "view_cost_price");
  const canViewProfit =
    isPowerUser || hasPermission("inventory", "view_profit");
  const canViewSellingPrice =
    isPowerUser || hasPermission("inventory", "view_selling_price");

  // Dashboard-specific permissions
  const canViewTotalSales =
    isPowerUser || hasPermission("dashboard", "view_total_sales");
  const canViewTotalGrossProfit =
    isPowerUser || hasPermission("dashboard", "view_gross_profit");
  const canViewTotalExpenses =
    isPowerUser || hasPermission("dashboard", "view_total_expenses");
  const canViewInventoryValue =
    isPowerUser || hasPermission("dashboard", "view_inventory_value");
  const canViewSalesTypes =
    isPowerUser || hasPermission("dashboard", "view_sales_types");
  const canViewAvgPrice =
    isPowerUser || hasPermission("dashboard", "view_avg_price");
  const canViewTotalAmount =
    isPowerUser || hasPermission("dashboard", "view_total_amount");

  // Finance and Expenses permissions
  const canManageFinanceAccounts =
    isPowerUser || hasPermission("finance", "manage_accounts");
  const canViewFinance = isPowerUser || hasPermission("finance", "view");
  const canViewExpenses = isPowerUser || hasPermission("expenses", "view");
  const canCreateExpenses = isPowerUser || hasPermission("expenses", "create");
  const canEditExpenses = isPowerUser || hasPermission("expenses", "edit");
  const canDeleteExpenses = isPowerUser || hasPermission("expenses", "delete");

  /**
   * Format a financial value or return a hidden indicator
   */
  const formatFinancial = (
    value: number | null | undefined,
    type: "cost" | "selling" | "profit",
  ): string => {
    const hasAccess =
      (type === "cost" && canViewCostPrice) ||
      (type === "selling" && canViewSellingPrice) ||
      (type === "profit" && canViewProfit);

    if (!hasAccess) {
      return "";
    }

    return value?.toLocaleString() || "0";
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
