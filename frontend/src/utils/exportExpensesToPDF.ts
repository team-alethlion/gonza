import { Expense } from '@/hooks/useExpenses';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

export const exportExpensesToPDF = (
  expenses: Expense[],
  formatCurrency: (amount: number) => string,
  currency: string = 'USD',
  businessName?: string,
  businessLogo?: string,
  dateFilter?: string,
  customDateRange?: { from: Date | undefined; to: Date | undefined }
): void => {
  if (expenses.length === 0) {
    alert('No expenses to export');
    return;
  }

  // Create PDF document in landscape orientation for better table layout
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;

  let yPosition = margin;

  // Business name and title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  const title = businessName || 'Business';
  doc.text(title, margin, yPosition);
  
  yPosition += 12;
  doc.setFontSize(16);
  doc.text('Expenses Report', margin, yPosition);
  
  // Report period
  yPosition += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  let periodText = '';
  
  if (dateFilter && dateFilter !== 'all') {
    switch (dateFilter) {
      case 'today':
        periodText = `Period: Today (${format(new Date(), 'MMM dd, yyyy')})`;
        break;
      case 'yesterday':
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        periodText = `Period: Yesterday (${format(yesterday, 'MMM dd, yyyy')})`;
        break;
      case 'this-week':
        periodText = 'Period: This Week';
        break;
      case 'last-week':
        periodText = 'Period: Last Week';
        break;
      case 'this-month':
        periodText = `Period: This Month (${format(new Date(), 'MMMM yyyy')})`;
        break;
      case 'last-month':
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        periodText = `Period: Last Month (${format(lastMonth, 'MMMM yyyy')})`;
        break;
      case 'this-year':
        periodText = `Period: This Year (${format(new Date(), 'yyyy')})`;
        break;
      case 'custom':
        if (customDateRange?.from && customDateRange?.to) {
          periodText = `Period: ${format(customDateRange.from, 'MMM dd, yyyy')} - ${format(customDateRange.to, 'MMM dd, yyyy')}`;
        } else if (customDateRange?.from) {
          periodText = `Period: From ${format(customDateRange.from, 'MMM dd, yyyy')}`;
        } else if (customDateRange?.to) {
          periodText = `Period: Until ${format(customDateRange.to, 'MMM dd, yyyy')}`;
        } else {
          periodText = 'Period: Custom Range';
        }
        break;
      default:
        periodText = 'Period: All Time';
    }
  } else {
    periodText = 'Period: All Time';
  }
  
  doc.text(periodText, margin, yPosition);
  
  // Generation date
  yPosition += 6;
  doc.setFontSize(10);
  doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, margin, yPosition);
  
  yPosition += 10;

  // Calculate totals
  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  // Draw table manually using pure jsPDF vector graphics
  const tableStartY = yPosition;
  const rowHeight = 6;
  const headerHeight = 8;
  
  // Define column widths and positions
  const columns = [
    { header: 'Date', width: 25, x: margin },
    { header: 'Description', width: 65, x: margin + 25 },
    { header: 'Category', width: 30, x: margin + 90 },
    { header: `Amount (${currency})`, width: 30, x: margin + 120 },
    { header: 'Payment', width: 30, x: margin + 150 },
    { header: 'Person', width: 35, x: margin + 180 },
    { header: 'Cash', width: 20, x: margin + 215 },
    { header: 'Receipt', width: 20, x: margin + 235 }
  ];

  // Draw table header
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, tableStartY, pageWidth - 2 * margin, headerHeight, 'F');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  
  columns.forEach(col => {
    doc.text(col.header, col.x + 2, tableStartY + 6);
  });

  // Draw header border
  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 0, 0);
  doc.rect(margin, tableStartY, pageWidth - 2 * margin, headerHeight);

  // Draw table data
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  let currentY = tableStartY + headerHeight;
  const maxRowsPerPage = Math.floor((pageHeight - currentY - 20) / rowHeight);
  
  expenses.forEach((expense, index) => {
    // Check if we need a new page
    if (index > 0 && index % maxRowsPerPage === 0) {
      doc.addPage();
      currentY = margin;
      
      // Redraw header on new page
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, currentY, pageWidth - 2 * margin, headerHeight, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      
      columns.forEach(col => {
        doc.text(col.header, col.x + 2, currentY + 6);
      });
      
      doc.rect(margin, currentY, pageWidth - 2 * margin, headerHeight);
      currentY += headerHeight;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
    }

    // Alternate row colors
    if (index % 2 === 1) {
      doc.setFillColor(248, 248, 248);
      doc.rect(margin, currentY, pageWidth - 2 * margin, rowHeight, 'F');
    }

    // Draw row data
    const rowData = [
      format(expense.date, 'MM/dd/yyyy'),
      expense.description.length > 30 ? expense.description.substring(0, 27) + '...' : expense.description,
      expense.category || '-',
      formatCurrency(expense.amount),
      expense.paymentMethod?.substring(0, 12) || '-',
      expense.personInCharge?.substring(0, 15) || '-',
      expense.cashAccountId ? 'Yes' : 'No',
      expense.receiptImage ? 'Yes' : 'No'
    ];

    columns.forEach((col, colIndex) => {
      const text = rowData[colIndex];
      const textX = col.x + 2;
      
      // Right align amount column
      if (colIndex === 3) {
        const textWidth = doc.getTextWidth(text);
        doc.text(text, col.x + col.width - textWidth - 2, currentY + 4.5);
      } else {
        doc.text(text, textX, currentY + 4.5);
      }
    });

    // Draw row border
    doc.setLineWidth(0.1);
    doc.rect(margin, currentY, pageWidth - 2 * margin, rowHeight);

    currentY += rowHeight;
  });

  // Add summary
  currentY += 8;
  
  // Check if summary fits on current page
  if (currentY + 25 > pageHeight - margin) {
    doc.addPage();
    currentY = margin + 12;
  }

  // Summary section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', margin, currentY);
  
  currentY += 12;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const summaryData = [
    ['Total Expenses:', expenses.length.toString()],
    ['Total Amount:', formatCurrency(totalAmount)],
    ['With Receipts:', expenses.filter(e => e.receiptImage).length.toString()],
    ['Cash Linked:', expenses.filter(e => e.cashAccountId).length.toString()]
  ];

  summaryData.forEach((row, index) => {
    const y = currentY + (index * 5);
    doc.setFont('helvetica', 'bold');
    doc.text(row[0], margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(row[1], margin + 50, y);
  });

  // Add page numbers and watermark to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin - 20,
      pageHeight - 10
    );
    
    // Add watermark
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text(
      'Created By Gonza Systems',
      margin,
      pageHeight - 5
    );
    doc.setTextColor(0, 0, 0); // Reset color
  }

  // Save the PDF
  const fileName = `expenses_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
};