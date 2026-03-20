import { Sale, BusinessSettings } from '@/types';
import { formatNumber } from '@/lib/utils';
import { format } from 'date-fns';
import { generateVectorPDF } from './generateVectorPDF';

/**
 * Generate PDF report from sales data using vector-based approach
 */
export const exportToPDF = (
  sales: Sale[], 
  currency: string = 'USD',
  businessSettings?: BusinessSettings
): void => {
  // Create a temporary container for the report
  const container = document.createElement('div');
  container.style.padding = '20px';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.fontSize = '12px';
  container.style.lineHeight = '1.4';
  container.style.color = '#000';
  container.style.backgroundColor = '#fff';
  
  // Business header with logo if available
  const headerContainer = document.createElement('div');
  headerContainer.style.display = 'flex';
  headerContainer.style.justifyContent = 'space-between';
  headerContainer.style.alignItems = 'flex-start';
  headerContainer.style.marginBottom = '20px';
  
  if (businessSettings) {
    // Logo section
    const logoSection = document.createElement('div');
    logoSection.style.flex = '0 0 auto';
    logoSection.style.marginRight = '20px';
    
    if (businessSettings.businessLogo) {
      const logo = document.createElement('img');
      logo.src = businessSettings.businessLogo;
      logo.style.maxHeight = '80px';
      logo.style.maxWidth = '200px';
      logo.style.marginBottom = '10px';
      logoSection.appendChild(logo);
    }
    
    // Business information section
    const businessInfo = document.createElement('div');
    businessInfo.style.flex = '1';
    businessInfo.style.textAlign = 'right';
    
    const businessName = document.createElement('h2');
    businessName.textContent = businessSettings.businessName;
    businessName.style.margin = '0 0 5px 0';
    businessName.style.color = '#333';
    businessName.style.fontSize = '24px';
    businessName.style.fontWeight = 'bold';
    businessInfo.appendChild(businessName);
    
    const businessAddress = document.createElement('p');
    businessAddress.textContent = businessSettings.businessAddress;
    businessAddress.style.margin = '0 0 3px 0';
    businessAddress.style.fontSize = '14px';
    businessInfo.appendChild(businessAddress);
    
    const businessContact = document.createElement('p');
    businessContact.textContent = `${businessSettings.businessPhone} | ${businessSettings.businessEmail}`;
    businessContact.style.margin = '0';
    businessContact.style.fontSize = '14px';
    businessInfo.appendChild(businessContact);
    
    headerContainer.appendChild(logoSection);
    headerContainer.appendChild(businessInfo);
  } else {
    // Default business name if no settings provided
    const defaultName = document.createElement('h2');
    defaultName.textContent = 'Business Sales Report';
    defaultName.style.margin = '0';
    defaultName.style.color = '#333';
    headerContainer.appendChild(defaultName);
  }
  
  container.appendChild(headerContainer);
  
  // Add horizontal line separator
  const separator = document.createElement('hr');
  separator.style.border = 'none';
  separator.style.height = '2px';
  separator.style.backgroundColor = '#000000';
  separator.style.margin = '10px 0 20px 0';
  container.appendChild(separator);
  
  // Add report title
  const title = document.createElement('h1');
  title.textContent = 'Sales Report';
  title.style.textAlign = 'center';
  title.style.marginBottom = '20px';
  title.style.color = '#333';
  title.style.fontSize = '28px';
  container.appendChild(title);
  
  // Add generation date
  const dateDiv = document.createElement('div');
  dateDiv.textContent = `Generated on: ${format(new Date(), 'MM/dd/yyyy')}`;
  dateDiv.style.textAlign = 'right';
  dateDiv.style.marginBottom = '20px';
  dateDiv.style.fontSize = '12px';
  container.appendChild(dateDiv);
  
  // Create table wrapper with horizontal scrolling
  const tableWrapper = document.createElement('div');
  tableWrapper.style.width = '100%';
  tableWrapper.style.maxWidth = '100%';
  
  // Create table with improved styling for vector PDF
  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.marginBottom = '20px';
  table.style.fontSize = '11px';
  table.style.border = '2px solid #000';
  
  // Add table header
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr style="background-color: #f3f4f6; font-weight: bold;">
      <th style="padding: 8px; border: 1px solid #000000; text-align: left; width: 10%;">Date</th>
      <th style="padding: 8px; border: 1px solid #000000; text-align: left; width: 12%;">Receipt #</th>
      <th style="padding: 8px; border: 1px solid #000000; text-align: left; width: 13%;">Customer</th>
      <th style="padding: 8px; border: 1px solid #000000; text-align: left; width: 13%;">Item</th>
      <th style="padding: 8px; border: 1px solid #000000; text-align: right; width: 8%;">Total Qty</th>
      <th style="padding: 8px; border: 1px solid #000000; text-align: right; width: 11%;">Subtotal (${currency})</th>
      <th style="padding: 8px; border: 1px solid #000000; text-align: right; width: 10%;">Tax (${currency})</th>
      <th style="padding: 8px; border: 1px solid #000000; text-align: right; width: 11%;">Total (${currency})</th>
      <th style="padding: 8px; border: 1px solid #000000; text-align: right; width: 10%;">Profit (${currency})</th>
      <th style="padding: 8px; border: 1px solid #000000; text-align: center; width: 8%;">Status</th>
    </tr>
  `;
  table.appendChild(thead);
  
  // Add table body with sales data
  const tbody = document.createElement('tbody');
  
  let totalAmount = 0;
  let totalProfit = 0;
  
  sales.forEach(sale => {
    const totalQuantity = sale.items.reduce((total, item) => total + item.quantity, 0);
    
    // Calculate subtotal, tax and total
    const subtotal = sale.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    const taxRate = sale.taxRate || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const saleTotal = subtotal + taxAmount;
    
    totalAmount += saleTotal;
    totalProfit += sale.profit;
    
    // Create item description
    let itemsDescription = "No items";
    if (sale.items && Array.isArray(sale.items) && sale.items.length > 0) {
      itemsDescription = sale.items[0].description;
      if (sale.items.length > 1) {
        itemsDescription += ` (+${sale.items.length - 1} more)`;
      }
    }
    
    // Payment status styling
    let statusStyle = '';
    if (sale.paymentStatus === 'Paid') {
      statusStyle = 'color: green;';
    } else if (sale.paymentStatus === 'Quote') {
      statusStyle = 'color: purple;';
    } else {
      statusStyle = 'color: orange;';
    }
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td style="padding: 6px; border: 1px solid #000000;">${format(new Date(sale.date), 'MM/dd/yyyy')}</td>
      <td style="padding: 6px; border: 1px solid #000000;">${sale.receiptNumber}</td>
      <td style="padding: 6px; border: 1px solid #000000; overflow-wrap: break-word;">${sale.customerName}</td>
      <td style="padding: 6px; border: 1px solid #000000; overflow-wrap: break-word;">${itemsDescription}</td>
      <td style="padding: 6px; border: 1px solid #000000; text-align: right;">${totalQuantity}</td>
      <td style="padding: 6px; border: 1px solid #000000; text-align: right;">${formatNumber(subtotal)}</td>
      <td style="padding: 6px; border: 1px solid #000000; text-align: right;">${formatNumber(taxAmount)}</td>
      <td style="padding: 6px; border: 1px solid #000000; text-align: right;">${formatNumber(saleTotal)}</td>
      <td style="padding: 6px; border: 1px solid #000000; text-align: right;">${formatNumber(sale.profit)}</td>
      <td style="padding: 6px; border: 1px solid #000000; text-align: center; ${statusStyle}">${sale.paymentStatus}</td>
    `;
    tbody.appendChild(row);
  });
  
  table.appendChild(tbody);
  tableWrapper.appendChild(table);
  container.appendChild(tableWrapper);
  
  // Add summary section with improved styling
  const summary = document.createElement('div');
  summary.style.marginTop = '30px';
  summary.style.paddingTop = '15px';
  summary.style.borderTop = '2px solid #000000';
  summary.style.maxWidth = '350px';
  summary.style.marginLeft = 'auto';
  
  // Count sales by status
  const paidSalesCount = sales.filter(sale => sale.paymentStatus === 'Paid').length;
  const pendingSalesCount = sales.filter(sale => sale.paymentStatus === 'NOT PAID').length;
  const quotesCount = sales.filter(sale => sale.paymentStatus === 'Quote').length;
  
  // Create a grid layout for the summary
  const summaryGrid = document.createElement('div');
  summaryGrid.style.display = 'grid';
  summaryGrid.style.gridTemplateColumns = '1fr 1fr';
  summaryGrid.style.gap = '5px 15px';
  summaryGrid.style.alignItems = 'center';
  
  // Style for labels and values
  const labelStyle = 'text-align: right; font-weight: bold; color: #333; font-size: 14px;';
  const valueStyle = 'text-align: left; font-size: 14px;';
  
  // Add summary data
  summaryGrid.innerHTML = `
    <div style="${labelStyle}">Total Sales:</div>
    <div style="${valueStyle}">${sales.length}</div>
    
    <div style="${labelStyle}">Total Amount:</div>
    <div style="${valueStyle}">${currency} ${formatNumber(totalAmount)}</div>
    
    <div style="${labelStyle}">Total Profit:</div>
    <div style="${valueStyle}">${currency} ${formatNumber(totalProfit)}</div>
    
    <div style="${labelStyle}">Paid Sales:</div>
    <div style="${valueStyle}">${paidSalesCount}</div>
    
    <div style="${labelStyle}">Pending Sales:</div>
    <div style="${valueStyle}">${pendingSalesCount}</div>
    
    <div style="${labelStyle}">Quotes:</div>
    <div style="${valueStyle}">${quotesCount}</div>
  `;
  
  summary.appendChild(summaryGrid);
  container.appendChild(summary);
  
  // Append to document body temporarily and generate vector PDF
  document.body.appendChild(container);
  
  // Generate vector PDF with better quality
  const reportPrefix = 'sales_report';
  const fileName = `${reportPrefix}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  
  generateVectorPDF(container, {
    filename: fileName,
    orientation: 'landscape',
    format: 'a4',
    margins: { top: 10, right: 10, bottom: 10, left: 10 }
  }).then(() => {
    // Remove the container after PDF generation
    document.body.removeChild(container);
  }).catch((error) => {
    console.error('Error generating PDF:', error);
    document.body.removeChild(container);
  });
};
