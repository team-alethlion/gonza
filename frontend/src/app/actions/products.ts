/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from 'next/cache';
import { verifyBranchAccess, verifyUserAccess } from '@/lib/auth-guard';
import { djangoFetch } from '@/lib/django-client';
import { Product } from '@/types';

interface DjangoProduct {
  id: string;
  name: string;
  description: string | null;
  branch_id: string;
  category_id: string | null;
  category_name?: string | null;
  category?: string | null;
  supplier_id: string | null;
  supplier_name?: string | null;
  supplier?: string | null;
  sku: string | null;
  barcode: string | null;
  manufacturer_barcode: string | null;
  image: string | null;
  cost_price: string | number;
  selling_price: string | number;
  stock: string | number;
  min_stock: string | number;
  created_at: string;
  updated_at: string;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export async function getProductsAction({
  userId,
  businessId,
  page,
  pageSize,
  search,
  category,
  stockStatus,
}: {
  userId: string;
  businessId: string;
  page: number;
  pageSize: number;
  search?: string;
  category?: string;
  stockStatus?: 'inStock' | 'outOfStock' | 'lowStock' | 'all';
}) {
  try {
    await verifyBranchAccess(businessId);
    await verifyUserAccess(userId);

    // Ensure numeric values to prevent NaN
    const p = Math.max(1, Number(page) || 1);
    // 🛡️ SAFETY CAP: Never allow more than 500 products in one single network call
    const ps = Math.min(Math.max(1, Number(pageSize) || 50), 500);
    const offset = (p - 1) * ps;

    // Use backend filtering and pagination
    let url = `inventory/products/?branch_id=${businessId}&limit=${ps}&offset=${offset}`;
    
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (category && category !== 'all') url += `&category_name=${encodeURIComponent(category)}`;
    if (stockStatus && stockStatus !== 'all') url += `&stock_status=${stockStatus}`;

    const data = await djangoFetch<any>(url);
    
    let productsList = [];
    let totalCount = 0;

    if (data && data.results !== undefined) {
      productsList = data.results;
      totalCount = data.count;
    } else if (Array.isArray(data)) {
      productsList = data;
      totalCount = data.length;
    }

    const formattedProducts: Product[] = productsList.map((p: DjangoProduct) => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      category: p.category_name || p.category || 'Uncategorized',
      categoryId: p.category_id,
      categoryName: p.category_name || p.category || 'Uncategorized',
      quantity: Number(p.stock),
      costPrice: Number(p.cost_price),
      sellingPrice: Number(p.selling_price),
      supplier: p.supplier_name || p.supplier || null,
      imageUrl: p.image,
      barcode: p.barcode,
      manufacturerBarcode: p.manufacturer_barcode || null,
      itemNumber: p.sku || '',
      minimumStock: Number(p.min_stock),
      createdAt: new Date(p.created_at),
      updatedAt: new Date(p.updated_at),
    }));

    return { products: formattedProducts, count: totalCount };
  } catch (error) {
    console.error('Error fetching products via API:', error);
    return { products: [], count: 0 };
  }
}

export async function getProductAction(id: string, branchId: string) {
  try {
    await verifyBranchAccess(branchId);
    const p = await djangoFetch<DjangoProduct>(`inventory/products/${id}/?branch_id=${branchId}`);
    
    if (!p || !p.id) return null;

    return {
      id: p.id,
      name: p.name,
      description: p.description || '',
      category: p.category_name || p.category || 'Uncategorized',
      categoryId: p.category_id,
      categoryName: p.category_name || p.category || 'Uncategorized',
      quantity: Number(p.stock),
      costPrice: Number(p.cost_price),
      sellingPrice: Number(p.selling_price),
      supplier: p.supplier_name || p.supplier || null,
      imageUrl: p.image,
      barcode: p.barcode,
      manufacturerBarcode: p.manufacturer_barcode || null,
      itemNumber: p.sku || '',
      minimumStock: Number(p.min_stock),
      createdAt: new Date(p.created_at),
      updatedAt: new Date(p.updated_at),
    } as Product;
  } catch (error) {
    console.error(`Error fetching product ${id}:`, error);
    return null;
  }
}

