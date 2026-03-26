/* eslint-disable @typescript-eslint/no-explicit-any */
// Sale item type definition
export interface SaleItem {
  description: string;
  quantity: number;
  price: number;
  cost: number;
  productId?: string;
  discountPercentage?: number;
  discountType?: 'percentage' | 'amount';
  discountAmount?: number;
}

export interface SalesCategory {
  id: string;
  user_id: string;
  location_id?: string;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  receiptNumber: string;
  customerName: string;
  customerAddress?: string;
  customerContact?: string;
  customerId?: string;
  items: SaleItem[];
  paymentStatus: 'Paid' | 'NOT PAID' | 'Quote' | 'Installment Sale';
  profit: number;
  total: number;
  totalCost: number;
  subtotal: number;
  discount: number;
  taxAmount: number;
  totalQuantity?: number;
  itemDescription?: string;
  date: Date;
  taxRate?: number;
  cashTransactionId?: string;
  amountPaid?: number;
  amountDue?: number;
  notes?: string;
  categoryId?: string;
  installments?: Array<{
    date?: string | Date;
    amountPaid?: number;
  }>;
  payments?: any[]; // For pre-fetched installment history
  createdAt: Date;
  updatedAt: Date;
}

// Supabase database schema and Json type
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Supabase database sale structure
export interface DbSale {
  id: string;
  user_id: string;
  location_id: string;
  receipt_number: string;
  customer_name: string;
  customer_address?: string | null;
  customer_contact?: string | null;
  customer_id?: string | null;
  items: Json;
  payment_status: string;
  profit: number;
  total: number;
  total_cost: number;
  subtotal: number;
  discount: number;
  discount_amount?: number;
  tax_amount: number;
  date: string;
  tax_rate?: number | null;
  created_at: string;
  updated_at: string;
  cash_transaction_id?: string | null;
  amount_paid?: number | null;
  amount_due?: number | null;
  balance_due?: number | null;
  total_amount?: number;
  notes?: string | null;
  category_id?: string | null;
  shipping_cost?: number;
  discount_reason?: string | null;
  payment_reference?: string | null;
}

// Expense interface - add cashTransactionId field
export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string | null;
  date: Date;
  paymentMethod: string | null;
  personInCharge: string | null;
  receiptImage: string | null;
  cashAccountId: string | null;
  cashTransactionId: string | null; // Add this field
  createdAt: Date;
  updatedAt: Date;
}

// Supabase database expense structure
export interface DbExpense {
  id: string;
  user_id: string;
  amount: number;
  description: string;
  category: string | null;
  date: string;
  payment_method: string | null;
  person_in_charge: string | null;
  receipt_image: string | null;
  cash_account_id: string | null;
  cash_transaction_id: string | null; // Add this field
  created_at: string;
  updated_at: string;
}

export interface SaleFormData {
  customerName: string;
  customerAddress: string;
  customerContact: string;
  customerId?: string; // Added customerId field
  items: SaleItem[];
  paymentStatus: "Paid" | "NOT PAID" | "Quote" | "Installment Sale";
  receiptNumber?: string;
  taxRate?: number | null;
  amountPaid?: number;
  amountDue?: number;
  notes?: string;
  categoryId?: string;
  shippingCost?: number;
  discountReason?: string;
  paymentReference?: string;
}

export interface AnalyticsData {
  totalSales: number;
  totalProfit: number;
  totalCost: number;
  paidSalesCount: number;
  pendingSalesCount: number;
  totalExpenses?: number;
  recentSales?: Sale[];
}

// Form validation errors
export interface FormErrors {
  customerName?: string;
  customerAddress?: string;
  customerContact?: string;
  itemDescription?: string;
  quantity?: string;
  salePrice?: string;
  costOfProduction?: string;
  taxRate?: string;
}

// BusinessSettings interface to include paymentInfo
export interface BusinessSettings {
  id?: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  businessLogo?: string;
  currency: string;
  signature?: string;
  paymentInfo?: string; // Added payment information field
  defaultPrintFormat?: 'standard' | 'thermal'; // Added default print format
  defaultPrinterName?: string; // Added default printer name
  defaultPrinterType?: 'USB' | 'Bluetooth'; // Added default printer type
  printerPaperSize?: '58mm' | '80mm'; // Added printer paper size
}

// Database business settings structure
export interface DbBusinessSettings {
  id?: string;
  user_id: string; // Make sure this is required, not optional
  business_name: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
  currency: string;
  signature_image?: string;
  metadata?: Json | null; // Add metadata field
  created_at?: string;
  updated_at?: string;
}

