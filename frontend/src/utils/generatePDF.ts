import { generateReceiptVectorPDF } from './generateReceiptVectorPDF';
import { isIOS } from './deviceDetection';
import { ReceiptData } from '@/types/receipt';

interface PDFOptions {
  autoPrint?: boolean;
  isReceipt?: boolean;
}

// Legacy function for non-receipt PDFs (keeping image-based approach for now)
const generateImagePDF = async (element: HTMLElement, filename: string, options: PDFOptions = {}) => {
  const { generateVectorPDF } = await import('./generateVectorPDF');
  await generateVectorPDF(element, {
    filename,
    orientation: 'landscape',
    format: 'a4',
    margins: { top: 10, right: 10, bottom: 10, left: 10 }
  });
};

export const generatePDF = async (
  element: HTMLElement, 
  filename: string, 
  options: PDFOptions = {}
): Promise<void> => {
  const { autoPrint = false, isReceipt = false } = options;

  try {
    if (isIOS()) {
      // For iOS, use the original approach
      await generateImagePDF(element, filename, options);
    } else {
      // For receipts, we'll need to extract data from the element
      // For now, fall back to image-based approach for non-receipt PDFs
      if (!isReceipt) {
        await generateImagePDF(element, filename, options);
      } else {
        // This will be handled by the PrintableReceipt component
        // which will call generateReceiptVectorPDF directly with structured data
        await generateImagePDF(element, filename, options);
      }

      if (autoPrint) {
        setTimeout(() => {
          window.print();
        }, 500);
      }
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

// Export the new vector PDF function for direct use
export { generateReceiptVectorPDF };
