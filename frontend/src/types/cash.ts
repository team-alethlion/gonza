
// Cash management types
export interface CashAccount {
  id: string;
  name: string;
  description: string | null;
  openingBalance: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbCashAccount {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  opening_balance: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CashTransaction {
  id: string;
  accountId: string | null;
  amount: number;
  transactionType: 'cash_in' | 'cash_out' | 'transfer_in' | 'transfer_out';
  category: string;
  description: string;
  personInCharge: string | null;
  tags: string[] | null;
  date: Date;
  paymentMethod: string | null;
  receiptImage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbCashTransaction {
  id: string;
  user_id: string;
  account_id: string | null;
  amount: number;
  transaction_type: string;
  category: string;
  description: string;
  person_in_charge: string | null;
  tags: string[] | null;
  date: string;
  payment_method: string | null;
  receipt_image: string | null;
  created_at: string;
  updated_at: string;
}

export interface CashAccountFormData {
  name: string;
  description: string;
  openingBalance: number;
  isDefault: boolean;
}

export interface CashTransactionFormData {
  accountId: string;
  amount: number;
  transactionType: 'cash_in' | 'cash_out' | 'transfer';
  toAccountId?: string;
  category: string;
  description: string;
  personInCharge: string;
  tags: string[];
  date: Date;
  paymentMethod: string;
  receiptImage: string;
}

export interface DailyCashSummary {
  date: Date;
  openingBalance: number;
  cashIn: number;
  cashOut: number;
  transfersIn: number;
  transfersOut: number;
  closingBalance: number;
}

// Conversion functions
export const mapDbCashAccountToCashAccount = (dbAccount: DbCashAccount): CashAccount => {
  return {
    id: dbAccount.id,
    name: dbAccount.name,
    description: dbAccount.description,
    openingBalance: Number(dbAccount.opening_balance),
    isDefault: dbAccount.is_default,
    createdAt: new Date(dbAccount.created_at),
    updatedAt: new Date(dbAccount.updated_at)
  };
};

export const mapCashAccountFormToDbInsert = (formData: CashAccountFormData, userId: string): Omit<DbCashAccount, 'id' | 'created_at' | 'updated_at'> => {
  return {
    user_id: userId,
    name: formData.name,
    description: formData.description || null,
    opening_balance: formData.openingBalance,
    is_default: formData.isDefault
  };
};

export const mapCashAccountFormToDbUpdate = (formData: Partial<CashAccountFormData>): Partial<Omit<DbCashAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>> => {
  const result: Partial<Omit<DbCashAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>> = {};

  if (formData.name !== undefined) result.name = formData.name;
  if (formData.description !== undefined) result.description = formData.description || null;
  if (formData.openingBalance !== undefined) result.opening_balance = formData.openingBalance;
  if (formData.isDefault !== undefined) result.is_default = formData.isDefault;

  return result;
};

export const mapDbCashTransactionToCashTransaction = (dbTransaction: DbCashTransaction): CashTransaction => {
  return {
    id: dbTransaction.id,
    accountId: dbTransaction.account_id,
    amount: Number(dbTransaction.amount),
    transactionType: dbTransaction.transaction_type as 'cash_in' | 'cash_out' | 'transfer_in' | 'transfer_out',
    category: dbTransaction.category,
    description: dbTransaction.description,
    personInCharge: dbTransaction.person_in_charge,
    tags: dbTransaction.tags,
    date: new Date(dbTransaction.date),
    paymentMethod: dbTransaction.payment_method,
    receiptImage: dbTransaction.receipt_image,
    createdAt: new Date(dbTransaction.created_at),
    updatedAt: new Date(dbTransaction.updated_at)
  };
};

export const mapCashTransactionFormToDbInsert = (formData: CashTransactionFormData, userId: string): Omit<DbCashTransaction, 'id' | 'created_at' | 'updated_at'> => {
  return {
    user_id: userId,
    account_id: formData.accountId,
    amount: formData.amount,
    transaction_type: formData.transactionType,
    category: formData.category,
    description: formData.description,
    person_in_charge: formData.personInCharge || null,
    tags: formData.tags.length > 0 ? formData.tags : null,
    date: formData.date.toISOString().split('T')[0],
    payment_method: formData.paymentMethod || null,
    receipt_image: formData.receiptImage || null
  };
};
