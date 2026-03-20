
import { Product, BusinessSettings } from '@/types';

export const exportProductsToCSV = (products: Product[]): void => {
  // Get currency from business settings
  const savedSettings = localStorage.getItem('businessSettings');
  const settings: BusinessSettings = savedSettings 
    ? JSON.parse(savedSettings)
    : { currency: 'USD' };

  // Define CSV header - ADDED Item Number
  const headers = [
    'Item Number',
    'Name',
    'Category',
    'Quantity',
    'Minimum Stock',
    `Cost Price (${settings.currency})`,
    `Selling Price (${settings.currency})`,
    'Supplier',
    'Description',
    'Created Date',
    'Last Updated'
  ];
  
  // Create rows for each product - ADDED Item Number
  const rows = products.map(product => {
    return [
      product.itemNumber,
      product.name,
      product.category,
      product.quantity.toString(),
      product.minimumStock.toString(),
      product.costPrice.toFixed(2),
      product.sellingPrice.toFixed(2),
      product.supplier || 'N/A',
      product.description ? product.description.replace(/,/g, ';').replace(/\n/g, ' ') : 'N/A',
      new Date(product.createdAt).toLocaleDateString(),
      new Date(product.updatedAt).toLocaleDateString()
    ];
  });
  
  // Combine header and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create a direct download using data URL
  const dataUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
  const filename = `products_${new Date().toISOString().slice(0, 10)}.csv`;
  
  // Create and trigger download
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
