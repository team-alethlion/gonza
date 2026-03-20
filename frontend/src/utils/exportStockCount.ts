/* eslint-disable @typescript-eslint/no-explicit-any */
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Product } from "@/types";

interface StockCountExportData {
  product: Product;
  actualStock: number;
  variation: number;
}

export const exportStockCountToCSV = (data: StockCountExportData[]) => {
  const headers = [
    "Product Name",
    "Barcode",
    "System Stock",
    "Actual Stock",
    "Variation",
  ];
  const rows = data.map((item) => [
    item.product.name,
    item.product.barcode || "N/A",
    item.product.quantity.toString(),
    item.actualStock.toString(),
    item.variation.toString(),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `stock_count_${format(new Date(), "yyyy-MM-dd_HHmm")}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportStockCountToPDF = (
  data: StockCountExportData[],
  businessName: string = "Gonza Systems",
  metadata?: {
    auditorName?: string;
    contactPerson?: string;
    auditNumber?: number;
    auditId?: string;
  },
) => {
  const doc = new jsPDF() as any;
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(20);
  const headerText = metadata?.auditId
    ? `Stock Count Report - ${metadata.auditId}`
    : `Stock Count / Audit Report ${
        metadata?.auditNumber ? `#${metadata.auditNumber}` : ""
      }`;
  doc.text(headerText, 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Business: ${businessName}`, 14, 30);
  doc.text(`Date: ${format(new Date(), "PPP p")}`, 14, 36);

  if (metadata?.auditorName || metadata?.contactPerson) {
    let metaY = 42;
    if (metadata.auditorName) {
      doc.text(`Auditor: ${metadata.auditorName}`, 14, metaY);
      metaY += 6;
    }
    if (metadata.contactPerson) {
      doc.text(`Contact Person: ${metadata.contactPerson}`, 14, metaY);
    }
  }

  // Table
  const tableColumn = [
    "Product Name",
    "Barcode",
    "System",
    "Actual",
    "Variation",
  ];
  const tableRows = data.map((item) => [
    item.product.name,
    item.product.barcode || "N/A",
    item.product.quantity.toString(),
    item.actualStock.toString(),
    {
      content:
        item.variation > 0 ? `+${item.variation}` : item.variation.toString(),
      styles: {
        textColor: (item.variation < 0
          ? [220, 38, 38]
          : item.variation > 0
          ? [22, 163, 74]
          : [100, 116, 139]) as [number, number, number],
      },
    },
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: metadata?.auditorName || metadata?.contactPerson ? 55 : 45,
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { top: 45 },
  });

  // Signatures
  const finalY = (doc as any).lastAutoTable.finalY + 25;
  if (finalY < doc.internal.pageSize.getHeight() - 40) {
    doc.setDrawColor(200);
    doc.line(14, finalY, 80, finalY);
    doc.line(pageWidth - 80, finalY, pageWidth - 14, finalY);

    doc.setFontSize(9);
    doc.setTextColor(50);
    doc.text("Auditor Signature", 14, finalY + 5);
    doc.text("Stock Manager Signature", pageWidth - 80, finalY + 5);
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      "Created By Gonza Systems",
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" },
    );
  }

  doc.save(`stock_audit_${format(new Date(), "yyyy-MM-dd_HHmm")}.pdf`);
};
