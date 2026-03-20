import { BusinessSettings, Customer } from '@/types';
import jsPDF from 'jspdf';
import { format } from 'date-fns';

interface NoticeData {
  customer: Customer;
  subject: string;
  content: string;
  senderName?: string;
}

export const generateNoticePDF = async (
  noticeData: NoticeData,
  businessSettings: BusinessSettings
): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Function to add watermark to current page
  const addWatermark = () => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150); // Light gray color
    doc.text('Created By Gonza Systems', pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.setTextColor(0, 0, 0); // Reset to black
  };

  try {
    // Set default font
    doc.setFont('helvetica', 'normal');

    // Helper function to check if we need a new page
    const checkPageBreak = (requiredSpace: number): void => {
      if (yPosition + requiredSpace > pageHeight - margin - 15) { // Reserve space for watermark
        addWatermark(); // Add watermark to current page before creating new one
        doc.addPage();
        yPosition = margin;
      }
    };

    // Helper function to add text with proper word wrapping and page breaks
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 11): number => {
      doc.setFontSize(fontSize);
      const splitText = doc.splitTextToSize(text, maxWidth);

      splitText.forEach((line: string) => {
        // Check if we need a new page before adding the line
        checkPageBreak(6); // 6 units space needed for a line

        doc.text(line, x, yPosition);
        yPosition += 5; // Line spacing
      });

      return yPosition;
    };

    // Business Header with Logo on left and details on right
    // Business Logo on the left (if available)
    if (businessSettings.businessLogo) {
      try {
        // Create a temporary image to get actual dimensions
        const img = new Image();
        img.src = businessSettings.businessLogo;

        // Wait for image to load to get dimensions
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          // If already loaded (cached), resolve immediately
          if (img.complete) resolve(img);
        });

        // Calculate proper dimensions maintaining aspect ratio
        const maxLogoWidth = 40;
        const maxLogoHeight = 20;
        const aspectRatio = img.width / img.height;

        let logoWidth = maxLogoWidth;
        let logoHeight = logoWidth / aspectRatio;

        // If height exceeds max, scale down based on height
        if (logoHeight > maxLogoHeight) {
          logoHeight = maxLogoHeight;
          logoWidth = logoHeight * aspectRatio;
        }

        // Add logo on the left
        doc.addImage(businessSettings.businessLogo, 'JPEG', margin, yPosition, logoWidth, logoHeight);
      } catch (error) {
        console.error('Error adding business logo:', error);
      }
    }

    // Business Details on the right with right alignment
    const rightMargin = pageWidth - margin;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(businessSettings.businessName || 'Business Name', rightMargin, yPosition + 5, { align: 'right' });

    // Add spacing between business name and details
    yPosition += 12;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    if (businessSettings.businessAddress) {
      const addressLines = doc.splitTextToSize(businessSettings.businessAddress, 80);
      addressLines.forEach((line: string, index: number) => {
        doc.text(line, rightMargin, yPosition + (index * 4), { align: 'right' });
      });
      yPosition += (addressLines.length * 4) - 4;
    }

    if (businessSettings.businessPhone) {
      yPosition += 4;
      doc.text(`Phone: ${businessSettings.businessPhone}`, rightMargin, yPosition, { align: 'right' });
    }

    if (businessSettings.businessEmail) {
      yPosition += 4;
      doc.text(`Email: ${businessSettings.businessEmail}`, rightMargin, yPosition, { align: 'right' });
    }

    yPosition += 8;

    // Horizontal line under the header
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 15;

    // Date
    checkPageBreak(15);
    doc.setFontSize(11);
    const currentDate = format(new Date(), 'MMMM d, yyyy');
    doc.text(`Date: ${currentDate}`, margin, yPosition);
    yPosition += 12;

    // Customer Address Block
    checkPageBreak(25);
    doc.setFont('helvetica', 'bold');
    doc.text(noticeData.customer.fullName || 'Valued Customer', margin, yPosition);
    yPosition += 5;

    doc.setFont('helvetica', 'normal');
    if (noticeData.customer.location) {
      yPosition = addWrappedText(noticeData.customer.location, margin, yPosition, pageWidth - 2 * margin, 11);
      yPosition += 2;
    }

    if (noticeData.customer.email) {
      checkPageBreak(8);
      doc.text(noticeData.customer.email, margin, yPosition);
      yPosition += 5;
    }

    yPosition += 8;

    // Subject Line
    if (noticeData.subject) {
      checkPageBreak(15);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      yPosition = addWrappedText(`Re: ${noticeData.subject}`, margin, yPosition, pageWidth - 2 * margin, 12);
      yPosition += 6;
    }

    // Salutation
    checkPageBreak(15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Dear ${noticeData.customer.fullName || 'Valued Customer'},`, margin, yPosition);
    yPosition += 8;

    // Main Content - Split by paragraphs and handle page breaks
    if (noticeData.content) {
      const paragraphs = noticeData.content.split('\n\n').filter(p => p.trim() !== '');

      paragraphs.forEach((paragraph, index) => {
        // Estimate space needed for this paragraph
        const estimatedLines = Math.ceil(paragraph.length / 80); // Rough estimate
        const estimatedSpace = estimatedLines * 5 + 10; // Line height + some padding

        checkPageBreak(estimatedSpace);

        yPosition = addWrappedText(paragraph.trim(), margin, yPosition, pageWidth - 2 * margin, 11);

        // Add smaller gap between paragraphs (only if not the last paragraph)
        if (index < paragraphs.length - 1) {
          yPosition += 6;
        }
      });

      yPosition += 10;
    }

    // Closing and signature section
    checkPageBreak(60); // Reserve space for closing, signature, and sender info

    doc.text('Yours faithfully,', margin, yPosition);
    yPosition += 20; // Space for signature

    // Signature (if available from business settings)
    if (businessSettings.signature) {
      try {
        // Create a temporary image to get actual dimensions for signature
        const sigImg = new Image();
        sigImg.src = businessSettings.signature;

        // Wait for signature image to load to get dimensions
        await new Promise((resolve, reject) => {
          sigImg.onload = resolve;
          sigImg.onerror = reject;
          // If already loaded (cached), resolve immediately
          if (sigImg.complete) resolve(sigImg);
        });

        // Calculate proper dimensions maintaining aspect ratio for signature
        const maxSigWidth = 50;
        const maxSigHeight = 25;
        const sigAspectRatio = sigImg.width / sigImg.height;

        let signatureWidth = maxSigWidth;
        let signatureHeight = signatureWidth / sigAspectRatio;

        // If height exceeds max, scale down based on height
        if (signatureHeight > maxSigHeight) {
          signatureHeight = maxSigHeight;
          signatureWidth = signatureHeight * sigAspectRatio;
        }

        // Add signature
        doc.addImage(businessSettings.signature, 'JPEG', margin, yPosition, signatureWidth, signatureHeight);
        yPosition += signatureHeight + 5;
      } catch (error) {
        console.error('Error adding signature:', error);
        yPosition += 15; // Add space even if signature fails
      }
    } else {
      yPosition += 15; // Add space for manual signature
    }

    // Sender name and business
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const senderName = noticeData.senderName || businessSettings.businessName || 'Management';
    doc.text(senderName, margin, yPosition);
    yPosition += 5;

    if (businessSettings.businessName && noticeData.senderName) {
      doc.setFont('helvetica', 'normal');
      doc.text(businessSettings.businessName, margin, yPosition);
    }

    // Add watermark to the final page
    addWatermark();

    // Generate filename
    const customerName = noticeData.customer.fullName?.replace(/[^a-zA-Z0-9]/g, '_') || 'Customer';
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const filename = `Notice_${customerName}_${dateStr}.pdf`;

    // Save the PDF
    doc.save(filename);

  } catch (error) {
    console.error('Error generating notice PDF:', error);
    throw new Error('Failed to generate notice PDF. Please try again.');
  }
};
