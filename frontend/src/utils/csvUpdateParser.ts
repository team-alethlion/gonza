/* eslint-disable @typescript-eslint/no-explicit-any */
export interface CSVProductUpdateRow {
  "Item Number": string;
  Name: string;
  Category: string;
  Quantity: string;
  "Cost Price": string;
  "Selling Price": string;
  Supplier: string;
  Description: string;
  "Manufacturer Barcode"?: string;
  Barcode?: string;
}

export interface UpdateValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ParsedCSVUpdateResult {
  validRows: CSVProductUpdateRow[];
  errors: UpdateValidationError[];
  totalRows: number;
}

// Parse CSV line handling quoted fields
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
        current += '"';
        i += 2;
        continue;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }

    i++;
  }

  result.push(current.trim());
  return result;
};

export const parseCSVUpdate = (csvText: string): ParsedCSVUpdateResult => {
  const lines = csvText.trim().split("\n");
  const headers = parseCSVLine(lines[0]).map((h) => h.trim());

  const validRows: CSVProductUpdateRow[] = [];
  const errors: UpdateValidationError[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]).map((v) => v.trim());
    const row: any = {};

    // Map values to headers
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    // Validate row
    const rowErrors = validateCSVUpdateRow(row, i + 1);

    if (rowErrors.length === 0) {
      validRows.push(row as CSVProductUpdateRow);
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

const validateCSVUpdateRow = (
  row: any,
  rowNumber: number,
): UpdateValidationError[] => {
  const errors: UpdateValidationError[] = [];

  // Item Number is required for updates
  if (!row["Item Number"]?.trim()) {
    errors.push({
      row: rowNumber,
      field: "Item Number",
      message: "Item Number is required for updates",
    });
  }

  // Validate numeric fields if provided
  if (
    row["Quantity"] &&
    row["Quantity"].trim() !== "" &&
    isNaN(Number(row["Quantity"]))
  ) {
    errors.push({
      row: rowNumber,
      field: "Quantity",
      message: "Quantity must be a number",
    });
  }

  if (
    row["Cost Price"] &&
    row["Cost Price"].trim() !== "" &&
    isNaN(Number(row["Cost Price"]))
  ) {
    errors.push({
      row: rowNumber,
      field: "Cost Price",
      message: "Cost Price must be a number",
    });
  }

  if (
    row["Selling Price"] &&
    row["Selling Price"].trim() !== "" &&
    isNaN(Number(row["Selling Price"]))
  ) {
    errors.push({
      row: rowNumber,
      field: "Selling Price",
      message: "Selling Price must be a number",
    });
  }

  return errors;
};

export const generateUpdateErrorLogCSV = (errors: UpdateValidationError[]) => {
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
  link.download = "product_update_errors.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const extractUpdateCategories = (
  validRows: CSVProductUpdateRow[],
): string[] => {
  const categories = validRows
    .map((row) => row["Category"]?.trim())
    .filter((category) => category && category !== "");

  return [...new Set(categories)];
};
