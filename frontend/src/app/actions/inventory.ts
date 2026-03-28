/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { verifyBranchAccess, verifyUserAccess } from "@/lib/auth-guard";
import { djangoFetch } from "@/lib/django-client";

export async function getStockHistoryAction(
  locationId: string,
  productId?: string,
) {
  try {
    await verifyBranchAccess(locationId);
    let url = `inventory/producthistory/?locationId=${locationId}`;
    if (productId) url += `&productId=${productId}`;

    const data = await djangoFetch(url);

    // Handle DRF Pagination (results) or direct Array
    const rawList = Array.isArray(data) ? data : data.results || [];

    // Map backend snake_case to frontend camelCase
    const mappedData = rawList.map((entry: any) => ({
      id: entry.id,
      productId: entry.product,
      oldQuantity: Number(entry.old_stock || 0),
      newQuantity: Number(entry.new_stock || 0),
      costPrice: Number(entry.new_cost || 0),
      sellingPrice: Number(entry.new_price || 0),
      changeReason: entry.change_reason || entry.reason || "Manual Adjustment",
      createdAt: entry.created_at,
      referenceId: entry.reference_id,
      receiptNumber: entry.reference_id, // Fallback for historical data
      // 🚀 Use the new ReadOnlyFields from backend as reliable fallback
      product: {
        name: entry.product_name || "",
        costPrice: Number(entry.product_cost || 0),
        sellingPrice: Number(entry.product_price || 0),
        itemNumber: entry.product_sku || "",
      },
    }));

    return { success: true, data: mappedData };
  } catch (error: any) {
    console.error("Error fetching stock history:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteStockHistoryEntriesByReferenceAction(
  referenceId: string,
  locationId: string,
) {
  try {
    await verifyBranchAccess(locationId);
    await djangoFetch(
      `inventory/producthistory/delete_by_reference/?referenceId=${referenceId}&locationId=${locationId}`,
      { method: "DELETE" },
    );
    revalidatePath("/agency/inventory");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateStockHistoryDatesByReferenceAction(
  referenceId: string,
  locationId: string,
  newDate: string,
) {
  try {
    await verifyBranchAccess(locationId);
    await djangoFetch(`inventory/producthistory/update_dates_by_reference/`, {
      method: "PATCH",
      body: JSON.stringify({ referenceId, locationId, newDate }),
    });
    revalidatePath("/agency/inventory");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateStockHistoryDatesAction(
  entryIds: string[],
  newDate: string,
) {
  try {
    await djangoFetch(`inventory/producthistory/update_dates/`, {
      method: "PATCH",
      body: JSON.stringify({ entryIds, newDate }),
    });
    revalidatePath("/agency/inventory");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getActivityByEntityIdsAction(entityIds: string[]) {
  try {
    const ids = entityIds.join(",");
    const data = await djangoFetch(`core/activity/?entityIds=${ids}`);
    const results = Array.isArray(data) ? data : data.results || [];
    return { success: true, data: results };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function bulkAdjustStockAction(
  adjustments: Array<{
    productId?: string;
    sku?: string;
    quantity?: number;
    absoluteQuantity?: number;
    type: string;
    reason: string;
    createdAt?: string;
  }>,
  branchId: string,
  userId: string,
) {
  try {
    await verifyBranchAccess(branchId);
    await verifyUserAccess(userId);

    await djangoFetch("inventory/products/bulk_adjust/", {
      method: "POST",
      body: JSON.stringify({
        branchId,
        userId,
        adjustments,
      }),
    });

    revalidatePath("/agency/inventory");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getStockSummaryReportAction(
  locationId: string,
  startDate: string,
  endDate: string,
) {
  try {
    await verifyBranchAccess(locationId);
    const data = await djangoFetch(
      `inventory/products/summary_report/?locationId=${locationId}&startDate=${startDate}&endDate=${endDate}`,
    );
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getSoldItemsReportAction(
  branchId: string,
  startDate: string,
  endDate: string,
) {
  try {
    await verifyBranchAccess(branchId);
    const data = await djangoFetch(
      `inventory/products/sold_items/?branchId=${branchId}&startDate=${startDate}&endDate=${endDate}`,
    );
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getStockRepairsPreviewAction(businessId: string) {
  try {
    await verifyBranchAccess(businessId);
    return { success: true, data: [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getRequisitionsAction(userId: string, branchId: string) {
  try {
    await verifyUserAccess(userId);
    await verifyBranchAccess(branchId);
    const data = await djangoFetch(
      `inventory/requisitions/?branchId=${branchId}`,
    );

    const results = data.results || (Array.isArray(data) ? data : []);
    const count = data.count || results.length;

    return {
      success: true,
      data: {
        requisitions: results,
        count,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createRequisitionAction(data: any) {
  try {
    await verifyUserAccess(data.userId);
    const branchId = data.locationId || data.branchId;
    await verifyBranchAccess(branchId);

    const result = await djangoFetch(`inventory/requisitions/`, {
      method: "POST",
      body: JSON.stringify({ ...data, branch_id: branchId }),
    });

    revalidatePath("/agency/inventory/requisitions");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateRequisitionAction(
  id: string,
  branchId: string,
  userId: string,
  updates: any,
) {
  try {
    await verifyBranchAccess(branchId);
    await verifyUserAccess(userId);

    const result = await djangoFetch(`inventory/requisitions/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });

    revalidatePath("/agency/inventory/requisitions");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteRequisitionAction(
  id: string,
  branchId: string,
  userId: string,
) {
  try {
    await verifyBranchAccess(branchId);
    await verifyUserAccess(userId);
    await djangoFetch(`inventory/requisitions/${id}/`, { method: "DELETE" });
    revalidatePath("/agency/inventory/requisitions");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateStockHistoryEntryAction(
  id: string,
  branchId: string,
  updates: any,
) {
  try {
    await verifyBranchAccess(branchId);
    const result = await djangoFetch(`inventory/producthistory/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
    revalidatePath("/agency/inventory");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteStockHistoryEntryAction(
  id: string,
  branchId: string,
) {
  try {
    await verifyBranchAccess(branchId);
    await djangoFetch(`inventory/producthistory/${id}/`, { method: "DELETE" });
    revalidatePath("/agency/inventory");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteMultipleStockHistoryEntriesAction(
  ids: string[],
  branchId: string,
) {
  try {
    await verifyBranchAccess(branchId);
    for (const id of ids) {
      await djangoFetch(`inventory/producthistory/${id}/`, {
        method: "DELETE",
      });
    }
    revalidatePath("/agency/inventory");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getNextReceiptNumberAction(locationId: string) {
  try {
    await verifyBranchAccess(locationId);
    const data = await djangoFetch<any>(
      `sales/sales/next_receipt_number/?branchId=${locationId}`,
    );
    return { success: true, data: data.next_number || "000001" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function recordStockAuditAction(data: any) {
  try {
    const branchId = data.branch;
    await verifyBranchAccess(branchId);

    const result = await djangoFetch("inventory/stock-audits/", {
      method: "POST",
      body: JSON.stringify(data),
    });

    revalidatePath("/agency/inventory");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveStockAuditDraftAction(data: any) {
  try {
    const branchId = data.branch;
    await verifyBranchAccess(branchId);

    const result = await djangoFetch("inventory/stock-audits/save_draft/", {
      method: "POST",
      body: JSON.stringify(data),
    });

    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getStockAuditDraftAction(branchId: string) {
  try {
    await verifyBranchAccess(branchId);
    const data = await djangoFetch<any>(
      `inventory/stock-audits/get_draft/?branchId=${branchId}`,
    );
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function recordStockTransferAction(data: any) {
  try {
    const fromBranchId = data.from_branch;
    await verifyBranchAccess(fromBranchId);

    const result = await djangoFetch("inventory/stock-transfers/", {
      method: "POST",
      body: JSON.stringify(data),
    });

    revalidatePath("/agency/inventory");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getStockTransfersAction(branchId: string) {
  try {
    await verifyBranchAccess(branchId);
    const result = await djangoFetch(
      `inventory/stock-transfers/?from_branch=${branchId}`,
    );
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createStockHistoryAction(data: any) {
  try {
    await verifyBranchAccess(data.locationId);

    const result = await djangoFetch("inventory/producthistory/", {
      method: "POST",
      body: JSON.stringify(data),
    });

    revalidatePath("/agency/inventory");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function recalculateStockChainAction(
  productId: string,
  locationId: string,
) {
  try {
    await verifyBranchAccess(locationId);
    // This will be implemented in the backend later
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function repairStockChainsAction(locationId: string) {
  try {
    await verifyBranchAccess(locationId);
    // This will be implemented in the backend later
    return { success: true, data: { repaired: 0, failed: 0 } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
