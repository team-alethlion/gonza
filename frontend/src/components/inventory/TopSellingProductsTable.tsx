"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FileDown, ChevronDown } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SoldItem } from '@/hooks/useSoldItemsData';
import { formatNumber, formatCashCurrency } from '@/lib/utils';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useFinancialVisibility } from '@/hooks/useFinancialVisibility';
import { usePagination } from '@/hooks/usePagination';
import SalesTablePagination from '@/components/sales/SalesTablePagination';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TopSellingProductsTableProps {
  products: SoldItem[];
  onExport?: () => void;
  period?: string;
}

const TopSellingProductsTable: React.FC<TopSellingProductsTableProps> = ({
  products,
  onExport,
  period = 'this-month'
}) => {
  const { settings } = useBusinessSettings();
  const { canViewCostPrice, canViewProfit, canViewSellingPrice } = useFinancialVisibility();
  const router = useRouter();

  // Pagination
  const {
    currentPage,
    setCurrentPage,
    paginatedItems,
    totalPages
  } = usePagination<SoldItem>({
    items: products,
    itemsPerPage: 10
  });

  const handleCSVExport = () => {
    const headers = [
      'Rank',
      'Item Description',
      'Quantity Sold',
      'Average Price',
      'Total Amount',
      'Average Cost',
      'Total Cost',
      'Total Profit'
    ];

    const rows = products.map((item, index) => [
      (index + 1).toString(),
      item.description,
      item.totalQuantity.toString(),
      canViewSellingPrice ? item.averagePrice.toFixed(2) : 'RESTRICTED',
      canViewSellingPrice ? item.totalAmount.toFixed(2) : 'RESTRICTED',
      canViewCostPrice ? (item.averageCost || 0).toFixed(2) : 'RESTRICTED',
      canViewCostPrice ? item.totalCost.toFixed(2) : 'RESTRICTED',
      canViewProfit ? item.totalProfit.toFixed(2) : 'RESTRICTED'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const periodLabel = period.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    link.download = `top-selling-items-${periodLabel.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handlePDFExport = () => {
    const doc = new jsPDF('landscape');
    const periodLabel = period.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());

    // Add title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Top Selling Items Report', 14, 22);

    // Add period and date
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${periodLabel}`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 40);

    // Prepare table data
    const tableData = products.map((item, index) => [
      (index + 1).toString(),
      item.description.length > 50 ? item.description.substring(0, 47) + '...' : item.description,
      item.totalQuantity.toString(),
      canViewSellingPrice ? `${settings.currency} ${formatNumber(item.averagePrice)}` : 'RESTRICTED',
      canViewSellingPrice ? `${settings.currency} ${formatNumber(item.totalAmount)}` : 'RESTRICTED',
      canViewCostPrice ? `${settings.currency} ${formatNumber(item.averageCost || 0)}` : 'RESTRICTED',
      canViewCostPrice ? `${settings.currency} ${formatNumber(item.totalCost)}` : 'RESTRICTED',
      canViewProfit ? `${settings.currency} ${formatNumber(item.totalProfit)}` : 'RESTRICTED'
    ]);

    // Add table
    autoTable(doc, {
      head: [['Rank', 'Item Description', 'Qty Sold', 'Avg Price', 'Total Amount', 'Avg Cost', 'Total Cost', 'Profit']],
      body: tableData,
      startY: 50,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 139, 202] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { cellWidth: 80 },
        2: { halign: 'center', cellWidth: 25 },
        3: { halign: 'right', cellWidth: 30 },
        4: { halign: 'right', cellWidth: 35 },
        5: { halign: 'right', cellWidth: 30 },
        6: { halign: 'right', cellWidth: 30 },
        7: { halign: 'right', cellWidth: 30 }
      }
    });

    // Save the PDF
    doc.save(`top-selling-items-${periodLabel.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Export Dropdown */}
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <FileDown size={16} />
              Export
              <ChevronDown size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onExport || handleCSVExport}>
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePDFExport}>
              Export as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <TooltipProvider>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[60px] min-w-[60px]">Rank</TableHead>
                <TableHead className="min-w-[200px]">Item Description</TableHead>
                <TableHead className="w-[100px] min-w-[100px] text-right">Qty Sold</TableHead>
                {canViewSellingPrice && (
                  <>
                    <TableHead className="w-[120px] min-w-[120px] text-right">Avg Price</TableHead>
                    <TableHead className="w-[120px] min-w-[120px] text-right">Total Amount</TableHead>
                  </>
                )}
                {canViewCostPrice && (
                  <>
                    <TableHead className="w-[120px] min-w-[120px] text-right">Avg Cost</TableHead>
                    <TableHead className="w-[120px] min-w-[120px] text-right">Total Cost</TableHead>
                  </>
                )}
                {canViewProfit && (
                  <TableHead className="w-[120px] min-w-[120px] text-right">Profit</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No sales data for the selected period
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item, index) => {
                  const actualRank = (currentPage - 1) * 10 + index + 1;
                  // Get the first product ID if available
                  const productId = item.productIds && item.productIds.length > 0 ? item.productIds[0] : null;

                  return (
                    <TableRow
                      key={`${item.description}-${index}`}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => productId && router.push(`/inventory/${productId}`)}
                    >
                      <TableCell className="text-center">
                        <span className="text-xs bg-primary/10 text-primary rounded-full w-6 h-6 inline-flex items-center justify-center font-bold">
                          {actualRank}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">{item.description}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="font-bold break-words whitespace-normal">{item.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {item.totalQuantity % 1 === 0 ? item.totalQuantity : item.totalQuantity.toFixed(2)}
                      </TableCell>
                      {canViewSellingPrice && (
                        <>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatCashCurrency(item.averagePrice, settings.currency)}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatCashCurrency(item.totalAmount, settings.currency)}
                          </TableCell>
                        </>
                      )}
                      {canViewCostPrice && (
                        <>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatCashCurrency(item.averageCost || 0, settings.currency)}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatCashCurrency(item.totalCost, settings.currency)}
                          </TableCell>
                        </>
                      )}
                      {canViewProfit && (
                        <TableCell className="text-right font-medium tabular-nums">
                          <span className={item.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCashCurrency(item.totalProfit, settings.currency)}
                          </span>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </TooltipProvider>

      {/* Pagination Controls */}
      {products.length > 0 && (
        <div className="mt-4">
          <SalesTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
};

export default TopSellingProductsTable;
