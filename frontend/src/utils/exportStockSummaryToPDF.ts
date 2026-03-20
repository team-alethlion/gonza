import { format } from 'date-fns';

interface StockSummaryData {
  productId: string;
  productName: string;
  itemNumber: string;
  openingStock: number;
  itemsSold: number;
  stockIn: number;
  transferOut: number;
  returnIn: number;
  returnOut: number;
  closingStock: number;
}

/**
 * Exports stock summary to PDF.
 * Proxies the request to the backend if branchId is provided.
 */
export const exportStockSummaryToPDF = async (
  data: StockSummaryData[],
  period: string,
  dateRange?: { from: Date | undefined; to: Date | undefined },
  branchId?: string
) => {
  if (branchId) {
    try {
      const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || "http://127.0.0.1:8000/api";
      const response = await fetch(`${DJANGO_API_URL}/inventory/products/stock_summary_pdf/?branchId=${branchId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const fileName = `Stock_Summary_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        return;
      }
    } catch (error) {
      console.error('Backend stock summary PDF failed:', error);
    }
  }

  // Basic Fallback
  try {
    const jsPDF = (await import('jspdf')).default;
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });
    
    pdf.setFontSize(16);
    pdf.text('Stock Summary Report', 10, 20);
    pdf.setFontSize(10);
    pdf.text(`Period: ${period}`, 10, 30);
    pdf.text(`Generated on: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 10, 37);
    
    pdf.save(`stock-summary-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  } catch (error) {
    console.error('Client-side stock summary fallback failed:', error);
  }
};