export async function getAllProductsAction(userId: string, businessId: string) {
  try {
    await verifyBranchAccess(businessId);
    await verifyUserAccess(userId);

    const rawProducts = await djangoFetch<DjangoProduct[] | PaginatedResponse<DjangoProduct>>(`inventory/products/?branch_id=${businessId}`);
    const productsList = Array.isArray(rawProducts) ? rawProducts : (rawProducts.results || []);

    return productsList.map((p: DjangoProduct) => ({
      ...p,
      quantity: Number(p.stock),
      costPrice: Number(p.cost_price),
      sellingPrice: Number(p.selling_price),
      minimumStock: Number(p.min_stock),
      createdAt: new Date(p.created_at),
      updatedAt: new Date(p.updated_at),
    }));
  } catch { return []; }
}

export async function getProductsByIdsAction(ids: string[], businessId: string) {
  try {
    await verifyBranchAccess(businessId);
    const rawProducts = await djangoFetch<DjangoProduct[] | PaginatedResponse<DjangoProduct>>(`inventory/products/?branch_id=${businessId}`);
    const productsList = Array.isArray(rawProducts) ? rawProducts : (rawProducts.results || []);
    
    return productsList.filter((p: DjangoProduct) => ids.includes(p.id)).map((p: DjangoProduct) => ({
      ...p,
      quantity: Number(p.stock),
      costPrice: Number(p.cost_price),
      sellingPrice: Number(p.selling_price),
      minimumStock: Number(p.min_stock),
      createdAt: new Date(p.created_at),
      updatedAt: new Date(p.updated_at),
    }));
  } catch { return []; }
}

export async function getProductsDeltaAction(businessId: string, since?: number) {
  try {
    await verifyBranchAccess(businessId);
    const rawProducts = await djangoFetch<DjangoProduct[] | PaginatedResponse<DjangoProduct>>(`inventory/products/?branch_id=${businessId}`);
    let productsList = Array.isArray(rawProducts) ? rawProducts : (rawProducts.results || []);

    if (since) {
      productsList = productsList.filter((p: DjangoProduct) => new Date(p.updated_at).getTime() > since);
    }

    return { success: true, products: productsList.map((p: DjangoProduct) => ({
      ...p,
      itemNumber: p.sku,
      manufacturerBarcode: p.manufacturer_barcode,
      imageUrl: p.image,
      category: p.category_name || p.category || 'Uncategorized',
      supplier: p.supplier_name || p.supplier || null,
      quantity: Number(p.stock),
      costPrice: Number(p.cost_price),
      sellingPrice: Number(p.selling_price),
      minimumStock: Number(p.min_stock),
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })) };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : String(error) }; }
}

