/* eslint-disable @typescript-eslint/no-explicit-any */
import { Sale } from "@/types";

/**
 * Helper to guarantee UI receipt fidelity seamlessly.
 * Merges missing transient layout values (amountPaid, amountDue) natively into the finalized 
 * database payload without altering or dropping any of the strictly normalized backend structures (like items).
 */
export function injectFrozenDraftToReceipt(databaseSale: Sale, frozenDraftState: any): Sale {
  // We strictly ONLY overlay the presentation metrics that the database API 
  // fails to capture on the initial POST loop due to the network gap in installment execution.
  return {
    ...databaseSale,
    amountPaid: Number(frozenDraftState.amountPaid || databaseSale.amountPaid || 0),
    amountDue: Number(frozenDraftState.amountDue || databaseSale.amountDue || 0),
  };
}
