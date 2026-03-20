"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FileDown, FileText, Plus } from 'lucide-react';
import { exportToCSV } from '@/utils/exportToCSV';
import { generateSalesReportVectorPDF } from '@/utils/generateSalesReportVectorPDF';
import { Sale } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { format } from 'date-fns';
import { getDateRangeFromFilter } from '@/utils/dateFilters';
import { useProfiles } from '@/contexts/ProfileContext';

interface TableActionsProps {
  filteredSales: Sale[];
  allSales: Sale[];
  currency: string;
  dateFilter?: string;
  dateRange?: { from: Date | undefined; to: Date | undefined };
  specificDate?: Date;
}

const TableActions: React.FC<TableActionsProps> = ({
  filteredSales,
  allSales,
  currency,
  dateFilter = 'all',
  dateRange,
  specificDate
}) => {
  const router = useRouter();
  const { toast } = useToast();
  const { settings } = useBusinessSettings();
  const { hasPermission } = useProfiles();

  const handleExportCSV = () => {
    exportToCSV(filteredSales.length > 0 ? filteredSales : allSales);
  };

  const handleExportPDF = async () => {
    try {
      const salesToExport = filteredSales.length > 0 ? filteredSales : allSales;

      // Transform Sale objects to SaleData format expected by the PDF generator
      const salesData = salesToExport.map(sale => {
        // Calculate total amount with discounts and tax
        const subtotal = sale.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const totalDiscounts = sale.items.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
        const netAmount = subtotal - totalDiscounts;
        const totalAmount = netAmount * (1 + (sale.taxRate || 0) / 100);

        return {
          receipt_number: sale.receiptNumber,
          customer_name: sale.customerName,
          total_amount: totalAmount,
          payment_status: sale.paymentStatus.toLowerCase(),
          created_at: sale.date.toISOString(),
          sale_date: sale.date.toISOString().split('T')[0],
          items: sale.items.map(item => ({
            product_name: item.description,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity,
            discount_amount: item.discountAmount || 0,
            discount_percentage: item.discountPercentage || 0,
            discount_type: item.discountType || undefined
          }))
        };
      });

      // Calculate actual date range for PDF - ensure we have valid dates
      let actualDateRange: { from: Date | undefined; to: Date | undefined };

      if (specificDate) {
        // For specific date, use that date for both from and to
        actualDateRange = { from: specificDate, to: specificDate };
      } else if (dateRange?.from && dateRange?.to) {
        // For custom range, use the provided range
        actualDateRange = dateRange;
      } else if (dateFilter && dateFilter !== 'all') {
        // For predefined filters, get the actual date range
        const range = getDateRangeFromFilter(dateFilter);
        actualDateRange = range;
      } else {
        // For "all" filter, determine date range from actual sales data
        if (salesToExport.length > 0) {
          const dates = salesToExport.map(sale => sale.date);
          const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
          const latestDate = new Date(Math.max(...dates.map(d => d.getTime())));
          actualDateRange = { from: earliestDate, to: latestDate };
        } else {
          // Fallback to current date if no sales
          const today = new Date();
          actualDateRange = { from: today, to: today };
        }
      }

      generateSalesReportVectorPDF(
        salesData,
        'Current Period',
        currency,
        actualDateRange,
        {
          businessName: settings.businessName,
          businessAddress: settings.businessAddress,
          businessPhone: settings.businessPhone,
          businessEmail: settings.businessEmail
        }
      );

      toast({
        title: "Report Generated",
        description: "PDF sales report has been created successfully.",
      });
    } catch (error) {
      console.error('Error generating PDF report:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={handleExportCSV}
          variant="outline"
          size="lg"
          className="gap-2 h-12 text-sm border-border/50 font-medium"
        >
          <FileDown className="h-4 w-4 shrink-0" />
          CSV
        </Button>
        <Button
          onClick={handleExportPDF}
          variant="outline"
          size="lg"
          className="gap-2 h-12 text-sm border-border/50 font-medium"
        >
          <FileText className="h-4 w-4 shrink-0" />
          PDF
        </Button>
      </div>
      {hasPermission('sales', 'create') && (
        <Button
          onClick={() => router.push('/agency/new-sale')}
          size="lg"
          className="w-full gap-2 h-12 text-sm font-medium"
        >
          <Plus className="h-4 w-4 shrink-0" />
          New Sale
        </Button>
      )}
    </div>
  );
};

export default TableActions;
