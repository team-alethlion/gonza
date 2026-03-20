
/**
 * Triggers the device's native print functionality
 * Works on iOS, Android, and desktop browsers
 */
export const directPrint = (element: HTMLElement, documentName?: string, isThermal?: boolean): void => {
  // Create a new window for printing
  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    // Fallback: use current window print if popup is blocked
    window.print();
    return;
  }

  // Get all stylesheets from the current document
  const stylesheets = Array.from(document.styleSheets);
  let stylesHtml = '';

  // Include all CSS rules
  stylesheets.forEach(stylesheet => {
    try {
      if (stylesheet.href) {
        // External stylesheet
        stylesHtml += `<link rel="stylesheet" href="${stylesheet.href}">`;
      } else if (stylesheet.cssRules) {
        // Inline stylesheet
        stylesHtml += '<style>';
        Array.from(stylesheet.cssRules).forEach(rule => {
          stylesHtml += rule.cssText;
        });
        stylesHtml += '</style>';
      }
    } catch (e) {
      // Some stylesheets might not be accessible due to CORS
      console.warn('Could not access stylesheet:', e);
    }
  });

  // Use the provided document name or default to "Print"
  const title = documentName || 'Print';

  // Thermal-specific CSS for single-sheet printing
  const thermalCSS = isThermal ? `
    @page { 
      size: 80mm auto; 
      margin: 0; 
    }
    .thermal-receipt { 
      font-size: 14px !important; 
      font-weight: 800 !important;
      padding: 8px !important;
      page-break-after: avoid !important;
    }
    .thermal-receipt .font-extrabold { 
      font-weight: 900 !important; 
    }
    .thermal-receipt .font-bold { 
      font-weight: 800 !important; 
    }
  ` : '';

  // Create the print document
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${stylesHtml}
        <style>
          @media print {
            body { margin: 0; }
            .print\\:hidden { display: none !important; }
            ${thermalCSS}
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: ${isThermal ? '0' : '20px'};
          }
        </style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();

  // Track if we've already handled the cleanup
  let cleanupHandled = false;

  // Cleanup function to avoid duplicate redirects
  const handleCleanup = () => {
    if (cleanupHandled) return;
    cleanupHandled = true;

    try {
      if (!printWindow.closed) {
        printWindow.close();
      }
    } catch (error) {
      console.warn('Could not close print window:', error);
    }

    // No redirect needed - user stays on current page after printing
  };

  // Wait for content to load, then trigger print
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();

    // Listen for when the print dialog is closed
    printWindow.onafterprint = () => {
      handleCleanup();
    };

    // Listen for beforeunload to detect cancel scenarios
    printWindow.onbeforeunload = () => {
      if (!cleanupHandled) {
        setTimeout(handleCleanup, 100);
      }
    };

    // Reduced timeout for better UX - close after 1.5 seconds
    setTimeout(() => {
      handleCleanup();
    }, 1500);
  };

  // Error handling for window load failure
  printWindow.onerror = () => {
    console.warn('Print window failed to load');
    handleCleanup();
  };
};
