
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { numberToWords } from './numberToWords';

export const generateSubscriptionInvoice = async (payment: any, type: 'receipt' | 'invoice' = 'invoice') => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margins = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = pageWidth - margins.left - margins.right;
    let currentY = margins.top;

    const isReceipt = type === 'receipt';
    const docTitle = isReceipt ? 'SALES RECEIPT' : 'INVOICE';
    const docPrefix = isReceipt ? 'Receipt' : 'Invoice';

    // 1. Logo & Business Info Header
    // Logo on the left
    const logoUrl = '/lovable-uploads/798d07d7-1db7-498c-92f3-6f6346827d59.png';
    try {
        const img = new Image();
        img.src = logoUrl;
        await new Promise((resolve) => {
            img.onload = () => {
                const aspectRatio = img.width / img.height;
                const logoHeight = 20; // Slightly larger logo
                const logoWidth = logoHeight * aspectRatio;
                doc.addImage(img, 'PNG', margins.left, currentY, logoWidth, logoHeight);
                resolve(null);
            };
            img.onerror = () => resolve(null);
        });
    } catch (e) {
        console.warn('Could not load logo for PDF');
    }

    // Business info on the right
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('GONZA BUSINESS SYSTEMS', pageWidth - margins.right, currentY + 5, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Rubaga ROYZ PLAZA room A04', pageWidth - margins.right, currentY + 10, { align: 'right' });
    doc.text('Phone: +256 758519696', pageWidth - margins.right, currentY + 14, { align: 'right' });
    doc.text('Email: gonzasystems@gmail.com', pageWidth - margins.right, currentY + 18, { align: 'right' });

    currentY += 28;

    // 2. Document Title
    doc.setLineWidth(0.5);
    doc.line(margins.left, currentY, pageWidth - margins.right, currentY);
    currentY += 7;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(docTitle, pageWidth / 2, currentY, { align: 'center' });
    currentY += 4;

    doc.line(margins.left, currentY, pageWidth - margins.right, currentY);
    currentY += 10;

    // 3. Document Details
    const invoiceSlug = payment.invoice_number
        ? payment.invoice_number.toString().padStart(4, '0')
        : payment.id.split('-')[0].toUpperCase();

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${docPrefix} #: ${invoiceSlug}`, margins.left, currentY);
    const isPaid = ['completed', 'success'].includes(payment.payment_status?.toLowerCase());
    const statusText = isPaid ? 'Paid' : 'Pending';
    doc.text(`Status: ${statusText}`, pageWidth - margins.right, currentY, { align: 'right' });
    currentY += 5;

    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${format(new Date(payment.created_at), 'MMM dd, yyyy')}`, margins.left, currentY);

    // Add Due Date if provided (important for upcoming invoices)
    if (payment.due_date) {
        doc.text(`Due Date: ${format(new Date(payment.due_date), 'MMM dd, yyyy')}`, pageWidth - margins.right, currentY, { align: 'right' });
    }

    currentY += 5;
    doc.text(`Time: ${format(new Date(payment.created_at), 'hh:mm aa')}`, margins.left, currentY);
    currentY += 10;

    // 4. Customer Information
    doc.setFont('helvetica', 'bold');
    doc.text('Customer Information:', margins.left, currentY);
    currentY += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(payment.business_name || 'Gonzo System User', margins.left, currentY);
    currentY += 12;

    // 5. Items Table
    autoTable(doc, {
        startY: currentY,
        margin: { left: margins.left, right: margins.right },
        head: [['Description', 'Qty', 'Unit Price', 'Amount']],
        body: [
            [
                `${payment.billing_cycle} subscription for gonza system`,
                '1',
                `UGX ${payment.amount.toLocaleString()}`,
                `UGX ${payment.amount.toLocaleString()}`
            ]
        ],
        headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontSize: 10,
            fontStyle: 'bold',
            lineWidth: 0.1,
            lineColor: [200, 200, 200]
        },
        bodyStyles: {
            fontSize: 9,
            lineWidth: 0.1,
            lineColor: [200, 200, 200]
        },
        columnStyles: {
            0: { cellWidth: 80 },
            1: { halign: 'center', cellWidth: 20 },
            2: { halign: 'right', cellWidth: 35 },
            3: { halign: 'right', cellWidth: 35 }
        }
    });

    currentY = (doc as any).lastAutoTable.finalY;

    // 6. Totals Section
    const totalsWidth = 90;
    const totalsX = pageWidth - margins.right - totalsWidth;

    autoTable(doc, {
        startY: currentY,
        margin: { left: totalsX },
        body: [
            ['Subtotal:', `UGX ${payment.amount.toLocaleString()}`],
            ['TOTAL:', `UGX ${payment.amount.toLocaleString()}`]
        ],
        theme: 'plain',
        styles: {
            fontSize: 10,
            cellPadding: 2,
        },
        columnStyles: {
            0: { cellWidth: 45, fontStyle: 'normal' },
            1: { cellWidth: 45, halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: (data) => {
            if (data.row.index === 1) { // Total row
                data.cell.styles.fillColor = [220, 220, 220];
                data.cell.styles.fontSize = 12;
            }
            data.cell.styles.lineWidth = 0.1;
            data.cell.styles.lineColor = [200, 200, 200];
        }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // 7. Amount in Words
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Amount in words:', margins.left, currentY);
    currentY += 5;
    doc.setFont('helvetica', 'italic');
    doc.text(`UGX ${numberToWords(payment.amount)} only`, margins.left, currentY);
    currentY += 15;

    currentY += 5;

    // 9. Footer
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Thank you for your business!', pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Created by Gonza Systems', pageWidth / 2, currentY, { align: 'center' });

    // Save the PDF
    doc.save(`${docPrefix}-GS-${payment.id.split('-')[0].toUpperCase()}.pdf`);
};
