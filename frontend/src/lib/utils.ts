
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility to get the base URL of the application.
 * Handles environment variables for Vercel and local development.
 */
export function getBaseUrl() {
  // If we are in the browser, use relative paths
  if (typeof window !== 'undefined') return '';

  // Use the explicitly defined app URL if available
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;

  // Fallback to VERCEL_URL if running on Vercel
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  // Default to localhost for local development
  return `http://localhost:${process.env.PORT || 3000}`;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

export function formatCashCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatCashAmount(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Add function to format large numbers with appropriate units
export function formatLargeNumber(value: number): string {
  if (value >= 1000000000) {
    return (value / 1000000000).toFixed(1) + 'B';
  } else if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  } else if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return formatNumber(value);
}

/**
 * Formats a number input string with thousands separators while preserving decimal points.
 * This allows users to type decimals freely while still getting auto-comma formatting.
 * 
 * Examples:
 * - "1234" → "1,234"
 * - "1234.5" → "1,234.5"
 * - "1234.56" → "1,234.56"
 * - "1234." → "1,234." (preserves trailing decimal)
 * 
 * @param input - The raw input string from the user
 * @returns Formatted string with commas and preserved decimals
 */
export function formatNumberInput(input: string): string {
  // Handle empty or invalid input
  if (!input || input === '') return '';

  // Remove all existing commas first
  const cleaned = input.replace(/,/g, '');

  // Check if it's just a decimal point
  if (cleaned === '.') return '0.';

  // Split into integer and decimal parts
  const parts = cleaned.split('.');
  const integerPart = parts[0] || '0';
  const decimalPart = parts[1];

  // Format integer part with commas
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // Reconstruct with decimal part if it exists
  if (parts.length > 1) {
    // User has typed a decimal point
    return decimalPart !== undefined
      ? `${formattedInteger}.${decimalPart}`
      : `${formattedInteger}.`;
  }

  return formattedInteger;
}

/**
 * Parses a formatted number input string to a number.
 * Strips commas and handles empty strings.
 * 
 * @param input - Formatted input string (may contain commas)
 * @returns Parsed number value, or 0 if invalid
 */
export function parseNumberInput(input: string): number {
  if (!input || input === '') return 0;
  const cleaned = input.replace(/,/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
