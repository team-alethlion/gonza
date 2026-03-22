# Data Integrity & Hardening Mandates

## 1. Zero-Trust Database Data
- **The Rule**: NEVER pass raw database objects directly to the UI.
- **The Protocol**: ALWAYS use `mapDbSaleToSale` (or equivalent mappers) to sanitize field names and types.
- **The Protocol**: Field aliases like `total_amount` vs `total` and `unit_price` vs `price` must be handled at the mapper level.

## 2. Math Hardening (Anti-NaN)
- **The Problem**: Financial calculations crash or show `NaN` when receiving `null`, `undefined`, or `"None"` (string) from the database.
- **The Guard**: Use a `toSafeNum` helper for EVERY mathematical operation in components (Subtotals, Profits, Taxes).
- **The Guard**: Force every numeric field to a Number and default to `0` if invalid.

## 3. Financial Accuracy
- Invoices and Receipts must use the validated **Server Response** as the source of truth, not the local form state.
- Ensure item-level calculations (Price * Qty) are sanitized before summing into grand totals.