export async function createProductAction(data: {
  businessId: string;
  agencyId: string;
  userId: string;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  supplierId?: string | null;
  barcode?: string | null;
  imageUrl?: string | null;
  costPrice?: number | null;
  sellingPrice?: number | null;
  quantity?: number | null;
  minimumStock?: number | null;
}) {
  try {
    await verifyBranchAccess(data.businessId);
    await verifyUserAccess(data.userId);

    const payload = {
      name: data.name,
      description: data.description,
      agency: data.agencyId,
      branch: data.businessId,
      user: data.userId,
      category: data.categoryId || null,
      supplier: data.supplierId || null,
      // Include _id versions for backend ViewSet logic
      branch_id: data.businessId,
      user_id: data.userId,
      barcode: data.barcode,
      image: data.imageUrl,
      cost_price: data.costPrice || 0,
      selling_price: data.sellingPrice || 0,
      stock: data.quantity || 0,
      min_stock: data.minimumStock || 0,
    };

    const result = await djangoFetch<DjangoProduct>('inventory/products/', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    return {
      ...result,
      itemNumber: result.sku,
      manufacturerBarcode: result.manufacturer_barcode,
      imageUrl: result.image,
      quantity: Number(result.stock),
      costPrice: Number(result.cost_price),
      sellingPrice: Number(result.selling_price),
      minimumStock: Number(result.min_stock),
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    };
  } catch { return null; }
}
export async function updateProductAction(id: string, branchId: string, updates: {
  userId: string;
  name?: string;
  description?: string | null;
  categoryId?: string | null;
  supplierId?: string | null;
  itemNumber?: string | null;
  sku?: string | null;
  barcode?: string | null;
  imageUrl?: string | null;
  costPrice?: number | null;
  sellingPrice?: number | null;
  quantity?: number | null;
  minimumStock?: number | null;
  customChangeReason?: string;
  isFromSale?: boolean;
  referenceId?: string;
}) {
  try {
    await verifyBranchAccess(branchId);
    await verifyUserAccess(updates.userId);

    const payload = {
      name: updates.name,
      description: updates.description,
      category: updates.categoryId !== undefined ? updates.categoryId : undefined,
      supplier: updates.supplierId !== undefined ? updates.supplierId : undefined,
      sku: updates.itemNumber || updates.sku,
      barcode: updates.barcode,
      image: updates.imageUrl,
      cost_price: updates.costPrice,
      selling_price: updates.sellingPrice,
      stock: updates.quantity,
      min_stock: updates.minimumStock,
      customChangeReason: updates.customChangeReason,
      isFromSale: updates.isFromSale,
      referenceId: updates.referenceId,
      user: updates.userId,
      user_id: updates.userId
    };

    const result = await djangoFetch<DjangoProduct>(`inventory/products/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });

    return {
      ...result,
      quantity: Number(result.stock),
      costPrice: Number(result.cost_price),
      sellingPrice: Number(result.selling_price),
      minimumStock: Number(result.min_stock),
      createdAt: new Date(result.created_at), updatedAt: new Date(result.updated_at),
    };
  } catch { return null; }
}

export async function deleteProductAction(id: string, branchId: string) {
  try {
    await verifyBranchAccess(branchId);
    await djangoFetch(`inventory/products/${id}/`, { method: 'DELETE' });
    return true;
  } catch { return false; }
}

export async function updateProductsBulkAction(
  updates: Array<{ id: string; updated: Partial<Product> & { quantity?: number; costPrice?: number; sellingPrice?: number; minimumStock?: number; categoryId?: string | null; supplierId?: string | null; sku?: string | null } }>,
  businessId: string
) {
  try {
    await verifyBranchAccess(businessId);

    // Doing it iteratively since bulk update requires specialized DRF view (e.g., django-rest-framework-bulk)
    for (const u of updates) {
      await djangoFetch(`inventory/products/${u.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: u.updated.name,
          description: u.updated.description,
          category_id: u.updated.categoryId,
          supplier_id: u.updated.supplierId,
          sku: u.updated.sku || u.updated.itemNumber,
          barcode: u.updated.barcode,
          cost_price: u.updated.costPrice,
          selling_price: u.updated.sellingPrice,
          stock: u.updated.quantity,
          min_stock: u.updated.minimumStock
        })
      });
    }

    return true;
  } catch { return false; }
}

export async function getProductCategoriesAction(locationId: string) {
  try {
    await verifyBranchAccess(locationId);
    const data = await djangoFetch<{ id: string; name: string; created_at: string }[] | PaginatedResponse<{ id: string; name: string; created_at: string }>>(`inventory/categories/?branch_id=${locationId}`);
    const results = Array.isArray(data) ? data : (data.results || []);
    return { success: true, data: results.map((c: { id: string; name: string; created_at: string }) => ({ ...c, created_at: c.created_at })) };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : String(error) }; }
}

export async function createProductCategoryAction(locationId: string, userId: string, name: string) {
  try {
    await verifyBranchAccess(locationId);
    await verifyUserAccess(userId);
    const result = await djangoFetch(`inventory/categories/`, {
      method: 'POST',
      body: JSON.stringify({ branch_id: locationId, user_id: userId, name })
    });
    revalidatePath('/inventory');
    return { success: true, data: result };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : String(error) }; }
}

