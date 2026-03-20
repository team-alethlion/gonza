import { djangoFetch } from './django-client';

const extractId = (obj: any): string | undefined => {
    if (!obj) return undefined;
    if (typeof obj === 'string') return obj;
    if (typeof obj === 'object' && obj.id) return obj.id;
    return undefined;
};

export async function checkUserQuota(agencyIdParam: string) {
    try {
        const agencyId = extractId(agencyIdParam);
        const agency = await djangoFetch(`core/agencies/${agencyId}/`);
        if (!agency || agency.error || !agency.package) return true;
        
        const pkg = agency.package;
        if (pkg.unlimited_users) return true;

        const users = await djangoFetch(`users/users/?agencyId=${agencyId}`);
        const userCount = Array.isArray(users) ? users.length : (users.count || 0);

        if (userCount >= pkg.max_users) {
            throw new Error(`User limit reached (${pkg.max_users}). Please upgrade your plan to add more team members.`);
        }
        return true;
    } catch {
        return true;
    }
}

export async function checkProductQuota(agencyIdParam: string) {
    try {
        const agencyId = extractId(agencyIdParam);
        const agency = await djangoFetch(`core/agencies/${agencyId}/`);
        if (!agency || agency.error || !agency.package) return true;
        
        const pkg = agency.package;
        if (pkg.unlimited_products) return true;

        const products = await djangoFetch(`inventory/products/?agencyId=${agencyId}`);
        const productCount = Array.isArray(products) ? products.length : (products.count || 0);

        if (productCount >= pkg.max_products) {
            throw new Error(`Product limit reached (${pkg.max_products}). Please upgrade your plan to add more products.`);
        }
        return true;
    } catch {
        return true;
    }
}

export async function checkSalesQuota(agencyIdParam: string) {
    try {
        const agencyId = extractId(agencyIdParam);
        const agency = await djangoFetch(`core/agencies/${agencyId}/`);
        if (!agency || agency.error || !agency.package) return true;
        
        const pkg = agency.package;
        if (pkg.unlimited_sales) return true;

        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const sales = await djangoFetch(`sales/sales/?agencyId=${agencyId}&startDate=${firstDayOfMonth}`);
        const salesCount = Array.isArray(sales) ? sales.length : (sales.count || 0);

        if (salesCount >= pkg.max_sales_per_month) {
            throw new Error(`Monthly sales limit reached (${pkg.max_sales_per_month}). Please upgrade your plan to continue recording sales.`);
        }
        return true;
    } catch {
        return true;
    }
}
