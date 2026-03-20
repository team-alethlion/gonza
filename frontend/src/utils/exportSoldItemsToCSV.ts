
interface SoldItem {
  description: string;
  totalQuantity: number;
  averagePrice: number;
  totalAmount: number;
  totalCost: number;
  totalProfit: number;
  totalDiscount: number;
  averageCost?: number;
}

export const exportSoldItemsToCSV = (soldItems: SoldItem[], period: string, currency: string = 'USD', costOnlyMode: boolean = false) => {
  // Create CSV header based on mode
  const headers = costOnlyMode 
    ? ['Item', 'Quantity', 'Average Cost', 'Total Cost']
    : ['Item', 'Quantity', 'Average Price', 'Total Amount', 'Discount', 'Cost Amount', 'Profit'];
  
  // Number formatter without currency symbol and no decimal points
  const numberFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  
  // Create CSV rows with clean numeric values based on mode
  const rows = soldItems.map(item => {
    if (costOnlyMode) {
      return [
        item.description,
        item.totalQuantity.toString(),
        numberFormatter.format(item.averageCost || 0),
        numberFormatter.format(item.totalCost)
      ];
    } else {
      return [
        item.description,
        item.totalQuantity.toString(),
        numberFormatter.format(item.averagePrice),
        numberFormatter.format(item.totalAmount),
        numberFormatter.format(item.totalDiscount),
        numberFormatter.format(item.totalCost),
        numberFormatter.format(item.totalProfit)
      ];
    }
  });
  
  // Add summary row based on mode
  const totalQuantity = soldItems.reduce((sum, item) => sum + item.totalQuantity, 0);
  const totalAmount = soldItems.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalDiscount = soldItems.reduce((sum, item) => sum + item.totalDiscount, 0);
  const totalCost = soldItems.reduce((sum, item) => sum + item.totalCost, 0);
  const totalProfit = soldItems.reduce((sum, item) => sum + item.totalProfit, 0);
  
  rows.push(['']); // Empty row
  rows.push(['SUMMARY', '', '', '', '', '', '']);
  rows.push(['Total Items', soldItems.length.toString(), '', '', '', '', '']);
  rows.push(['Total Quantity', totalQuantity.toString(), '', '', '', '', '']);
  
  if (costOnlyMode) {
    rows.push(['Total Cost', '', '', numberFormatter.format(totalCost)]);
  } else {
    rows.push(['Total Revenue', '', '', numberFormatter.format(totalAmount), '', '', '']);
    rows.push(['Total Discount', '', '', '', numberFormatter.format(totalDiscount), '', '']);
    rows.push(['Total Cost', '', '', '', '', numberFormatter.format(totalCost), '']);
    rows.push(['Total Profit', '', '', '', '', '', numberFormatter.format(totalProfit)]);
  }
  
  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
  
  // Create and download the file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  const modePrefix = costOnlyMode ? 'cost_data_' : '';
  link.setAttribute('href', url);
  link.setAttribute('download', `${modePrefix}sold_items_${period.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