// Updated UserProfile interface to match the Supabase database structure
export interface UserProfile {
  id: string;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// New interfaces for Product management - ADDED itemNumber
export interface Product {
  id: string;
  locationId?: string; // Added for branch filtering in local DB
  itemNumber: string; // Added item number field
  barcode: string | null; // Added barcode field
  manufacturerBarcode: string | null; // Added manufacturer barcode field
  name: string;
  description: string | null;
  category: string; // Keep for legacy / display
  categoryId?: string | null;
  categoryName?: string | null;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  supplier: string | null;
  imageUrl: string | null;
  minimumStock: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbProduct {
  id: string;
  user_id: string;
  item_number: string; // Added item number field
  barcode: string | null; // Added barcode field
  manufacturer_barcode: string | null; // Added manufacturer barcode field
  name: string;
  description: string | null;
  category: string;
  quantity: number;
  cost_price: number;
  selling_price: number;
  supplier: string | null;
  image_url: string | null;
  minimum_stock: number;
  created_at: string;
  updated_at: string;
}

export interface ProductFormData {
  name: string;
  barcode?: string; // Added barcode field
  manufacturerBarcode?: string; // Added manufacturer barcode field
  description?: string;
  category?: string;
  categoryId?: string | null;
  quantity: number; // Always a number, never undefined
  costPrice?: number;
  sellingPrice?: number;
  supplier?: string;
  minimumStock?: number;
  imageFile?: File | null;
  imageUrl?: string | null;
  createdAt?: Date; // Added created date field
}

export interface ProductCategory {
  id: string;
  name: string;
  createdAt?: Date;
}

export interface DbProductCategory {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface StockHistoryEntry {
  id: string;
  productId: string;
  oldQuantity: number;
  newQuantity: number;
  costPrice?: number;
  sellingPrice?: number;
  changeReason: string;
  referenceId?: string | null;
  receiptNumber?: string;
  createdAt: Date;
  product?: {
    name: string;
    costPrice: number;
    sellingPrice: number;
    itemNumber: string;
  };
}

export interface DbStockHistoryEntry {
  id: string;
  user_id: string;
  product_id: string;
  previous_quantity: number;
  new_quantity: number;
  change_reason: string;
  reference_id?: string | null;
  created_at: string;
}

export interface ProductFilters {
  search: string;
  category: string;
  stockStatus: 'all' | 'inStock' | 'lowStock' | 'outOfStock';
}

// Customer management types
export interface Customer {
  id: string;
  fullName: string;
  email: string | null;
  phoneNumber: string | null;
  birthday: Date | null;
  location: string | null;
  categoryId: string | null; // Added category relationship
  socialMedia: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    other?: string;
  } | null;
  gender: string | null;
  tags: string[] | null;
  notes: string | null;
  branchId: string;
  lifetimeValue?: number;
  orderCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbCustomer {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  birthday: string | null;
  location: string | null;
  category_id: string | null; // Added category relationship
  social_media: Json | null;
  gender: string | null;
  tags: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerFormData {
  fullName: string;
  email: string;
  phoneNumber: string;
  birthday: Date | null;
  location: string;
  categoryId: string | null; // Added category field
  socialMedia: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    other?: string;
  };
  gender: string;
  tags: string[];
  notes: string;
}

// Utility functions for database conversions
export const mapDbSaleToSale = (dbSale: any): Sale => {
  // Parse items and ensure numeric fields are numbers, not strings
  const rawItems = Array.isArray(dbSale.items) ? dbSale.items : [];
  const items = rawItems.map((item: any) => {
    const discountPercentage = item.discount_percentage !== undefined ? Number(item.discount_percentage) : (item.discountPercentage !== undefined ? Number(item.discountPercentage) : undefined);
    const discountAmount = item.discount !== undefined ? Number(item.discount) : (item.discountAmount !== undefined ? Number(item.discountAmount) : undefined);
    const discountType = item.discount_type || item.discountType || undefined;

    return {
      description: item.description || item.product_name || 'Item',
      quantity: Number(item.quantity) || 0,
      price: Number(item.unit_price || item.price || 0),
      cost: Number(item.cost_price || item.cost || 0),
      productId: item.productId || item.product_id || item.product || undefined,
      discountType,
      discountPercentage,
      discountAmount,
      createdAt: item.createdAt || item.created_at || undefined,
    };
  }) as SaleItem[];

  // Calculate total quantity once
  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  // Generate item description once
  let itemDescription = "No items";
  if (items.length > 0) {
    itemDescription = items[0].description;
    if (items.length > 1) {
      itemDescription += ` (+${items.length - 1} more)`;
    }
  }

  return {
    id: dbSale.id,
    receiptNumber: dbSale.receipt_number,
    customerName: dbSale.customer_name,
    customerAddress: dbSale.customer_address || '',
    customerContact: dbSale.customer_phone || dbSale.customer_contact || '',
    customerId: dbSale.customer || dbSale.customer_id || undefined,
    items,
    paymentStatus: dbSale.payment_status || dbSale.status || 'Paid',
    profit: Number(dbSale.profit) || 0,
    total: Number(dbSale.total_amount || dbSale.total || 0),
    totalCost: Number(dbSale.total_cost || 0),
    subtotal: Number(dbSale.subtotal || 0),
    discount: Number(dbSale.discount_amount || dbSale.discount || 0),
    taxAmount: Number(dbSale.tax_amount || 0),
    totalQuantity,
    itemDescription,
    date: new Date(dbSale.date),
    taxRate: Number(dbSale.tax_rate) || 0,
    cashTransactionId: dbSale.cash_transaction || dbSale.cash_transaction_id || undefined,
    amountPaid: Number(dbSale.amount_paid) || 0,
    amountDue: Number(dbSale.balance_due || dbSale.amount_due || 0),
    notes: dbSale.notes || '',
    categoryId: dbSale.category || dbSale.category_id || undefined,
    createdAt: new Date(dbSale.created_at),
    updatedAt: new Date(dbSale.updated_at),
  };
};

export const mapSaleToDbSale = (
  saleData: SaleFormData,
  selectedDate: Date,
  profit: number,
  receiptNumber: string,
  userId: string,
  locationId: string,
  cashTransactionId?: string | null
): Omit<DbSale, 'id' | 'created_at' | 'updated_at'> => {
  // Map items and ensure productId is included for stock deduction
  const mappedItems = saleData.items.map(item => ({
    productId: item.productId,
    description: item.description,
    quantity: item.quantity,
    price: item.price,
    cost: item.cost,
    discountType: item.discountType,
    discountPercentage: item.discountPercentage,
    discountAmount: item.discountAmount
  }));

  return {
    user_id: userId,
    location_id: locationId,
    receipt_number: receiptNumber,
    customer_name: saleData.customerName,
    customer_address: saleData.customerAddress || null,
    customer_contact: saleData.customerContact || null,
    customer_id: saleData.customerId || null, // Include customer_id
    items: (mappedItems as unknown) as Json,
    payment_status: saleData.paymentStatus,
    profit: profit,
    date: selectedDate.toISOString().split('T')[0],
    tax_rate: saleData.taxRate || 0,
    cash_transaction_id: cashTransactionId || null,
    amount_paid: saleData.amountPaid || null,
    amount_due: saleData.amountDue || null,
    notes: saleData.notes || null,
    category_id: saleData.categoryId || null,
    shipping_cost: saleData.shippingCost || 0,
    discount_reason: saleData.discountReason || null,
    payment_reference: saleData.paymentReference || null,
    subtotal: saleData.items.reduce((sum, item) => {
      const itemSubtotal = item.price * item.quantity;
      const discountAmount = item.discountType === 'amount' ? (item.discountAmount || 0) : (itemSubtotal * (item.discountPercentage || 0)) / 100;
      return sum + (itemSubtotal - discountAmount);
    }, 0),
    total_cost: saleData.items.reduce((sum, item) => sum + (item.cost * item.quantity), 0),
    tax_amount: saleData.items.reduce((sum, item) => {
      const itemSubtotal = item.price * item.quantity;
      const discountAmount = item.discountType === 'amount' ? (item.discountAmount || 0) : (itemSubtotal * (item.discountPercentage || 0)) / 100;
      return sum + (itemSubtotal - discountAmount);
    }, 0) * (saleData.taxRate || 0) / 100,
    total: (saleData.items.reduce((sum, item) => {
      const itemSubtotal = item.price * item.quantity;
      const discountAmount = item.discountType === 'amount' ? (item.discountAmount || 0) : (itemSubtotal * (item.discountPercentage || 0)) / 100;
      return sum + (itemSubtotal - discountAmount);
    }, 0) * (1 + (saleData.taxRate || 0) / 100)) + (saleData.shippingCost || 0),
    discount: saleData.items.reduce((sum, item) => {
      const itemSubtotal = item.price * item.quantity;
      return sum + (item.discountType === 'amount' ? (item.discountAmount || 0) : (itemSubtotal * (item.discountPercentage || 0)) / 100);
    }, 0),
  };
};

// Conversion functions for business settings
export const mapDbBusinessSettingsToBusinessSettings = (dbSettings: DbBusinessSettings): BusinessSettings => {
  return {
    businessName: dbSettings.business_name,
    businessAddress: dbSettings.address,
    businessPhone: dbSettings.phone,
    businessEmail: dbSettings.email,
    businessLogo: dbSettings.logo,
    currency: dbSettings.currency,
    signature: dbSettings.signature_image,
    paymentInfo: dbSettings.metadata && typeof dbSettings.metadata === 'object' ?
      (dbSettings.metadata as Record<string, unknown>).payment_info as string || '' : '',
    defaultPrintFormat: dbSettings.metadata && typeof dbSettings.metadata === 'object' ?
      (dbSettings.metadata as Record<string, unknown>).default_print_format as 'standard' | 'thermal' || 'standard' : 'standard',
    defaultPrinterName: dbSettings.metadata && typeof dbSettings.metadata === 'object' ?
      (dbSettings.metadata as Record<string, unknown>).default_printer_name as string || '' : '',
    defaultPrinterType: dbSettings.metadata && typeof dbSettings.metadata === 'object' ?
      (dbSettings.metadata as Record<string, unknown>).default_printer_type as 'USB' | 'Bluetooth' || 'USB' : 'USB'
  };
};

export const mapBusinessSettingsToDbBusinessSettings = (
  settings: BusinessSettings,
  userId: string
): DbBusinessSettings => {
  // Create metadata object with payment_info
  const metadata: Json = {
    payment_info: settings.paymentInfo || '',
    default_print_format: settings.defaultPrintFormat || 'standard',
    default_printer_name: settings.defaultPrinterName || '',
    default_printer_type: settings.defaultPrinterType || 'USB'
  };

  return {
    user_id: userId,
    business_name: settings.businessName,
    address: settings.businessAddress,
    phone: settings.businessPhone,
    email: settings.businessEmail,
    logo: settings.businessLogo,
    currency: settings.currency,
    signature_image: settings.signature,
    metadata: metadata, // Include metadata in the return object
    updated_at: new Date().toISOString()
  };
};

// Conversion functions for products and categories - ADDED itemNumber
export const mapDbProductToProduct = (dbProduct: DbProduct): Product => {
  return {
    id: dbProduct.id,
    itemNumber: dbProduct.item_number, // Added item number mapping
    barcode: dbProduct.barcode, // Added barcode mapping
    manufacturerBarcode: dbProduct.manufacturer_barcode, // Added manufacturer barcode mapping
    name: dbProduct.name,
    description: dbProduct.description,
    category: dbProduct.category,
    quantity: dbProduct.quantity,
    costPrice: Number(dbProduct.cost_price),
    sellingPrice: Number(dbProduct.selling_price),
    supplier: dbProduct.supplier,
    imageUrl: dbProduct.image_url,
    minimumStock: dbProduct.minimum_stock,
    createdAt: new Date(dbProduct.created_at),
    updatedAt: new Date(dbProduct.updated_at)
  };
};

export const mapProductToDbProduct = (product: Partial<Product>, userId: string): Partial<DbProduct> => {
  const result: Partial<DbProduct> = {
    user_id: userId
  };

  if (product.id) result.id = product.id;
  if (product.itemNumber) result.item_number = product.itemNumber; // Added item number mapping
  if (product.barcode !== undefined) result.barcode = product.barcode; // Added barcode mapping
  if (product.manufacturerBarcode !== undefined) result.manufacturer_barcode = product.manufacturerBarcode; // Added manufacturer barcode mapping
  if (product.name) result.name = product.name;
  result.description = product.description;
  if (product.category) result.category = product.category;
  if (product.quantity !== undefined) result.quantity = product.quantity;
  if (product.costPrice !== undefined) {
    result.cost_price = product.costPrice;
    console.log(`DEBUG: Mapping costPrice ${product.costPrice} to cost_price`);
  }
  if (product.sellingPrice !== undefined) {
    result.selling_price = product.sellingPrice;
    console.log(`DEBUG: Mapping sellingPrice ${product.sellingPrice} to selling_price`);
  }
  result.supplier = product.supplier;
  result.image_url = product.imageUrl;
  if (product.minimumStock !== undefined) result.minimum_stock = product.minimumStock;

  return result;
};

export const mapDbProductCategoryToProductCategory = (dbCategory: DbProductCategory): ProductCategory => {
  return {
    id: dbCategory.id,
    name: dbCategory.name
  };
};

export const mapDbStockHistoryToStockHistory = (dbHistory: DbStockHistoryEntry): StockHistoryEntry => {
  return {
    id: dbHistory.id,
    productId: dbHistory.product_id,
    oldQuantity: dbHistory.previous_quantity,
    newQuantity: dbHistory.new_quantity,
    changeReason: dbHistory.change_reason,
    referenceId: dbHistory.reference_id || null,
    createdAt: new Date(dbHistory.created_at)
  };
};

// Updated Customer mapping functions to include categoryId
export const mapDbCustomerToCustomer = (dbCustomer: DbCustomer): Customer => {
  let birthday = null;

  if (dbCustomer.birthday) {
    try {
      const birthdayStr = String(dbCustomer.birthday);
      const [year, month, day] = birthdayStr.split('-').map(Number);

      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        birthday = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

        console.log(
          'Converting DB birthday to Date object:',
          dbCustomer.birthday,
          '→',
          birthday,
          '(UTC string:',
          birthday.toISOString(),
          ')'
        );
      } else {
        console.error('Invalid date components in birthday:', dbCustomer.birthday);
      }
    } catch (error) {
      console.error('Error parsing birthday:', error, dbCustomer.birthday);
    }
  }