export async function updateProductCategoryAction(id: string, branchId: string, name: string) {
  try {
    await verifyBranchAccess(branchId);
    const result = await djangoFetch(`inventory/categories/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ name })
    });
    revalidatePath('/inventory');
    return { success: true, data: result };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : String(error) }; }
}

export async function deleteProductCategoryAction(id: string, branchId: string) {
  try {
    await verifyBranchAccess(branchId);
    await djangoFetch(`inventory/categories/${id}/`, { method: 'DELETE' });
    revalidatePath('/inventory');
    return { success: true };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : String(error) }; }
}

export async function getProductStatsAction(businessId: string) {
  try {
    if (!businessId) return { costValue: 0, lowStock: 0, outOfStock: 0, stockValue: 0 };
    await verifyBranchAccess(businessId);
    
    // Call custom endpoint on ProductViewSet
    const data = await djangoFetch<{ costValue: number; stockValue: number; outOfStock: number; lowStock: number }>(`inventory/products/stats/?branchId=${businessId}`);
    return {
      costValue: Number(data.costValue),
      stockValue: Number(data.stockValue),
      outOfStock: Number(data.outOfStock),
      lowStock: Number(data.lowStock)
    };
  } catch { return { costValue: 0, lowStock: 0, outOfStock: 0, stockValue: 0 }; }
}

export async function lookupProductByBarcodeAction(code: string, branchId: string) {
  try {
    if (!code || !branchId) return null;
    await verifyBranchAccess(branchId);
    
    // Custom lookup endpoint
    const result = await djangoFetch<DjangoProduct & { error?: string }>(`inventory/products/lookup/?code=${code}&branchId=${branchId}`);
    if (result && !result.error && result.id) {
      return {
        ...result,
        itemNumber: result.sku,
        manufacturerBarcode: result.manufacturer_barcode,
        imageUrl: result.image,
        quantity: Number(result.stock),
        costPrice: Number(result.cost_price),
        sellingPrice: Number(result.selling_price),
        minimumStock: Number(result.min_stock),
        createdAt: result.created_at,
        updatedAt: result.updated_at,
      };
    }
    return null;
  } catch { return null; }
}

export async function updateSaleCashTransactionAction(saleId: string, cashTransactionId: string) {
  try {
    // Moved to sales module.
    await djangoFetch(`sales/sales/${saleId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ cash_transaction_id: cashTransactionId })
    });
    return { success: true };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : String(error) }; }
}

export async function getFilteredProductsForExportAction(
  branchId: string,
  filters?: { search?: string; category?: string; stockStatus?: string }
) {
  try {
    if (!branchId) return [];
    await verifyBranchAccess(branchId);

    // Using getProductsAction's logic simplified
    const rawProducts = await djangoFetch<DjangoProduct[] | PaginatedResponse<DjangoProduct>>(`inventory/products/?branch_id=${branchId}`);
    let productsList = Array.isArray(rawProducts) ? rawProducts : (rawProducts.results || []);

    if (filters?.search) {
      const s = filters.search.toLowerCase();
      productsList = productsList.filter((p: DjangoProduct) => 
        p.name?.toLowerCase().includes(s) || 
        p.sku?.toLowerCase().includes(s) || 
        p.description?.toLowerCase().includes(s)
      );
    }

    if (filters?.stockStatus === 'outOfStock') {
      productsList = productsList.filter((p: DjangoProduct) => Number(p.stock) === 0);
    } else if (filters?.stockStatus === 'inStock') {
      productsList = productsList.filter((p: DjangoProduct) => Number(p.stock) > 0);
    }

    return productsList.map((p: DjangoProduct) => ({
      ...p,
      costPrice: Number(p.cost_price),
      sellingPrice: Number(p.selling_price),
      stock: Number(p.stock),
      minStock: Number(p.min_stock),
      createdAt: new Date(p.created_at),
      updatedAt: new Date(p.updated_at)
    }));
  } catch { return []; }
}

export async function bulkUploadProductsAction(formData: FormData) {
  try {
    const branchId = formData.get('branch_id') as string;
    await verifyBranchAccess(branchId);

    const result = await djangoFetch('inventory/products/bulk_upload/', {
      method: 'POST',
      body: formData,
      // djangoFetch handles headers but we might need to ensure Content-Type is multipart/form-data
      // Fetch usually sets it automatically with the correct boundary when body is FormData.
    });

    revalidatePath('/inventory');
    return { success: true, data: result };
  } catch (error) {
    console.error('Error during bulk upload:', error);
    return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred during bulk upload' };
  }
}
