import React from 'react';
import html2canvas from 'html2canvas';
import Barcode from 'react-barcode';
import { createRoot } from 'react-dom/client';

interface BarcodeExportOptions {
    productName: string;
    barcodeValue: string;
    price?: number;
    currency?: string;
    showPrice?: boolean;
}

/**
 * Export a single barcode as a JPEG file
 */
export const exportBarcodeToJPEG = async (options: BarcodeExportOptions): Promise<void> => {
    const { productName, barcodeValue, price, currency = 'KES', showPrice = true } = options;

    // Create a temporary container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '340px'; // Approx 45mm width label (scaled 2x)
    container.style.padding = '20px';
    container.style.backgroundColor = 'white';
    container.style.fontFamily = 'Arial, sans-serif';
    document.body.appendChild(container);

    try {
        // Create the barcode container with styling
        const barcodeContainer = document.createElement('div');
        barcodeContainer.style.display = 'flex';
        barcodeContainer.style.flexDirection = 'column';
        barcodeContainer.style.alignItems = 'center';
        barcodeContainer.style.gap = '10px';

        // Product name
        const nameElement = document.createElement('div');
        nameElement.textContent = productName;
        nameElement.style.fontSize = '18px';
        nameElement.style.fontWeight = 'bold';
        nameElement.style.textAlign = 'center';
        nameElement.style.maxWidth = '100%';
        nameElement.style.wordWrap = 'break-word';
        barcodeContainer.appendChild(nameElement);

        // Barcode SVG container
        const svgContainer = document.createElement('div');
        svgContainer.id = 'barcode-svg-container';
        barcodeContainer.appendChild(svgContainer);

        // Price (if applicable)
        if (showPrice && price !== undefined) {
            const priceElement = document.createElement('div');
            priceElement.textContent = `${currency} ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            priceElement.style.fontSize = '18px';
            priceElement.style.fontWeight = 'bold';
            priceElement.style.textAlign = 'center';
            barcodeContainer.appendChild(priceElement);
        }

        container.appendChild(barcodeContainer);

        // Render the barcode using React
        const root = createRoot(svgContainer);
        await new Promise<void>((resolve) => {
            const BarcodeComponent = Barcode as any;
            root.render(
                React.createElement(BarcodeComponent, {
                    value: barcodeValue,
                    width: 2,
                    height: 80,
                    fontSize: 16
                })
            );
            // Give React time to render
            setTimeout(() => resolve(), 100);
        });

        // Convert to canvas
        const canvas = await html2canvas(container, {
            backgroundColor: '#ffffff',
            scale: 2, // Higher quality
        });

        // Convert canvas to JPEG blob
        canvas.toBlob((blob) => {
            if (blob) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                const sanitizedName = productName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                link.download = `barcode_${sanitizedName}_${Date.now()}.jpg`;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
            }
        }, 'image/jpeg', 0.95);

        // Cleanup
        root.unmount();
    } catch (error) {
        console.error('Error exporting barcode to JPEG:', error);
        throw error;
    } finally {
        // Remove the temporary container
        document.body.removeChild(container);
    }
};