  return {
    id: dbCustomer.id,
    fullName: dbCustomer.full_name,
    email: dbCustomer.email,
    phoneNumber: dbCustomer.phone_number,
    birthday: birthday,
    location: dbCustomer.location,
    categoryId: dbCustomer.category_id, // Added category mapping
    socialMedia: dbCustomer.social_media as any,
    gender: dbCustomer.gender,
    tags: dbCustomer.tags,
    notes: dbCustomer.notes,
    branchId: (dbCustomer as any).location_id || (dbCustomer as any).branch_id || '',
    createdAt: new Date(dbCustomer.created_at),
    updatedAt: new Date(dbCustomer.updated_at)
  };
};

export const mapCustomerToDbCustomer = (customer: Partial<Customer>, userId: string): Partial<DbCustomer> => {
  const result: Partial<DbCustomer> = {
    user_id: userId
  };

  if (customer.id) result.id = customer.id;
  if (customer.fullName) result.full_name = customer.fullName;
  result.email = customer.email;
  result.phone_number = customer.phoneNumber;
  if (customer.birthday) result.birthday = customer.birthday.toISOString().split('T')[0];
  result.location = customer.location;
  result.category_id = customer.categoryId; // Added category mapping
  result.social_media = customer.socialMedia as Json;
  result.gender = customer.gender;
  result.tags = customer.tags;
  result.notes = customer.notes;

  return result;
};

// Conversion functions for expenses
export const mapDbExpenseToExpense = (dbExpense: DbExpense): Expense => {
  return {
    id: dbExpense.id,
    amount: Number(dbExpense.amount),
    description: dbExpense.description,
    category: dbExpense.category,
    date: new Date(dbExpense.date),
    paymentMethod: dbExpense.payment_method,
    personInCharge: dbExpense.person_in_charge,
    receiptImage: dbExpense.receipt_image,
    cashAccountId: dbExpense.cash_account_id,
    cashTransactionId: dbExpense.cash_transaction_id,
    createdAt: new Date(dbExpense.created_at),
    updatedAt: new Date(dbExpense.updated_at)
  };
};

export const mapExpenseToDbExpense = (expense: Partial<Expense>, userId: string): Partial<DbExpense> => {
  const result: Partial<DbExpense> = {
    user_id: userId
  };

  if (expense.id) result.id = expense.id;
  if (expense.amount !== undefined) result.amount = expense.amount;
  if (expense.description) result.description = expense.description;
  result.category = expense.category;
  if (expense.date) result.date = expense.date.toISOString().split('T')[0];
  result.payment_method = expense.paymentMethod;
  result.person_in_charge = expense.personInCharge;
  result.receipt_image = expense.receiptImage;
  result.cash_account_id = expense.cashAccountId;
  result.cash_transaction_id = expense.cashTransactionId;

  return result;
};
