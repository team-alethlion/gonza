/* eslint-disable @typescript-eslint/no-explicit-any */

export interface CSVProductRow {
  "Product Name": string;
  Category: string;
  Description: string;
  Supplier: string;
  "Creation Date": string;
  "Initial Stock": string;
  "Minimum Stock Level": string;
  "Cost Price": string;
  "Selling Price": string;
  "Manufacturer Barcode"?: string;
}

export interface CSVTransactionRow {
  Date: string;
  Type: string;
  Amount: string;
  Description: string;
  Category: string;
  "Payment Method"?: string;
  "Person In Charge"?: string;
  "To Account"?: string;
}

export interface CSVExpenseRow {
  Date: string;
  Amount: string;
  Description: string;
  Category: string;
  "Payment Method"?: string;
  "Person In Charge"?: string;
  "Link to Finance"?: string; // 'true' or 'false'
  "Finance Account"?: string; // Account name
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ParsedCSVResult {
  validRows: CSVProductRow[];
  errors: ValidationError[];
  totalRows: number;
}

// Proper CSV parser that handles quoted fields with commas
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote - add single quote to current field
        current += '"';
        i += 2; // Skip both quotes
        continue;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // Field separator - push current field and reset
      result.push(current.trim());
      current = "";
    } else {
      // Regular character - add to current field
      current += char;
    }

    i++;
  }

  // Push the last field
  result.push(current.trim());
  return result;
};

export const parseCSV = (csvText: string): ParsedCSVResult => {
  const lines = csvText.trim().split("\n");
  const headers = parseCSVLine(lines[0]).map((h) => h.trim());

  const validRows: CSVProductRow[] = [];
  const errors: ValidationError[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]).map((v) => v.trim());
    const row: any = {};

    // Map values to headers
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    // Validate required fields
    const rowErrors = validateCSVRow(row, i + 1);

    if (rowErrors.length === 0) {
      validRows.push(row as CSVProductRow);
    } else {
      errors.push(...rowErrors);
    }
  }

  return {
    validRows,
    errors,
    totalRows: lines.length - 1,
  };
};

export interface ParsedTransactionCSVResult {
  validRows: CSVTransactionRow[];
  errors: ValidationError[];
  totalRows: number;
}

export const parseTransactionCSV = (
  csvText: string,
): ParsedTransactionCSVResult => {
  const lines = csvText.trim().split("\n");
  if (lines.length < 1) return { validRows: [], errors: [], totalRows: 0 };

  const headers = parseCSVLine(lines[0]).map((h) => h.trim());

  const validRows: CSVTransactionRow[] = [];
  const errors: ValidationError[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = parseCSVLine(lines[i]).map((v) => v.trim());
    const row: any = {};

    // Map values to headers
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    // Validate required fields
    const rowErrors = validateTransactionCSVRow(row, i + 1);

    if (rowErrors.length === 0) {
      validRows.push(row as CSVTransactionRow);
    } else {
      errors.push(...rowErrors);
    }
  }

  return {
    validRows,
    errors,
    totalRows: lines.length - 1,
  };
};

export interface ParsedExpenseCSVResult {
  validRows: CSVExpenseRow[];
  errors: ValidationError[];
  totalRows: number;
}

export const parseExpenseCSV = (csvText: string): ParsedExpenseCSVResult => {
  const lines = csvText.trim().split("\n");
  if (lines.length < 1) return { validRows: [], errors: [], totalRows: 0 };

  const headers = parseCSVLine(lines[0]).map((h) => h.trim());

  const validRows: CSVExpenseRow[] = [];
  const errors: ValidationError[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = parseCSVLine(lines[i]).map((v) => v.trim());
    const row: any = {};

    // Map values to headers
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    // Validate required fields
    const rowErrors = validateExpenseCSVRow(row, i + 1);

    if (rowErrors.length === 0) {
      validRows.push(row as CSVExpenseRow);
    } else {
      errors.push(...rowErrors);
    }
  }

  return {
    validRows,
    errors,
    totalRows: lines.length - 1,
  };
};

const validateCSVRow = (row: any, rowNumber: number): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Only validate that Product Name is present
  if (!row["Product Name"]?.trim()) {
    errors.push({
      row: rowNumber,
      field: "Product Name",
      message: "Product Name is required",
    });
  }

  return errors;
};

export const validateTransactionCSVRow = (
  row: any,
  rowNumber: number,
): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (
    !row["Amount"] ||
    isNaN(Number(row["Amount"])) ||
    Number(row["Amount"]) <= 0
  ) {
    errors.push({
      row: rowNumber,
      field: "Amount",
      message: "Amount must be a positive number",
    });
  }

  if (
    !row["Type"] ||
    !["cash_in", "cash_out", "transfer"].includes(row["Type"].toLowerCase())
  ) {
    errors.push({
      row: rowNumber,
      field: "Type",
      message: 'Type must be "cash_in", "cash_out", or "transfer"',
    });
  }

  if (!row["Description"]?.trim()) {
    errors.push({
      row: rowNumber,
      field: "Description",
      message: "Description is required",
    });
  }

  if (row["Type"]?.toLowerCase() === "transfer" && !row["To Account"]) {
    errors.push({
      row: rowNumber,
      field: "To Account",
      message: "To Account is required for transfers",
    });
  }

  return errors;
};

export const validateExpenseCSVRow = (
  row: any,
  rowNumber: number,
): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (
    !row["Amount"] ||
    isNaN(Number(row["Amount"])) ||
    Number(row["Amount"]) <= 0
  ) {
    errors.push({
      row: rowNumber,
      field: "Amount",
      message: "Amount must be a positive number",
    });
  }

  if (!row["Description"]?.trim()) {
    errors.push({
      row: rowNumber,
      field: "Description",
      message: "Description is required",
    });
  }

  const linkToFinance = row["Link to Finance"]?.toString().toLowerCase();
  if (linkToFinance === "true" && !row["Finance Account"]?.trim()) {
    errors.push({
      row: rowNumber,
      field: "Finance Account",
      message: "Finance Account is required when Link to Finance is true",
    });
  }

  return errors;
};

export const generateErrorLogCSV = (
  errors: ValidationError[],
  filename: string = "upload_errors.csv",
) => {
  const headers = ["Row", "Field", "Error Message"];
  const csvContent = [
    headers.join(","),
    ...errors.map((error) =>
      [error.row, error.field, `"${error.message}"`].join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const extractUniqueCategories = (
  validRows: CSVProductRow[],
): string[] => {
  const categories = validRows
    .map((row) => row["Category"]?.trim())
    .filter((category) => category && category !== "");

  return [...new Set(categories)];
};
