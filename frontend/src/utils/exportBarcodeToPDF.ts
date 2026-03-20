/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Barcode from "react-barcode";
import { createRoot } from "react-dom/client";
import { Product } from "@/types";

interface BarcodeExportOptions {
  productName: string;
  barcodeValue: string;
  price?: number;
  currency?: string;
  showPrice?: boolean;
}

/**
 * Render barcode to canvas and return image data URL
 */
const renderBarcodeToImage = async (
  options: BarcodeExportOptions,
): Promise<string> => {
  const {
    productName,
    barcodeValue,
    price,
    currency = "KES",
    showPrice = true,
  } = options;

  // Create a temporary container
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  container.style.width = "300px"; // Base width for 50mm label
  container.style.padding = "15px";
  container.style.backgroundColor = "white";
  container.style.fontFamily = "Arial, sans-serif";
  document.body.appendChild(container);

  try {
    // Create the barcode container with styling
    const barcodeContainer = document.createElement("div");
    barcodeContainer.style.display = "flex";
    barcodeContainer.style.flexDirection = "column";
    barcodeContainer.style.alignItems = "center";
    barcodeContainer.style.gap = "8px";

    // Product name
    const nameElement = document.createElement("div");
    nameElement.textContent =
      productName.length > 30
        ? productName.substring(0, 27) + "..."
        : productName;
    nameElement.style.fontSize = "14px";
    nameElement.style.fontWeight = "bold";
    nameElement.style.textAlign = "center";
    nameElement.style.maxWidth = "100%";
    nameElement.style.wordWrap = "break-word";
    barcodeContainer.appendChild(nameElement);

    // Barcode SVG container
    const svgContainer = document.createElement("div");
    svgContainer.id = "barcode-svg-container";
    barcodeContainer.appendChild(svgContainer);

    // Price (if applicable)
    if (showPrice && price !== undefined) {
      const priceElement = document.createElement("div");
      priceElement.textContent = `${currency} ${price.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
      priceElement.style.fontSize = "14px";
      priceElement.style.fontWeight = "bold";
      priceElement.style.textAlign = "center";
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
          width: 1.5,
          height: 60,
          fontSize: 12,
        }),
      );
      // Give React time to render
      setTimeout(() => resolve(), 100);
    });

    // Convert to canvas
    const canvas = await html2canvas(container, {
      backgroundColor: "#ffffff",
      scale: 2,
    });

    // Get image data URL
    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.95);

    // Cleanup
    root.unmount();
    document.body.removeChild(container);

    return imageDataUrl;
  } catch (error) {
    document.body.removeChild(container);
    throw error;
  }
};

/**
 * Export a single barcode as a PDF file
 */
export const exportSingleBarcodeToPDF = async (
  options: BarcodeExportOptions,
): Promise<void> => {
  try {
    const imageDataUrl = await renderBarcodeToImage(options);

    // Create PDF
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Add title
    pdf.setFontSize(16);
    pdf.text("Product Barcode", 105, 20, { align: "center" });

    // Add barcode image centered - Fixed 45x30mm
    const imgWidth = 45;
    const imgHeight = 30;
    const x = (210 - imgWidth) / 2; // Center on A4 width (210mm)
    const y = 40;

    pdf.addImage(imageDataUrl, "JPEG", x, y, imgWidth, imgHeight);

    // Save PDF
    const sanitizedName = options.productName
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();
    pdf.save(`barcode_${sanitizedName}_${Date.now()}.pdf`);
  } catch (error) {
    console.error("Error exporting barcode to PDF:", error);
    throw error;
  }
};

/**
 * Export multiple barcodes to a single PDF file
 */
export const exportBulkBarcodesToPDF = async (
  products: Product[],
  options: { showPrice?: boolean; currency?: string } = {},
): Promise<void> => {
  const { showPrice = true, currency = "KES" } = options;

  try {
    // Filter products with barcodes
    const productsWithBarcodes = products.filter((p) => p.barcode);

    if (productsWithBarcodes.length === 0) {
      throw new Error("No products with barcodes to export");
    }

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Layout configuration - Standardized 45x30mm labels
    const labelWidth = 45;
    const labelHeight = 30;
    const spacing = 2; // Reduced spacing for better fit
    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const margin = 10;

    // Calculate how many labels fit across (columns)
    const cols = Math.floor(
      (pageWidth - 2 * margin + spacing) / (labelWidth + spacing),
    );
    // Calculate how many labels fit down (rows)
    const rows = Math.floor(
      (pageHeight - 2 * margin + spacing) / (labelHeight + spacing),
    );

    const itemsPerPage = cols * rows;

    // Calculate centered margins based on calculated grid
    const totalGridWidth = cols * labelWidth + (cols - 1) * spacing;
    const totalGridHeight = rows * labelHeight + (rows - 1) * spacing;

    const marginX = (pageWidth - totalGridWidth) / 2;
    const marginY = (pageHeight - totalGridHeight) / 2;

    let itemCount = 0;

    for (const product of productsWithBarcodes) {
      if (itemCount > 0 && itemCount % itemsPerPage === 0) {
        pdf.addPage();
      }

      const pageIndex = itemCount % itemsPerPage;
      const row = Math.floor(pageIndex / cols);
      const col = pageIndex % cols;

      const x = marginX + col * (labelWidth + spacing);
      const y = marginY + row * (labelHeight + spacing);

      // Render barcode to image
      const imageDataUrl = await renderBarcodeToImage({
        productName: product.name,
        barcodeValue: product.barcode!,
        price: product.sellingPrice,
        currency,
        showPrice,
      });

      // Add border for visual separation (optional)
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(x, y, labelWidth, labelHeight);

      // Add barcode image
      const imgWidth = labelWidth - 4;
      const imgHeight = labelHeight - 4;
      pdf.addImage(imageDataUrl, "JPEG", x + 2, y + 2, imgWidth, imgHeight);

      itemCount++;
    }

    // Add summary on first page
    pdf.setPage(1);
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Total barcodes: ${productsWithBarcodes.length}`, 105, 5, {
      align: "center",
    });

    // Save PDF
    const timestamp = new Date().toISOString().split("T")[0];
    pdf.save(
      `barcodes_bulk_${timestamp}_${productsWithBarcodes.length}_items.pdf`,
    );
  } catch (error) {
    console.error("Error exporting bulk barcodes to PDF:", error);
    throw error;
  }
};
