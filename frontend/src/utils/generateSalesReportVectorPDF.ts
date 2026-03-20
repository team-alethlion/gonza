import jsPDF from 'jspdf';
import { format } from 'date-fns';

interface SaleData {
  receipt_number: string;
  customer_name: string | null;
  total_amount: number;
  payment_status: string;
  created_at: string;
  sale_date: string;
  items: Array<{
    product_name: string;
    quantity: number;
    price: number;
    total: number;
    discount_amount?: number;
    discount_percentage?: number;
    discount_type?: 'percentage' | 'amount';
  }>;
}

export const generateSalesReportVectorPDF = (
  salesData: SaleData[],
  period: string,
  currency: string = 'USD',
  dateRange?: { from: Date | undefined; to: Date | undefined },
  businessSettings?: {
    businessName: string;
    businessAddress: string;
    businessPhone: string;
    businessEmail: string;
  }
) => {
  const pdf = new jsPDF({
    orientation: 'landscape',
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
    pdf.setTextColor(150, 150, 150);
    pdf.text('Created By Gonza Systems', pageWidth / 2, pageHeight - 10, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
  };

  // Adjusted table setup with optimized column widths to accommodate larger Total values
  const colWidths = [18, 20, 28, 45, 16, 20, 22, 18, 20, 18, 28]; // Receipt, Date, Customer, Items, Qty, Unit Price, Subtotal, Discount, Net, Tax, Total
  const rowHeight = 8;
  const headerHeight = 12;

  // Enhanced table headers with discount
  const headers = ['Receipt #', 'Date', 'Customer', 'Items', 'Qty', 'Unit Price', 'Subtotal', 'Discount', 'Net', 'Tax', 'Total'];

  // Function to draw table headers
  const drawTableHeaders = () => {
    pdf.setFillColor(243, 244, 246);
    pdf.rect(margins.left, currentY - 2, contentWidth, headerHeight, 'F');
    pdf.setLineWidth(0.3);
    pdf.rect(margins.left, currentY - 2, contentWidth, headerHeight);

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    let currentX = margins.left;
    
    headers.forEach((header, index) => {
      const colWidth = colWidths[index];
      const textWidth = pdf.getTextWidth(header);
      const textX = currentX + (colWidth - textWidth) / 2;
      pdf.text(header, textX, currentY + 7);
      
      if (index < headers.length - 1) {
        pdf.line(currentX + colWidth, currentY - 2, currentX + colWidth, currentY + headerHeight - 2);
      }
      
      currentX += colWidth;
    });

    currentY += headerHeight;
  };

  // Helper function to check if we need a new page
  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - margins.bottom - 15) {
      addWatermark();
      pdf.addPage();
      currentY = margins.top;
      drawTableHeaders();
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
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
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  const title = `Comprehensive Sales Report (${currency})`;
  const titleWidth = pdf.getTextWidth(title);
  pdf.text(title, pageWidth - margins.right - titleWidth, currentY);
  currentY += 12;

  // Date range display - right aligned under title
  if (dateRange?.from && dateRange?.to) {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    const fromDate = format(dateRange.from, 'dd/MM/yyyy');
    const toDate = format(dateRange.to, 'dd/MM/yyyy');
    
    const dateText = fromDate === toDate ? fromDate : `${fromDate} - ${toDate}`;
    const dateWidth = pdf.getTextWidth(dateText);
    pdf.text(dateText, pageWidth - margins.right - dateWidth, currentY);
    currentY += 15;
  } else {
    // Fallback to current date if no range provided
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    const dateText = format(new Date(), 'dd/MM/yyyy');
    const dateWidth = pdf.getTextWidth(dateText);
    pdf.text(dateText, pageWidth - margins.right - dateWidth, currentY);
    currentY += 15;
  }
  
  // Ensure we have enough space for both sections
  currentY = Math.max(currentY, headerStartY + 25);

  if (salesData.length === 0) {
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'normal');
    const noDataText = 'No sales data available for the selected period.';
    const noDataWidth = pdf.getTextWidth(noDataText);
    pdf.text(noDataText, (pageWidth - noDataWidth) / 2, currentY + 30);
  } else {
    // Draw initial table headers
    checkPageBreak(headerHeight + 10);
    drawTableHeaders();

    // Table data
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);

    const numberFormatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      useGrouping: true // Add thousand separators for better readability
    });

    let globalRowIndex = 0;

    salesData.forEach((sale) => {
      // Calculate sale-level totals for tax rate calculation (tax applies to net amount after discount)
      const saleSubtotal = sale.items.reduce((sum, item) => sum + item.total, 0);
      const saleDiscounts = sale.items.reduce((sum, item) => sum + (item.discount_amount || 0), 0);  
      const saleNetAmount = saleSubtotal - saleDiscounts;
      const saleTaxAmount = sale.total_amount - saleNetAmount;
      const taxRate = saleNetAmount > 0 ? saleTaxAmount / saleNetAmount : 0;
      
      // Display each item as a separate row with individual calculations
      sale.items.forEach((item, itemIndex) => {
        checkPageBreak(rowHeight + 5);

        // Calculate discount amount
        const discountAmount = item.discount_amount || 0;
        const netAmount = item.total - discountAmount;

        // Calculate item-level tax and total (tax applies after discount)
        const itemTax = netAmount * taxRate;
        const itemTotal = netAmount + itemTax;

        const rowData = [
          itemIndex === 0 ? sale.receipt_number : '', // Only show receipt number on first item
          itemIndex === 0 ? format(new Date(sale.sale_date), 'dd/MM/yyyy') : '', // Only show date on first item
          itemIndex === 0 ? (sale.customer_name || 'Walk-in') : '', // Only show customer on first item
          item.product_name, // Show individual product name
          item.quantity.toString(), // Show individual item quantity
          numberFormatter.format(item.price), // Show individual item price
          numberFormatter.format(item.total), // Show individual item subtotal
          discountAmount > 0 ? numberFormatter.format(discountAmount) : '-', // Show discount amount
          numberFormatter.format(netAmount), // Show net amount after discount
          numberFormatter.format(itemTax), // Show individual item tax
          numberFormatter.format(itemTotal) // Show individual item total including tax
        ];

        // Draw row background (alternating by sale, not by item)
        if (globalRowIndex % 2 === 0) {
          pdf.setFillColor(249, 250, 251);
          pdf.rect(margins.left, currentY - 1, contentWidth, rowHeight, 'F');
        }

        pdf.setLineWidth(0.1);
        pdf.rect(margins.left, currentY - 1, contentWidth, rowHeight);

        let currentX = margins.left;
        
        rowData.forEach((data, colIndex) => {
          const colWidth = colWidths[colIndex];
          let text = data;
          
          // Truncate text if too long for specific columns
          if (colIndex === 2) { // Customer name
            while (pdf.getTextWidth(text) > colWidth - 4 && text.length > 3) {
              text = text.substring(0, text.length - 4) + '...';
            }
          } else if (colIndex === 3) { // Items - allow more space due to adjusted width
            while (pdf.getTextWidth(text) > colWidth - 4 && text.length > 5) {
              text = text.substring(0, text.length - 4) + '...';
            }
          } else if (colIndex >= 4) { // Numeric columns - ensure they fit
            while (pdf.getTextWidth(text) > colWidth - 4 && text.length > 3) {
              // For numeric values, try shortening by removing thousand separators first
              if (text.includes(',')) {
                text = text.replace(/,/g, '');
              } else {
                text = text.substring(0, text.length - 1);
              }
            }
          }
          
          let textX = currentX + 2;
          
          // Right align numeric columns (Qty, Unit Price, Subtotal, Discount, Net, Tax, Total)
          if (colIndex >= 4) {
            const textWidth = pdf.getTextWidth(text);
            textX = currentX + colWidth - textWidth - 2;
          }
          
          pdf.text(text, textX, currentY + 5);
          
          if (colIndex < rowData.length - 1) {
            pdf.line(currentX + colWidth, currentY - 1, currentX + colWidth, currentY + rowHeight - 1);
          }
          
          currentX += colWidth;
        });

        currentY += rowHeight;
      });

      globalRowIndex++;
    });

    // Enhanced Summary section
    currentY += 15;
    checkPageBreak(60);

    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Comprehensive Sales Summary', margins.left, currentY);
    currentY += 10;

    // Calculate enhanced totals and analytics including discounts
    const totalSales = salesData.length;
    const totalAmount = salesData.reduce((sum, sale) => sum + sale.total_amount, 0);
    const totalSubtotal = salesData.reduce((sum, sale) => 
      sum + sale.items.reduce((itemSum, item) => itemSum + item.total, 0), 0);
    const totalDiscounts = salesData.reduce((sum, sale) => 
      sum + sale.items.reduce((itemSum, item) => itemSum + (item.discount_amount || 0), 0), 0);
    const totalNetAmount = totalSubtotal - totalDiscounts;
    const totalTax = totalAmount - totalNetAmount; // Tax calculated on net amount
    const totalItems = salesData.reduce((sum, sale) => 
      sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
    
    const paidSales = salesData.filter(sale => sale.payment_status.toLowerCase() === 'paid').length;
    const pendingSales = salesData.filter(sale => sale.payment_status.toLowerCase() === 'not paid').length;
    const quoteSales = salesData.filter(sale => sale.payment_status.toLowerCase() === 'quote').length;
    const installmentSales = salesData.filter(sale => sale.payment_status.toLowerCase() === 'installment sale').length;
    
    const avgSaleValue = totalSales > 0 ? totalAmount / totalSales : 0;
    const avgItemsPerSale = totalSales > 0 ? totalItems / totalSales : 0;
    const taxRate = totalNetAmount > 0 ? (totalTax / totalNetAmount) * 100 : 0;
    const avgDiscountPerSale = totalSales > 0 ? totalDiscounts / totalSales : 0;
    const discountRate = totalSubtotal > 0 ? (totalDiscounts / totalSubtotal) * 100 : 0;

    // Draw enhanced summary box (increased height for discount info)
    const summaryBoxHeight = 60;
    const summaryBoxWidth = contentWidth;
    
    pdf.setFillColor(248, 249, 250);
    pdf.rect(margins.left, currentY - 3, summaryBoxWidth, summaryBoxHeight, 'F');
    pdf.setLineWidth(0.3);
    pdf.setDrawColor(200, 200, 200);
    pdf.rect(margins.left, currentY - 3, summaryBoxWidth, summaryBoxHeight);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    // Left column
    const leftColumn = [
      ['Total Sales:', totalSales.toString()],
      ['Total Items Sold:', totalItems.toString()],
      ['Average Items/Sale:', avgItemsPerSale.toFixed(1)],
      ['Paid Sales:', paidSales.toString()],
      ['Pending Sales:', pendingSales.toString()],
      ['Avg Discount/Sale:', numberFormatter.format(avgDiscountPerSale)]
    ];

    // Right column
    const rightColumn = [
      ['Total Amount:', numberFormatter.format(totalAmount)],
      ['Subtotal (before discount):', numberFormatter.format(totalSubtotal)],
      ['Total Discounts:', numberFormatter.format(totalDiscounts)],
      ['Net Amount (after discount):', numberFormatter.format(totalNetAmount)],
      ['Total Tax:', numberFormatter.format(totalTax)],
      ['Discount Rate:', `${discountRate.toFixed(1)}%`]
    ];

    let summaryY = currentY + 6;
    const leftX = margins.left + 15;
    const rightX = margins.left + (contentWidth / 2) + 15;

    // Draw left column
    leftColumn.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, leftX, summaryY);
      pdf.setFont('helvetica', 'normal');
      const labelWidth = pdf.getTextWidth(label);
      pdf.text(value, leftX + labelWidth + 5, summaryY);
      summaryY += 7;
    });

    // Reset Y for right column
    summaryY = currentY + 6;

    // Draw right column
    rightColumn.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, rightX, summaryY);
      pdf.setFont('helvetica', 'normal');
      const labelWidth = pdf.getTextWidth(label);
      pdf.text(value, rightX + labelWidth + 5, summaryY);
      summaryY += 7;
    });

    // Payment Status Breakdown
    if (quoteSales > 0 || installmentSales > 0) {
      currentY += summaryBoxHeight + 10;
      checkPageBreak(25);
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Payment Status Breakdown', margins.left, currentY);
      currentY += 8;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const statusBreakdown = [
        [`Quotes: ${quoteSales}`, `Installment Sales: ${installmentSales}`]
      ];
      
      statusBreakdown.forEach(([left, right]) => {
        pdf.text(left, leftX, currentY);
        pdf.text(right, rightX, currentY);
        currentY += 6;
      });
    }
  }

  addWatermark();

  // Generate filename based on report date range
  let filename: string;
  if (dateRange?.from && dateRange?.to) {
    const fromDate = format(dateRange.from, 'yyyy-MM-dd');
    const toDate = format(dateRange.to, 'yyyy-MM-dd');
    
    if (fromDate === toDate) {
      filename = `sales_report_${fromDate}.pdf`;
    } else {
      filename = `sales_report_${fromDate}_to_${toDate}.pdf`;
    }
  } else {
    // Fallback to current date if no range provided
    filename = `sales_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  }

  pdf.save(filename);
};
