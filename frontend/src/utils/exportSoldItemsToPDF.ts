import { formatCashCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

interface SoldItem {
  description: string;
  totalQuantity: number;
  averagePrice: number;
  totalAmount: number;
  totalCost?: number;
  totalProfit?: number;
  totalDiscount?: number;
}

export const exportSoldItemsToPDF = (
  soldItems: SoldItem[], 
  period: string, 
  currency: string = 'USD', 
  costOnlyMode: boolean = false,
  dateRange?: { from: Date | undefined; to: Date | undefined },
  businessSettings?: {
    businessName: string;
    businessAddress: string;
    businessPhone: string;
    businessEmail: string;
  }
) => {
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

  // Table setup - adjusted column widths based on mode
  const colWidths = costOnlyMode 
    ? [60, 30, 40, 40] // Item, Quantity, Avg Cost, Total Cost
    : [38, 18, 22, 22, 20, 20, 20]; // Item, Quantity, Avg Price, Total, Discount, Cost, Profit
  const rowHeight = 8;
  const headerHeight = 10;

  // Table headers based on mode
  const headers = costOnlyMode
    ? ['Item', 'Quantity', 'Avg Cost', 'Total Cost']
    : ['Item', 'Quantity', 'Avg Price', 'Total', 'Discount', 'Cost', 'Profit'];

  // Function to add watermark to current page
  const addWatermark = () => {
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(150, 150, 150); // Light gray color
    pdf.text('Created By Gonza Systems', pageWidth / 2, pageHeight - 10, { align: 'center' });
    pdf.setTextColor(0, 0, 0); // Reset to black
  };

  // Function to draw table headers
  const drawTableHeaders = () => {
    // Draw header background
    pdf.setFillColor(243, 244, 246);
    pdf.rect(margins.left, currentY - 2, contentWidth, headerHeight, 'F');

    // Draw header borders
    pdf.setLineWidth(0.3);
    pdf.rect(margins.left, currentY - 2, contentWidth, headerHeight);

    // Header text
    pdf.setFontSize(10);
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
  const title = costOnlyMode 
    ? `Items Cost Report (${currency})`
    : `Items Sold Report (${currency})`;
  const titleWidth = pdf.getTextWidth(title);
  pdf.text(title, pageWidth - margins.right - titleWidth, currentY);
  currentY += 10;

  // Date range display - right aligned under title
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
    // Fallback to current date if no range provided
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    const dateText = format(new Date(), 'dd/MM/yyyy');
    const dateWidth = pdf.getTextWidth(dateText);
    pdf.text(dateText, pageWidth - margins.right - dateWidth, currentY);
    currentY += 12;
  }
  
  // Ensure we have enough space for both sections
  currentY = Math.max(currentY, headerStartY + 25);

  if (soldItems.length === 0) {
    // No data message
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    const noDataText = 'No items sold in the selected period.';
    const noDataWidth = pdf.getTextWidth(noDataText);
    pdf.text(noDataText, (pageWidth - noDataWidth) / 2, currentY + 30);
  } else {
    // Draw initial table headers
    checkPageBreak(headerHeight + 10);
    drawTableHeaders();

    // Table data
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);

    // Number formatter without currency symbol and no decimal points
    const numberFormatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    soldItems.forEach((item, index) => {
      checkPageBreak(rowHeight + 5);

      const rowData = costOnlyMode
        ? [
            item.description,
            item.totalQuantity.toString(),
            numberFormatter.format((item.totalCost || 0) / item.totalQuantity), // Average cost
            numberFormatter.format(item.totalCost || 0)
          ]
        : [
            item.description,
            item.totalQuantity.toString(),
            numberFormatter.format(item.averagePrice),
            numberFormatter.format(item.totalAmount),
            numberFormatter.format(item.totalDiscount || 0),
            numberFormatter.format(item.totalCost || 0),
            numberFormatter.format(item.totalProfit || 0)
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
        
        // Truncate text if too long
        if (colIndex === 0) { // Item description
          while (pdf.getTextWidth(text) > colWidth - 4 && text.length > 3) {
            text = text.substring(0, text.length - 4) + '...';
          }
        }
        
        let textX = currentX + 2;
        
        // Center align numeric columns (Quantity, Avg Price, Total Amount, Cost Amount, Profit)
        if (colIndex >= 1) {
          const textWidth = pdf.getTextWidth(text);
          textX = currentX + (colWidth - textWidth) / 2;
        }
        
        pdf.text(text, textX, currentY + 5);
        
        if (colIndex < rowData.length - 1) {
          pdf.line(currentX + colWidth, currentY - 1, currentX + colWidth, currentY + rowHeight - 1);
        }
        
        currentX += colWidth;
      });

      currentY += rowHeight;
    });

    // Summary section
    currentY += 10;
    checkPageBreak(45);

    // Summary title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Summary', margins.left, currentY);
    currentY += 8;

    // Calculate totals
    const totalItems = soldItems.length;
    const totalQuantity = soldItems.reduce((sum, item) => sum + item.totalQuantity, 0);
    const totalRevenue = soldItems.reduce((sum, item) => sum + item.totalAmount, 0);
    const totalDiscount = soldItems.reduce((sum, item) => sum + (item.totalDiscount || 0), 0);
    const totalCost = soldItems.reduce((sum, item) => sum + (item.totalCost || 0), 0);
    const totalProfit = soldItems.reduce((sum, item) => sum + (item.totalProfit || 0), 0);

    // Draw summary box - make it wider to accommodate all content properly
    const summaryBoxHeight = costOnlyMode ? 32 : 56;
    const summaryBoxWidth = contentWidth;
    
    pdf.setFillColor(248, 249, 250);
    pdf.rect(margins.left, currentY - 3, summaryBoxWidth, summaryBoxHeight, 'F');
    pdf.setLineWidth(0.3);
    pdf.setDrawColor(200, 200, 200);
    pdf.rect(margins.left, currentY - 3, summaryBoxWidth, summaryBoxHeight);

    // Summary data in columns based on mode
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    
    const summaryData = costOnlyMode
      ? [
          ['Total Items:', totalItems.toString()],
          ['Total Quantity:', totalQuantity.toString()],
          ['Total Cost:', numberFormatter.format(totalCost)]
        ]
      : [
          ['Total Items:', totalItems.toString()],
          ['Total Quantity:', totalQuantity.toString()],
          ['Total Revenue:', numberFormatter.format(totalRevenue)],
          ['Total Discount:', numberFormatter.format(totalDiscount)],
          ['Total Cost:', numberFormatter.format(totalCost)],
          ['Total Profit:', numberFormatter.format(totalProfit)]
        ];

    let summaryY = currentY + 6;
    const summaryX = margins.left + 15;

    summaryData.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, summaryX, summaryY);
      pdf.setFont('helvetica', 'normal');
      const labelWidth = pdf.getTextWidth(label);
      const valueX = summaryX + labelWidth + 5;
      
      // Fixed logic: Ensure the value text stays within the summary box bounds
      const maxX = margins.left + summaryBoxWidth - 15;
      const valueWidth = pdf.getTextWidth(value);
      
      // Check if text would overflow, if so right-align it within bounds
      let finalX;
      if (valueX + valueWidth > maxX) {
        finalX = maxX - valueWidth;
      } else {
        finalX = valueX;
      }
      
      pdf.text(value, finalX, summaryY);
      summaryY += 8;
    });
  }

  // Add watermark to the final page
  addWatermark();

  // Generate filename based on report date range
  let filename: string;
  const modePrefix = costOnlyMode ? 'cost_data_' : '';
  
  if (dateRange?.from && dateRange?.to) {
    const fromDate = format(dateRange.from, 'yyyy-MM-dd');
    const toDate = format(dateRange.to, 'yyyy-MM-dd');
    
    if (fromDate === toDate) {
      filename = `${modePrefix}sold_items_${fromDate}.pdf`;
    } else {
      filename = `${modePrefix}sold_items_${fromDate}_to_${toDate}.pdf`;
    }
  } else {
    // Fallback to current date if no range provided
    filename = `${modePrefix}sold_items_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  }

  pdf.save(filename);
};
