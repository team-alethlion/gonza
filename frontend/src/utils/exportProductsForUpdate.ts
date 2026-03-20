
import { Product } from '@/types';

export const exportProductsForUpdate = (products: Product[]): void => {
  // Define CSV header - simplified for updates, no currency symbols
  const headers = [
    'Item Number',
    'Name',
    'Category',
    'Quantity',
    'Cost Price',
    'Selling Price',
    'Supplier',
    'Description'
  ];
  
  // Create rows for each product - only editable fields
  const rows = products.map(product => {
    return [
      product.itemNumber,
      product.name,
      product.category,
      product.quantity.toString(),
      product.costPrice.toString(),
      product.sellingPrice.toString(),
      product.supplier || '',
      product.description || ''
    ];
  });
  
  // Combine header and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Create a direct download using data URL
  const dataUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
  const filename = `products_for_update_${new Date().toISOString().slice(0, 10)}.csv`;
  
  // Create and trigger download
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
