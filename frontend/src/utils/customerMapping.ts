/* eslint-disable @typescript-eslint/no-explicit-any */
import { Customer } from "@/hooks/useCustomers";

/**
 * Maps raw database customer objects from Django to the frontend Customer interface.
 * Ensures type safety and consistent naming (e.g., name -> fullName, phone -> phoneNumber).
 */
export const mapDbCustomerToCustomer = (c: any): Customer => {
  return {
    id: c.id,
    fullName: c.fullName || c.name || "",
    phoneNumber: c.phoneNumber || c.phone || null,
    email: c.email || null,
    birthday: c.birthday ? new Date(c.birthday) : null,
    gender: c.gender || null,
    location: c.location || c.address || null,
    categoryId: c.categoryId || c.category || null,
    notes: c.notes || null,
    tags: c.tags || [],
    branchId: c.branchId || c.branch || "",
    socialMedia: c.socialMedia || c.social_media || null,
    createdAt: new Date(c.createdAt || c.created_at),
    updatedAt: new Date(c.updatedAt || c.updated_at),
    lifetimeValue: Number(c.lifetimeValue || c.lifetime_value || 0),
    orderCount: Number(c.orderCount || c.order_count || 0),
    creditLimit: Number(c.creditLimit || c.credit_limit || 0),
  };
};
