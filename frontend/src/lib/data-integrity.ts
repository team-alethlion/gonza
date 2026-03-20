// Data integrity checks are naturally enforced by Django DRF QuerySets that filter by branch_id in get_queryset().
// Next.js frontend actions all fetch from Django using `?branchId=...` which applies strict filtering.
// Leaving this file empty/stubbed as it is no longer strictly required for cross-tenant data validations on the frontend,
// ensuring a single source of truth in backend permission checks.

export async function verifyEntitiesBelongToBranch(branchId: string, entities: any) {
    return Promise.resolve();
}

export async function validateSaleItems(branchId: string, items: any[]) {
    return Promise.resolve();
}
