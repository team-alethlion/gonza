import jsPDF from 'jspdf';
import { ProfitLossData } from '@/hooks/useProfitLossData';
import { format } from 'date-fns';

interface ExportPLPDFOptions {
  data: ProfitLossData;
  dateRange: { from: Date | undefined; to: Date | undefined };
  currency: string;
  businessName?: string;
  businessLogo?: string;
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

export const exportProfitLossToPDF = async (options: ExportPLPDFOptions) => {
  const { data, dateRange, currency, businessName, dateFilter } = options;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margins = { top: 20, right: 20, bottom: 20, left: 20 };
  
  let currentY = margins.top;

  // Function to add watermark to current page
  const addWatermark = () => {
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(150, 150, 150); // Light gray color
    pdf.text('Created By Gonza Systems', pageWidth / 2, pageHeight - 10, { align: 'center' });
    pdf.setTextColor(0, 0, 0); // Reset to black
  };

  const formatCurrency = (amount: number) => {
    return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Business name - centered and bold
  if (businessName) {
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    const businessNameWidth = pdf.getTextWidth(businessName);
    pdf.text(businessName, (pageWidth - businessNameWidth) / 2, currentY);
    currentY += 10; // Reduced from 12
  }

  // Report title - centered and bold
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  const title = 'Profit & Loss Account';
  const titleWidth = pdf.getTextWidth(title);
  pdf.text(title, (pageWidth - titleWidth) / 2, currentY);
  currentY += 8; // Reduced from 10

  // Date range - centered (This is the report period, not generation date)
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  const periodText = getPeriodDescription(dateFilter, dateRange);
  const periodWidth = pdf.getTextWidth(periodText);
  pdf.text(periodText, (pageWidth - periodWidth) / 2, currentY);
  currentY += 15;

  // Helper function to add a section header
  const addSectionHeader = (title: string) => {
    if (currentY > pageHeight - 40) {
      addWatermark(); // Add watermark to current page before creating new one
      pdf.addPage();
      currentY = margins.top;
    }
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margins.left, currentY);
    currentY += 6; // Reduced from 8
  };

  // Helper function to add a row
  const addRow = (label: string, amount: number | null, options: { 
    isBold?: boolean; 
    isSubtraction?: boolean; 
    isTotal?: boolean;
    indent?: boolean;
    showNegativeSign?: boolean;
  } = {}) => {
    const { isBold = false, isSubtraction = false, isTotal = false, indent = false, showNegativeSign = false } = options;
    
    if (currentY > pageHeight - 25) { // Reduced threshold from 30
      addWatermark(); // Add watermark to current page before creating new one
      pdf.addPage();
      currentY = margins.top;
    }

    pdf.setFontSize(10);
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    
    const labelX = indent ? margins.left + 10 : margins.left;
    pdf.text(label, labelX, currentY);
    
    if (amount !== null) {
      let amountText;
      if (showNegativeSign && amount < 0) {
        amountText = `-${formatCurrency(Math.abs(amount))}`;
      } else if (isSubtraction) {
        amountText = `(${formatCurrency(Math.abs(amount))})`;
      } else {
        amountText = formatCurrency(Math.abs(amount));
      }
      const amountWidth = pdf.getTextWidth(amountText);
      pdf.text(amountText, pageWidth - margins.right - amountWidth, currentY);
    }
    
    // Add line for totals
    if (isTotal) {
      pdf.setLineWidth(0.3);
      pdf.line(margins.left, currentY + 2, pageWidth - margins.right, currentY + 2);
      currentY += 2; // Reduced from 3
    }
    
    currentY += 5; // Reduced from 6
  };

  // Add spacer with reduced height
  const addSpacer = (height: number = 3) => { // Reduced default from 4
    currentY += height;
  };

  // SALES/REVENUE Section
  addSectionHeader('SALES/REVENUE');
  addRow('Sales/Revenue', data.sales, { indent: true });
  addRow('Sales Returns', data.salesReturns, { isSubtraction: true, indent: true });
  addRow('NET SALES', data.netSales, { isBold: true, isTotal: true });
  
  addSpacer(5); // Reduced from 8
  
  // COST OF GOODS SOLD Section
  addSectionHeader('COST OF GOODS SOLD (COGS)');
  addRow('Total Cost Sales', data.totalCostSales, { indent: true });
  addRow('Carriage Inwards', data.carriageInwards, { indent: true });
  addRow('TOTAL COST OF GOODS SOLD (COGS)', data.totalCOGS, { isBold: true, isTotal: true });
  
  addSpacer(5); // Reduced from 8
  
  // GROSS PROFIT
  addRow('GROSS PROFIT', data.grossProfit, { isBold: true, isTotal: true, showNegativeSign: true });
  
  addSpacer(3); // Reduced from 4
  
  // EXPENSES Section
  addSectionHeader('EXPENSES');
  Object.entries(data.expensesByCategory).forEach(([category, amount]) => {
    addRow(category.charAt(0).toUpperCase() + category.slice(1).toLowerCase(), amount, { indent: true });
  });
  addRow('TOTAL EXPENSES', data.totalExpenses, { isBold: true, isTotal: true });
  
  addSpacer(5); // Reduced from 8
  
  // FINAL CALCULATIONS
  addRow('NET PROFIT / LOSS', data.netProfitLoss, { isBold: true, isTotal: true, showNegativeSign: true });
  addRow(`Tax (${data.taxPercentage}%)`, data.taxAmount, { indent: true });
  addRow('FINAL PROFIT AFTER TAX', data.finalProfitAfterTax, { isBold: true, isTotal: true, showNegativeSign: true });

  // Add watermark to the final page
  addWatermark();

  // Save the PDF
  const fileName = `profit_loss_${dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : 'current'}_to_${dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : 'current'}.pdf`;
  pdf.save(fileName);
};
