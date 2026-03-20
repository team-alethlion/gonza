
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Customer } from '@/types';
import { Sale } from '@/types';
import { BusinessSettings } from '@/types';
import { format } from 'date-fns';
import { formatNumber } from '@/lib/utils';
// Note: installment_payments table logic is being deprecated/removed in this migration step
// or handled via general finance/sale actions if implemented.

export const generatePaymentReminderPDF = async (
  customer: Customer,
  unpaidSales: Sale[],
  totalAmountDue: number,
  settings: BusinessSettings,
  customMessage?: string,
  outputType: 'save' | 'blob' | 'dataurl' = 'save'
): Promise<string | Blob | void> => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;

    // Function to add watermark to current page
    const addWatermark = () => {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 150, 150); // Light gray color
      doc.text('Created By Gonza Systems', pageWidth / 2, pageHeight - 10, { align: 'center' });
      doc.setTextColor(0, 0, 0); // Reset to black
    };

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT REMINDER NOTICE', pageWidth / 2, 30, { align: 'center' });

    // Business details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    let yPos = 50;

    doc.text(settings.businessName, margin, yPos);
    yPos += 6;
    doc.text(settings.businessAddress, margin, yPos);
    yPos += 6;
    doc.text(`Phone: ${settings.businessPhone}`, margin, yPos);
    yPos += 6;
    doc.text(`Email: ${settings.businessEmail}`, margin, yPos);
    yPos += 15;

    // Date and customer info
    doc.text(`Date: ${format(new Date(), 'MMMM d, yyyy')}`, pageWidth - margin - 60, 50, { align: 'left' });

    doc.setFont('helvetica', 'bold');
    doc.text('TO:', margin, yPos);
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.text(customer.fullName, margin, yPos);
    yPos += 6;

    if (customer.phoneNumber) {
      doc.text(`Phone: ${customer.phoneNumber}`, margin, yPos);
      yPos += 6;
    }

    if (customer.email) {
      doc.text(`Email: ${customer.email}`, margin, yPos);
      yPos += 6;
    }

    if (customer.location) {
      doc.text(`Address: ${customer.location}`, margin, yPos);
      yPos += 6;
    }

    yPos += 15;

    // Reminder message
    doc.setFont('helvetica', 'normal');
    doc.text(`Dear ${customer.fullName},`, margin, yPos);
    yPos += 8;

    // Use custom message if provided, otherwise use default
    const reminderText = customMessage || 'Our records show that you have pending payments for the following items purchased on credit. We kindly request you to complete payment at your earliest convenience.\n\nPlease reach out to us if you need any assistance or clarification.';

    const splitText = doc.splitTextToSize(reminderText, pageWidth - 2 * margin);
    doc.text(splitText, margin, yPos);
    yPos += splitText.length * 6 + 10;

    const tableHeaders = ['Invoice #', 'Product Name', 'Qty', 'Price', 'Total', 'Sale Date', 'Sale Total'];

    // Prepare table data
    const allItems = unpaidSales.flatMap(sale => {
      const saleTotal = sale.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
      const taxAmount = saleTotal * ((sale.taxRate || 0) / 100);
      const totalWithTax = saleTotal + taxAmount;

      return sale.items.map(item => [
        sale.receiptNumber,
        item.description,
        item.quantity.toString(),
        `${settings.currency} ${formatNumber(item.price)}`,
        `${settings.currency} ${formatNumber(item.price * item.quantity)}`,
        format(sale.date, 'MMM d, yyyy'),
        `${settings.currency} ${formatNumber(totalWithTax)}`
      ]);
    });

    // Add total row
    allItems.push([
      '', '', '', '', 'TOTAL OUTSTANDING:', `${settings.currency} ${formatNumber(totalAmountDue)}`, ''
    ]);

    // Create table using autoTable
    autoTable(doc, {
      startY: yPos,
      head: [tableHeaders],
      body: allItems,
      theme: 'grid',
      headStyles: {
        fillColor: [255, 145, 77], // Orange color
        textColor: 255,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 10
      },
      didParseCell: function (data: any) {
        if (data.row.index === allItems.length - 1) {
          data.cell.styles.fillColor = [255, 200, 150];
          data.cell.styles.fontStyle = 'bold';
        }
      },
      margin: { left: margin, right: margin }
    });

    // Footer message
    const finalY = (doc as any).lastAutoTable.finalY + 20;

    doc.setFont('helvetica', 'bold');
    doc.text('Thank you for your continued support.', margin, finalY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`${settings.businessName} - Payment Reminder`, margin, finalY + 15);

    // Add watermark
    addWatermark();

    const fileName = `Payment_Reminder_${customer.fullName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;

    if (outputType === 'blob') {
      return doc.output('blob');
    } else if (outputType === 'dataurl') {
      return doc.output('datauristring');
    } else {
      doc.save(fileName);
    }
  } catch (error) {
    console.error('Error generating payment reminder PDF:', error);
    throw new Error('Failed to generate payment reminder PDF');
  }
};
