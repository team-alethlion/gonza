import jsPDF from 'jspdf';
import { Customer } from '@/hooks/useCustomers';
import { format } from 'date-fns';

export const exportCustomersToPDF = (
  customers: Customer[],
  getCategoryName: (categoryId: string | null) => string,
  currency?: string,
  businessName?: string,
  businessLogo?: string
) => {
  if (customers.length === 0) {
    alert('No customers to export');
    return;
  }

  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const lineHeight = 6;
  let yPosition = margin;

  // Add header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(businessName || 'Business Name', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(14);
  doc.text('Customer Report', margin, yPosition);
  yPosition += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${format(new Date(), 'MMMM dd, yyyy')}`, margin, yPosition);
  yPosition += 4;
  doc.text(`Currency: ${currency || 'UGX'}`, margin, yPosition);
  yPosition += 10;

  // Summary section
  const totalCustomers = customers.length;
  const categoryCounts: Record<string, number> = {};
  
  customers.forEach(customer => {
    const categoryName = getCategoryName(customer.categoryId || null);
    categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
  });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary:', margin, yPosition);
  yPosition += lineHeight;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Customers: ${totalCustomers}`, margin + 5, yPosition);
  yPosition += lineHeight;

  // Category breakdown
  Object.entries(categoryCounts).forEach(([category, count]) => {
    doc.text(`${category}: ${count}`, margin + 5, yPosition);
    yPosition += lineHeight;
  });

  yPosition += 5;

  // Table headers
  const headers = ['Name', 'Phone', 'Email', 'Gender', 'Location', 'Birthday', 'Category', 'Lifetime Value', 'Orders'];
  const columnWidths = [30, 20, 30, 12, 25, 18, 20, 25, 15];
  const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
  const startX = (pageWidth - tableWidth) / 2;

  // Function to add page if needed
  const checkPageBreak = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      
      // Add table title on new page
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Customer List', margin, yPosition);
      yPosition += 8;
      
      // Add table header on new page
      drawTableHeader();
      
      return true;
    }
    return false;
  };

  // Function to draw table header
  const drawTableHeader = () => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(startX, yPosition, tableWidth, 8, 'F');

    let xPosition = startX;
    headers.forEach((header, index) => {
      doc.text(header, xPosition + 2, yPosition + 5);
      xPosition += columnWidths[index];
    });
    yPosition += 8;
  };

  // Add initial table title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Customer List', margin, yPosition);
  yPosition += 8;

  // Draw table header
  checkPageBreak(15);
  drawTableHeader();

  // Draw table rows
  doc.setFont('helvetica', 'normal');
  customers.forEach((customer, index) => {
    checkPageBreak(8);

    // Alternate row colors
    if (index % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(startX, yPosition, tableWidth, 6, 'F');
    }

    let xPosition = startX;
    const rowData = [
      customer.fullName || '',
      customer.phoneNumber || '',
      customer.email || '',
      customer.gender || '',
      customer.location || '',
      customer.birthday ? format(new Date(customer.birthday), 'MMM dd') : '',
      getCategoryName(customer.categoryId || null),
      `${currency || 'UGX'} ${(customer.lifetimeValue || 0).toLocaleString()}`,
      (customer.orderCount || 0).toString()
    ];

    rowData.forEach((data, colIndex) => {
      const cellWidth = columnWidths[colIndex];
      const text = data.toString();
      
      // Truncate text if too long
      const maxChars = Math.floor(cellWidth / 2.5);
      const truncatedText = text.length > maxChars ? text.substring(0, maxChars - 3) + '...' : text;
      
      doc.text(truncatedText, xPosition + 2, yPosition + 4);
      xPosition += cellWidth;
    });

    yPosition += 6;
  });

  // Add footer with page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 25, pageHeight - 5);
  }

  // Save the PDF
  const filename = `customers_report_${currency || 'UGX'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(filename);
};