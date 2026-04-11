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
  const userRoleObj = user?.role as any;
  const userRoleName = (typeof userRoleObj === 'string' ? userRoleObj : userRoleObj?.name || "user").toLowerCase();
  const isPowerUser =
    userRoleName === "admin" || userRoleName === "manager" || userRoleName === "superadmin" || userRoleName === "owner";

  // 🚀 PERMISSION-DRIVEN ACCESS: Prioritize granular flags from the database
  const canViewCostPrice = hasPermission("inventory", "view_cost_price") || isPowerUser;
  const canViewProfit = hasPermission("inventory", "view_profit") || isPowerUser;
  const canViewSellingPrice = hasPermission("inventory", "view_selling_price") || isPowerUser;

  // Dashboard-specific permissions
  const canViewTotalSales = hasPermission("dashboard", "view_total_sales") || isPowerUser;
  const canViewTotalGrossProfit = hasPermission("dashboard", "view_gross_profit") || isPowerUser;
  const canViewTotalExpenses = hasPermission("dashboard", "view_total_expenses") || isPowerUser;
  const canViewInventoryValue = hasPermission("dashboard", "view_inventory_value") || isPowerUser;
  const canViewSalesTypes = hasPermission("dashboard", "view_sales_types") || isPowerUser;
  const canViewAvgPrice = hasPermission("dashboard", "view_avg_price") || isPowerUser;
  const canViewTotalAmount = hasPermission("dashboard", "view_total_amount") || isPowerUser;

  // Finance and Expenses permissions
  const canManageFinanceAccounts = hasPermission("finance", "manage_accounts") || isPowerUser;
  const canViewFinance = hasPermission("finance", "view") || isPowerUser;
  const canViewExpenses = hasPermission("expenses", "view") || isPowerUser;
  const canCreateExpenses = hasPermission("expenses", "create") || isPowerUser;
  const canEditExpenses = hasPermission("expenses", "edit") || isPowerUser;
  const canDeleteExpenses = hasPermission("expenses", "delete") || isPowerUser;

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
