
import { ProfitLossData } from '@/hooks/useProfitLossData';
import { format } from 'date-fns';

interface ExportPLCSVOptions {
  data: ProfitLossData;
  dateRange: { from: Date | undefined; to: Date | undefined };
  currency: string;
  businessName?: string;
  dateFilter?: string;
}

const getPeriodDescription = (dateFilter: string | undefined, dateRange: { from: Date | undefined; to: Date | undefined }) => {
  if (dateRange.from && dateRange.to) {
    const isSameMonth = dateRange.from.getMonth() === dateRange.to.getMonth() && 
                       dateRange.from.getFullYear() === dateRange.to.getFullYear();
    const isSameDay = dateRange.from.toDateString() === dateRange.to.toDateString();
    
    if (isSameDay) {
      return format(dateRange.from, 'MMM dd, yyyy');
    } else if (isSameMonth && dateFilter === 'this-month') {
      return format(dateRange.from, 'MMMM yyyy');
    } else if (dateFilter === 'this-year') {
      return format(dateRange.from, 'yyyy');
    } else if (dateFilter === 'last-month') {
      return format(dateRange.from, 'MMMM yyyy');
    } else if (dateFilter === 'this-week' || dateFilter === 'last-week') {
      return `Week of ${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}`;
    } else {
      return `Custom Period: ${format(dateRange.from, 'MM/dd/yyyy')} - ${format(dateRange.to, 'MM/dd/yyyy')}`;
    }
  } else if (dateRange.from) {
    return format(dateRange.from, 'MMM dd, yyyy');
  } else {
    return 'All Periods';
  }
};

export const exportProfitLossToCSV = (options: ExportPLCSVOptions) => {
  const { data, dateRange, currency, businessName, dateFilter } = options;

  const formatAmount = (amount: number, showNegativeSign: boolean = false) => {
    if (showNegativeSign && amount < 0) {
      return `-${Math.abs(amount).toFixed(0)}`;
    }
    return amount.toFixed(0);
  };

  const csvRows: string[] = [];

  // Header information
  csvRows.push('PROFIT & LOSS ACCOUNT');
  csvRows.push('');
  if (businessName) {
    csvRows.push(`Business,${businessName}`);
  }
  csvRows.push(`Period,${getPeriodDescription(dateFilter, dateRange)}`);
  csvRows.push(`Generated,${format(new Date(), 'MMM dd yyyy HH:mm')}`);
  csvRows.push(`Currency,${currency}`);
  csvRows.push('');

  // Table headers
  csvRows.push('DETAILS,AMOUNT');

  // SALES/REVENUE Section
  csvRows.push('');
  csvRows.push('SALES/REVENUE,');
  csvRows.push(`Sales/Revenue,${formatAmount(data.sales)}`);
  csvRows.push(`Sales Returns,(${formatAmount(data.salesReturns)})`);
  csvRows.push(`NET SALES,${formatAmount(data.netSales)}`);

  // COST OF GOODS SOLD Section
  csvRows.push('');
  csvRows.push('COST OF GOODS SOLD (COGS),');
  csvRows.push(`Total Cost Sales,${formatAmount(data.totalCostSales)}`);
  csvRows.push(`Carriage Inwards,${formatAmount(data.carriageInwards)}`);
  csvRows.push(`TOTAL COST OF GOODS SOLD (COGS),${formatAmount(data.totalCOGS)}`);

  // GROSS PROFIT
  csvRows.push('');
  csvRows.push(`GROSS PROFIT,${formatAmount(data.grossProfit, true)}`);

  // EXPENSES Section
  csvRows.push('');
  csvRows.push('EXPENSES,');
  Object.entries(data.expensesByCategory).forEach(([category, amount]) => {
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
    csvRows.push(`${categoryName},${formatAmount(amount)}`);
  });
  csvRows.push(`TOTAL EXPENSES,${formatAmount(data.totalExpenses)}`);

  // FINAL CALCULATIONS
  csvRows.push('');
  csvRows.push(`NET PROFIT / LOSS,${formatAmount(data.netProfitLoss, true)}`);
  csvRows.push(`Tax (${data.taxPercentage}%),${formatAmount(data.taxAmount)}`);
  csvRows.push(`FINAL PROFIT AFTER TAX,${formatAmount(data.finalProfitAfterTax, true)}`);

  // Create and download CSV
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const fileName = `profit_loss_${dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : 'current'}_to_${dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : 'current'}.csv`;
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
