
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface VectorPDFOptions {
  filename: string;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'letter';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export const generateVectorPDF = async (
  element: HTMLElement,
  options: VectorPDFOptions
): Promise<void> => {
  const {
    filename,
    orientation = 'portrait',
    format = 'a4',
    margins = { top: 10, right: 10, bottom: 10, left: 10 }
  } = options;

  // Create new PDF document
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format,
    compress: true
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margins.left - margins.right;

  try {
    // Convert the element to canvas for measurement and image extraction
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      allowTaint: true
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Check if content fits on one page
    if (imgHeight <= pageHeight - margins.top - margins.bottom) {
      // Single page - add image
      pdf.addImage(imgData, 'JPEG', margins.left, margins.top, imgWidth, imgHeight);
    } else {
      // Multiple pages needed
      let yPosition = 0;
      const pageContentHeight = pageHeight - margins.top - margins.bottom;

      while (yPosition < imgHeight) {
        // Add image section for current page
        pdf.addImage(
          imgData,
          'JPEG',
          margins.left,
          margins.top - yPosition,
          imgWidth,
          imgHeight
        );

        yPosition += pageContentHeight;

        // Add new page if more content exists
        if (yPosition < imgHeight) {
          pdf.addPage();
        }
      }
    }

    // Save the PDF
    pdf.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
};

// Enhanced version specifically for receipts with better text handling
export const generateReceiptVectorPDF = async (
  element: HTMLElement,
  options: VectorPDFOptions
): Promise<void> => {
  const {
    filename,
    orientation = 'portrait',
    format = 'a4',
    margins = { top: 10, right: 10, bottom: 10, left: 10 }
  } = options;

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format,
    compress: true
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margins.left - margins.right;

  try {
    // For receipts, we'll use a higher quality approach
    const canvas = await html2canvas(element, {
      scale: 3, // Higher scale for better quality
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      allowTaint: true,
      height: element.scrollHeight,
      width: element.scrollWidth
    });

    const imgData = canvas.toDataURL('image/png', 1.0); // Use PNG for better quality
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageContentHeight = pageHeight - margins.top - margins.bottom;

    let yPosition = 0;

    while (yPosition < imgHeight) {
      const sourceY = (yPosition / imgHeight) * canvas.height;
      const sourceHeight = Math.min(
        (pageContentHeight / imgHeight) * canvas.height,
        canvas.height - sourceY
      );

      // Create a temporary canvas for this page section
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sourceHeight;
      
      const pageCtx = pageCanvas.getContext('2d');
      if (pageCtx) {
        pageCtx.drawImage(
          canvas,
          0, sourceY,
          canvas.width, sourceHeight,
          0, 0,
          canvas.width, sourceHeight
        );

        const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
        const pageImgHeight = (sourceHeight * imgWidth) / canvas.width;

        pdf.addImage(
          pageImgData,
          'PNG',
          margins.left,
          margins.top,
          imgWidth,
          pageImgHeight
        );
      }

      yPosition += pageContentHeight;

      if (yPosition < imgHeight) {
        pdf.addPage();
      }
    }

    pdf.save(filename);
  } catch (error) {
    console.error('Error generating receipt PDF:', error);
    throw new Error('Failed to generate receipt PDF');
  }
};
