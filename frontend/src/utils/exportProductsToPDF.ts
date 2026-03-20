import { Product, BusinessSettings } from '@/types';
import jsPDF from 'jspdf';
import { formatNumber } from '@/lib/utils';

export const exportProductsToPDF = (products: Product[], businessSettings?: BusinessSettings): void => {
  // Use provided business settings or fallback to defaults
  const settings = businessSettings || {
    businessName: 'Your Business',
    businessAddress: 'Business Address',
    businessPhone: '(123) 456-7890',
    businessEmail: 'support@yourbusiness.com',
    currency: 'USD'
  };

  // Create new PDF document in portrait orientation
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margins = { top: 10, right: 10, bottom: 10, left: 10 };
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

  // Optimized table setup with better column widths for more content
  const colWidths = [20, 55, 30, 25, 25, 25]; // Item #, Name, Category, Qty, Cost, Price
  const rowHeight = 6;
  const headerHeight = 8;

  // Table headers
  const headers = [
    'Item #',
    'Product Name',
    'Category',
    'Qty',
    `Cost (${settings.currency})`,
    `Price (${settings.currency})`
  ];

  // Function to draw table headers
  const drawTableHeaders = () => {
    // Draw header background
    pdf.setFillColor(243, 244, 246);
    pdf.rect(margins.left, currentY - 1, contentWidth, headerHeight, 'F');

    // Draw header borders
    pdf.setLineWidth(0.2);
    pdf.rect(margins.left, currentY - 1, contentWidth, headerHeight);

    // Header text
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    let currentX = margins.left;

    headers.forEach((header, index) => {
      const colWidth = colWidths[index];
      const textWidth = pdf.getTextWidth(header);
      const textX = currentX + (colWidth - textWidth) / 2;
      pdf.text(header, textX, currentY + 5);

      if (index < headers.length - 1) {
        pdf.line(currentX + colWidth, currentY - 1, currentX + colWidth, currentY + headerHeight - 1);
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
      drawTableHeaders();
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      return true;
    }
    return false;
  };

  // Business header - made smaller
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  const businessName = settings.businessName || 'Your Business';
  const businessNameWidth = pdf.getTextWidth(businessName);
  pdf.text(businessName, (pageWidth - businessNameWidth) / 2, currentY);
  currentY += 4;

  // Business address - smaller
  if (settings.businessAddress) {
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const addressWidth = pdf.getTextWidth(settings.businessAddress);
    pdf.text(settings.businessAddress, (pageWidth - addressWidth) / 2, currentY);
    currentY += 3;
  }

  // Business contact info - smaller
  if (settings.businessPhone || settings.businessEmail) {
    pdf.setFontSize(8);
    const contactInfo = [settings.businessPhone, settings.businessEmail].filter(Boolean).join(' | ');
    const contactWidth = pdf.getTextWidth(contactInfo);
    pdf.text(contactInfo, (pageWidth - contactWidth) / 2, currentY);
    currentY += 3;
  }

  currentY += 3;

  // Report title - smaller
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  const title = `Products Inventory Report`;
  const titleWidth = pdf.getTextWidth(title);
  pdf.text(title, (pageWidth - titleWidth) / 2, currentY);
  currentY += 4;

  // Generation date - smaller
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  const currentDate = new Date().toLocaleDateString();
  const dateText = `Generated on ${currentDate}`;
  const dateWidth = pdf.getTextWidth(dateText);
  pdf.text(dateText, (pageWidth - dateWidth) / 2, currentY);
  currentY += 6;

  // Summary statistics - smaller and more compact
  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => p.quantity > 0 && p.quantity <= p.minimumStock).length;
  const outOfStockProducts = products.filter(p => p.quantity === 0).length;
  const totalInventoryValue = products.reduce((sum, product) => sum + (product.costPrice * product.quantity), 0);

  // Compact summary box
  const summaryBoxHeight = 15;
  pdf.setFillColor(248, 249, 250);
  pdf.rect(margins.left, currentY - 2, contentWidth, summaryBoxHeight, 'F');
  pdf.setLineWidth(0.2);
  pdf.setDrawColor(200, 200, 200);
  pdf.rect(margins.left, currentY - 2, contentWidth, summaryBoxHeight);

  // Summary content - more compact
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Inventory Summary', margins.left + 5, currentY + 2);

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  const summaryData = [
    `Total: ${totalProducts}`,
    `Low Stock: ${lowStockProducts}`,
    `Out of Stock: ${outOfStockProducts}`,
    `Total Value: ${settings.currency} ${formatNumber(totalInventoryValue)}`
  ];

  let summaryY = currentY + 6;
  summaryData.forEach((item, index) => {
    const xPos = margins.left + 5 + (index % 2) * (contentWidth / 2);
    if (index === 2) summaryY += 3;
    pdf.text(item, xPos, summaryY + Math.floor(index / 2) * 3);
  });

  currentY += summaryBoxHeight + 4;

  // Draw initial table headers
  checkPageBreak(headerHeight + 5);
  drawTableHeaders();

  // Table data with smaller font - use products as provided (already sorted)
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);

  products.forEach((product, index) => {
    checkPageBreak(rowHeight + 2);

    const rowData = [
      product.itemNumber || '',
      product.name || '',
      product.category || '',
      product.quantity.toString(),
      formatNumber(product.costPrice),
      formatNumber(product.sellingPrice)
    ];

    // Draw row background (alternating)
    if (index % 2 === 0) {
      pdf.setFillColor(249, 250, 251);
      pdf.rect(margins.left, currentY - 1, contentWidth, rowHeight, 'F');
    }

    // Highlight low stock and out of stock items
    if (product.quantity === 0) {
      pdf.setFillColor(254, 226, 226); // red background
      pdf.rect(margins.left, currentY - 1, contentWidth, rowHeight, 'F');
    } else if (product.quantity <= product.minimumStock) {
      pdf.setFillColor(254, 243, 199); // yellow background
      pdf.rect(margins.left, currentY - 1, contentWidth, rowHeight, 'F');
    }

    // Draw row borders
    pdf.setLineWidth(0.1);
    pdf.rect(margins.left, currentY - 1, contentWidth, rowHeight);

    let currentX = margins.left;

    rowData.forEach((data, colIndex) => {
      const colWidth = colWidths[colIndex];
      let text = data;

      // Truncate text if too long - more aggressive truncation
      if (colIndex === 1) { // Product name column
        while (pdf.getTextWidth(text) > colWidth - 3 && text.length > 3) {
          text = text.substring(0, text.length - 4) + '...';
        }
      } else if (colIndex === 2) { // Category column
        while (pdf.getTextWidth(text) > colWidth - 3 && text.length > 3) {
          text = text.substring(0, text.length - 4) + '...';
        }
      }

      let textX = currentX + 1.5;

      // Right align quantity and price columns
      if (colIndex >= 3) {
        const textWidth = pdf.getTextWidth(text);
        textX = currentX + colWidth - textWidth - 1.5;
      }

      pdf.setTextColor(0, 0, 0);
      pdf.text(text, textX, currentY + 3.5);

      if (colIndex < rowData.length - 1) {
        pdf.line(currentX + colWidth, currentY - 1, currentX + colWidth, currentY + rowHeight - 1);
      }

      currentX += colWidth;
    });

    currentY += rowHeight;
  });

  // Footer - smaller
  currentY += 5;
  checkPageBreak(10);

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(100, 100, 100);
  const footerText = `This report contains ${products.length} products. Generated by ${settings.businessName || 'Inventory System'}`;
  const footerWidth = pdf.getTextWidth(footerText);
  pdf.text(footerText, (pageWidth - footerWidth) / 2, currentY);

  // Add watermark to the final page
  addWatermark();

  // Save the PDF
  const filename = `products-inventory-${new Date().toISOString().slice(0, 10)}.pdf`;
  pdf.save(filename);
};
