/* eslint-disable @typescript-eslint/no-explicit-any */
import Dexie, { type EntityTable } from "dexie";
import { Product, Customer, Sale } from "@/types";

export interface SyncMetadata {
  id: string; // branchId
  lastSyncedAt: number;
}

export interface PendingSale {
  id?: number; // Auto-incrementing local ID
  saleData: any;
  branchId: string;
  userId: string;
  createdAt: number;
  status: "pending" | "syncing" | "failed";
  error?: string;
  retryCount: number;
}

export interface DashboardAnalytics {
  id: string; // branchId
  summary: any;
  updatedAt: number;
}

export class GonzaDatabase extends Dexie {
  products!: EntityTable<Product, "id">;
  customers!: EntityTable<Customer, "id">;
  expenses!: EntityTable<any, "id">;
  sales!: EntityTable<any, "id">;
  messages!: EntityTable<any, "id">;
  cashAccounts!: EntityTable<any, "id">;
  cashTransactions!: EntityTable<any, "id">;
  stockHistory!: EntityTable<any, "id">;
  categories!: EntityTable<any, "id">;
  requisitions!: EntityTable<any, "id">;
  pendingSales!: EntityTable<PendingSale, "id">;
  syncMetadata!: EntityTable<SyncMetadata, "id">;
  dashboardAnalytics!: EntityTable<DashboardAnalytics, "id">;

  constructor() {
    super("GonzaDatabase");
    this.version(14).stores({
      products: "id, name, barcode, itemNumber, category, locationId, updatedAt",
      customers: "id, fullName, phoneNumber, categoryId, locationId",
      expenses: "id, date, category, amount, locationId",
      sales: "id, date, customerName, receiptNumber, locationId",
      messages: "id, createdAt, status, type, locationId",
      cashAccounts: "id, name, locationId",
      cashTransactions: "id, date, type, amount, accountId, locationId",
      stockHistory: "id, createdAt, productId, locationId",
      categories: "id, [locationId+type]",
      requisitions: "id, createdAt, requisitionNumber, locationId",
      pendingSales: "++id, branchId, userId, status",
      syncMetadata: "id",
      dashboardAnalytics: "id",
    });
  }
}

export const localDb = new GonzaDatabase();
