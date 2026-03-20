import { Product } from '@/types';

/**
 * Checks if a search term (possibly containing multiple words in any order) matches a product.
 * Returns true if every word in the search term is found in at least one searchable field of the product.
 */
export const matchProductSearch = (product: Product, searchTerm: string): boolean => {
    if (!searchTerm || !searchTerm.trim()) return true;

    const words = searchTerm.toLowerCase().trim().split(/\s+/);

    const searchableText = [
        String(product.name || ''),
        String(product.description || ''),
        String(product.category || ''),
        String(product.supplier || ''),
        String(product.itemNumber || ''),
        String(product.barcode || ''),
        String(product.manufacturerBarcode || '')
    ].map(s => s.toLowerCase());

    // Every word in the search must match at least one searchable field
    return words.every(word =>
        searchableText.some(field => field.includes(word))
    );
};
