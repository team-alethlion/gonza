import { ReceiptData } from "@/types/receipt";

interface VectorPDFOptions {
  filename?: string;
  orientation?: "portrait" | "landscape";
  format?: "a4" | "letter";
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  returnBlob?: boolean;
  saleId?: string;
}

/**
 * Generates a receipt PDF.
 * Prioritizes backend generation if saleId is provided.
 * Falls back to client-side generation otherwise.
 */
export const generateReceiptVectorPDF = async (
  receiptData: ReceiptData,
  options: VectorPDFOptions,
): Promise<void | Blob> => {
  const {
    filename = `Receipt-${receiptData.receiptNumber}.pdf`,
    returnBlob = false,
    saleId
  } = options;

  // 1. Try Backend Generation
  if (saleId) {
    try {
      const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || "http://127.0.0.1:8000/api";
      const response = await fetch(`${DJANGO_API_URL}/sales/sales/${saleId}/receipt_pdf/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        
        if (returnBlob) {
          return blob;
        }

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        return;
      }
    } catch (error) {
      console.error('Backend PDF generation failed:', error);
    }
  }

  // 2. Fallback to Client-side (jspdf)
  try {
    const jsPDF = (await import("jspdf")).default;
    const pdf = new jsPDF({
      orientation: options.orientation || "portrait",
      unit: "mm",
      format: options.format || "a4",
      compress: true,
    });

    // Simple fallback layout
    pdf.setFontSize(20);
    pdf.text(receiptData.businessName || "Receipt", 10, 20);
    pdf.setFontSize(12);
    pdf.text(`Receipt #: ${receiptData.receiptNumber}`, 10, 30);
    pdf.text(`Date: ${receiptData.date}`, 10, 37);
    pdf.text(`Customer: ${receiptData.customerName}`, 10, 44);
    
    pdf.line(10, 50, 200, 50);
    
    let y = 60;
    pdf.text("Items:", 10, y);
    y += 10;
    
    receiptData.items.forEach((item) => {
        pdf.text(`${item.description} x ${item.quantity}`, 15, y);
        pdf.text(`${item.amount.toLocaleString()}`, 180, y, { align: 'right' });
        y += 7;
    });
    
    pdf.line(10, y, 200, y);
    y += 10;
    pdf.setFont("helvetica", "bold");
    pdf.text(`TOTAL: ${receiptData.totalAmount.toLocaleString()}`, 180, y, { align: 'right' });

    if (returnBlob) {
      return pdf.output("blob");
    }

    pdf.save(filename);
  } catch (error) {
    console.error('Client-side PDF generation failed:', error);
    throw error;
  }
};
