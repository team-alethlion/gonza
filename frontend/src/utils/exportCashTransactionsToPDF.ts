
import { CashTransaction } from '@/types/cash';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

export const exportCashTransactionsToPDF = (
  transactions: CashTransaction[],
  getAccountName: (accountId: string | null) => string,
  formatCurrency: (amount: number) => string,
  accountName?: string,
  openingBalance: number = 0,
  currency: string = 'USD',
  dateRange?: { from: Date | undefined; to: Date | undefined },
  businessSettings?: {
    businessName: string;
    businessAddress: string;
    businessPhone: string;
    businessEmail: string;
  }
) => {
  if (transactions.length === 0) {
    alert('No transactions to export');
    return;
  }

  // Sort transactions chronologically (latest first) for display
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateComparison = b.date.getTime() - a.date.getTime();
    if (dateComparison !== 0) return dateComparison;
    // If dates are the same, sort by creation time (latest first)
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  // For balance calculation, we need to sort chronologically (oldest first)
  const chronologicalTransactions = [...transactions].sort((a, b) => {
    const dateComparison = a.date.getTime() - b.date.getTime();
    if (dateComparison !== 0) return dateComparison;
    // If dates are the same, sort by creation time
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  // Calculate totals
  const totalCashIn = chronologicalTransactions
    .filter(t => t.transactionType === 'cash_in')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalCashOut = chronologicalTransactions
    .filter(t => t.transactionType === 'cash_out')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalTransferIn = chronologicalTransactions
    .filter(t => t.transactionType === 'transfer_in')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalTransferOut = chronologicalTransactions
    .filter(t => t.transactionType === 'transfer_out')
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate running balance for each transaction based on chronological order
  let runningBalance = openingBalance;
  const balanceMap = new Map<string, number>();
  
  chronologicalTransactions.forEach(transaction => {
    if (transaction.transactionType === 'cash_in') {
      runningBalance += transaction.amount;
    } else if (transaction.transactionType === 'cash_out') {
      runningBalance -= transaction.amount;
    } else if (transaction.transactionType === 'transfer_in') {
      runningBalance += transaction.amount;
    } else if (transaction.transactionType === 'transfer_out') {
      runningBalance -= transaction.amount;
    }
    balanceMap.set(transaction.id, runningBalance);
  });

  // Helper function to format transaction type for display
  const formatTransactionType = (type: string) => {
    switch (type) {
      case 'cash_in':
        return 'Cash In';
      case 'cash_out':
        return 'Cash Out';
      case 'transfer_in':
        return 'Transfer In';
      case 'transfer_out':
        return 'Transfer Out';
      default:
        return type;
    }
  };

  // Prepare display data with correct balances for sorted (latest first) transactions
  const transactionsWithBalance = sortedTransactions.map(transaction => {
    return { 
      ...transaction, 
      balance: balanceMap.get(transaction.id) || 0,
      formattedType: formatTransactionType(transaction.transactionType)
    };
  });

  const accountBalance = runningBalance;

  // Create new PDF document in portrait orientation
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margins = { top: 15, right: 15, bottom: 15, left: 15 };
  const contentWidth = pageWidth - margins.left - margins.right;
  
  let currentY = margins.top;

  // Function to add watermark to current page
  const addWatermark = () => {
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(150, 150, 150); // Light gray color
    pdf.text('Created By Gonza Systems', pageWidth / 2, pageHeight - 10, { align: 'center' });
    pdf.setTextColor(0, 0, 0); // Reset to black
  };

  // Table setup with new column widths for portrait format including Amount
  const colWidths = [30, 55, 35, 30, 30]; // Date, Description, Transaction Type, Amount, Balance
  const rowHeight = 8;
  const headerHeight = 10;

  // Table headers
  const headers = [
    'Date',
    'Description',
    'Transaction Type',
    'Amount',
    'Balance'
  ];

  // Function to draw table headers
  const drawTableHeaders = () => {
    // Draw header background
    pdf.setFillColor(243, 244, 246);
    pdf.rect(margins.left, currentY - 2, contentWidth, headerHeight, 'F');

    // Draw header borders
    pdf.setLineWidth(0.3);
    pdf.rect(margins.left, currentY - 2, contentWidth, headerHeight);

    // Header text
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    let currentX = margins.left;
    
    headers.forEach((header, index) => {
      const colWidth = colWidths[index];
      const textWidth = pdf.getTextWidth(header);
      const textX = currentX + (colWidth - textWidth) / 2;
      pdf.text(header, textX, currentY + 6);
      
      if (index < headers.length - 1) {
        pdf.line(currentX + colWidth, currentY - 2, currentX + colWidth, currentY + headerHeight - 2);
      }
      
      currentX += colWidth;
    });

    currentY += headerHeight;
  };

  // Helper function to check if we need a new page
  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - margins.bottom - 15) { // Reserve space for watermark
      addWatermark(); // Add watermark to current page before creating new one
      pdf.addPage();
      currentY = margins.top;
      drawTableHeaders(); // Add headers to new page
      // Reset font to normal after drawing headers on new page
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      return true;
    }
    return false;
  };

  // Header section with business details on left and title on right
  const headerStartY = currentY;
  
  // Business details on the left
  if (businessSettings) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(businessSettings.businessName, margins.left, currentY);
    currentY += 6;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(businessSettings.businessAddress, margins.left, currentY);
    currentY += 5;
    pdf.text(businessSettings.businessPhone, margins.left, currentY);
    currentY += 5;
    pdf.text(businessSettings.businessEmail, margins.left, currentY);
  }
  
  // Reset currentY to header start for right-aligned content
  currentY = headerStartY;
  
  // Title on the right
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  const title = `Cash Transactions Report (${currency})`;
  const titleWidth = pdf.getTextWidth(title);
  pdf.text(title, pageWidth - margins.right - titleWidth, currentY);
  currentY += 8;

  // Account name if provided - right aligned under title
  if (accountName) {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    const accountText = accountName;
    const accountTextWidth = pdf.getTextWidth(accountText);
    pdf.text(accountText, pageWidth - margins.right - accountTextWidth, currentY);
    currentY += 6;
  }

  // Date range display - right aligned under title/account
  if (dateRange?.from && dateRange?.to) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    const fromDate = format(dateRange.from, 'dd/MM/yyyy');
    const toDate = format(dateRange.to, 'dd/MM/yyyy');
    
    const dateText = fromDate === toDate ? fromDate : `${fromDate} - ${toDate}`;
    const dateWidth = pdf.getTextWidth(dateText);
    pdf.text(dateText, pageWidth - margins.right - dateWidth, currentY);
    currentY += 12;
  } else {
    // If no date range is provided, determine from transaction dates or use today's date
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    
    let dateText: string;
    if (transactions.length > 0) {
      // Find the earliest and latest transaction dates
      const dates = transactions.map(t => t.date);
      const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const latestDate = new Date(Math.max(...dates.map(d => d.getTime())));
      
      const fromDateStr = format(earliestDate, 'dd/MM/yyyy');
      const toDateStr = format(latestDate, 'dd/MM/yyyy');
      
      dateText = fromDateStr === toDateStr ? fromDateStr : `${fromDateStr} - ${toDateStr}`;
    } else {
      // Fallback to current date if no transactions
      dateText = format(new Date(), 'dd/MM/yyyy');
    }
    
    const dateWidth = pdf.getTextWidth(dateText);
    pdf.text(dateText, pageWidth - margins.right - dateWidth, currentY);
    currentY += 12;
  }
  
  // Ensure we have enough space for both sections
  currentY = Math.max(currentY, headerStartY + 25);

  // Draw initial table headers
  checkPageBreak(headerHeight + 10);
  drawTableHeaders();

  // Table data
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);

  // Number formatter without currency symbol
  const numberFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  transactionsWithBalance.forEach((transaction, index) => {
    checkPageBreak(rowHeight + 5);

    // Format amount with negative sign for cash out and transfer out (no currency symbol)
    const isNegativeTransaction = transaction.transactionType === 'cash_out' || transaction.transactionType === 'transfer_out';
    const displayAmount = isNegativeTransaction ? -transaction.amount : transaction.amount;

    const rowData = [
      format(transaction.date, 'dd/MM/yyyy'),
      transaction.description,
      transaction.formattedType,
      numberFormatter.format(displayAmount),
      numberFormatter.format(transaction.balance)
    ];

    // Draw row background (alternating)
    if (index % 2 === 0) {
      pdf.setFillColor(249, 250, 251);
      pdf.rect(margins.left, currentY - 1, contentWidth, rowHeight, 'F');
    }

    // Draw row borders
    pdf.setLineWidth(0.1);
    pdf.rect(margins.left, currentY - 1, contentWidth, rowHeight);

    let currentX = margins.left;
    
    rowData.forEach((data, colIndex) => {
      const colWidth = colWidths[colIndex];
      let text = data;
      
      // For description column, allow truncation but for other columns, ensure full display
      if (colIndex === 1) { // Description column
        while (pdf.getTextWidth(text) > colWidth - 4 && text.length > 3) {
          text = text.substring(0, text.length - 4) + '...';
        }
      } else if (colIndex === 3 || colIndex === 4) { // Amount and Balance columns
        // Use smaller font if needed to fit full amount
        let fontSize = 9;
        pdf.setFontSize(fontSize);
        while (pdf.getTextWidth(text) > colWidth - 4 && fontSize > 6) {
          fontSize -= 0.5;
          pdf.setFontSize(fontSize);
        }
      }
      
      let textX = currentX + 2;
      
      // Right align amount and balance columns
      if (colIndex === 3 || colIndex === 4) {
        const textWidth = pdf.getTextWidth(text);
        textX = currentX + colWidth - textWidth - 2;
      }
      
      // Set all text to black color
      pdf.setTextColor(0, 0, 0);
      
      pdf.text(text, textX, currentY + 5);
      
      // Reset font size
      pdf.setFontSize(9);
      
      if (colIndex < rowData.length - 1) {
        pdf.line(currentX + colWidth, currentY - 1, currentX + colWidth, currentY + rowHeight - 1);
      }
      
      currentX += colWidth;
    });

    currentY += rowHeight;
  });

  // Summary section
  currentY += 10;
  checkPageBreak(35);

  // Summary title
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Summary', margins.left, currentY);
  currentY += 8;

  // Draw summary box
  const summaryBoxHeight = 30;
  const summaryBoxWidth = contentWidth * 0.9;
  
  pdf.setFillColor(248, 249, 250);
  pdf.rect(margins.left, currentY - 3, summaryBoxWidth, summaryBoxHeight, 'F');
  pdf.setLineWidth(0.3);
  pdf.setDrawColor(200, 200, 200);
  pdf.rect(margins.left, currentY - 3, summaryBoxWidth, summaryBoxHeight);

  // Summary data in columns without currency symbols
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  
  const leftColumn = [
    ['Opening Balance:', numberFormatter.format(openingBalance)],
    ['Total Cash In:', numberFormatter.format(totalCashIn)],
    ['Total Cash Out:', numberFormatter.format(totalCashOut)],
    ['Final Balance:', numberFormatter.format(accountBalance)]
  ];

  const rightColumn = [
    ['Total Transfer In:', numberFormatter.format(totalTransferIn)],
    ['Total Transfer Out:', numberFormatter.format(totalTransferOut)]
  ];

  let summaryY = currentY + 3;
  const leftColumnX = margins.left + 10;
  const rightColumnX = margins.left + summaryBoxWidth / 2 + 10;

  // Draw left column
  leftColumn.forEach(([label, value]) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, leftColumnX, summaryY);
    pdf.setFont('helvetica', 'normal');
    const labelWidth = pdf.getTextWidth(label);
    pdf.text(value, leftColumnX + labelWidth + 5, summaryY);
    summaryY += 6;
  });

  // Reset Y for right column
  summaryY = currentY + 3;

  // Draw right column
  rightColumn.forEach(([label, value]) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, rightColumnX, summaryY);
    pdf.setFont('helvetica', 'normal');
    const labelWidth = pdf.getTextWidth(label);
    pdf.text(value, rightColumnX + labelWidth + 5, summaryY);
    summaryY += 6;
  });

  // Add watermark to the final page
  addWatermark();

  // Generate filename based on report date range
  let filename: string;
  const accountPrefix = accountName ? accountName.replace(/[^a-z0-9]/gi, '-').toLowerCase() + '-' : '';
  
  if (dateRange?.from && dateRange?.to) {
    const fromDate = format(dateRange.from, 'yyyy-MM-dd');
    const toDate = format(dateRange.to, 'yyyy-MM-dd');
    
    if (fromDate === toDate) {
      filename = `cash-transactions-${accountPrefix}${fromDate}.pdf`;
    } else {
      filename = `cash-transactions-${accountPrefix}${fromDate}_to_${toDate}.pdf`;
    }
  } else {
    // Fallback to current date if no range provided
    filename = `cash-transactions-${accountPrefix}${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  }

  pdf.save(filename);
};
