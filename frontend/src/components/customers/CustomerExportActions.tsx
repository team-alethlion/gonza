"use client";
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { Customer } from '@/hooks/useCustomers';
import { exportCustomersToCSV } from '@/utils/exportCustomersToCSV';
import { exportCustomersToPDF } from '@/utils/exportCustomersToPDF';
import { useToast } from '@/hooks/use-toast';

interface CustomerExportActionsProps {
  customers: Customer[];
  currency: string;
  businessName: string;
  businessLogo?: string;
  getCategoryName: (categoryId: string | null) => string;
}

const CustomerExportActions: React.FC<CustomerExportActionsProps> = ({
  customers,
  currency,
  businessName,
  businessLogo,
  getCategoryName
}) => {
  const { toast } = useToast();

  const handleCSVExport = () => {
    try {
      exportCustomersToCSV(customers, currency, getCategoryName);
      toast({
        title: "Success",
        description: `Exported ${customers.length} customers to CSV`
      });
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast({
        title: "Error",
        description: "Failed to export customers to CSV",
        variant: "destructive"
      });
    }
  };

  const handlePDFExport = () => {
    try {
      exportCustomersToPDF(customers, getCategoryName, currency, businessName, businessLogo);
      toast({
        title: "Success",
        description: `Exported ${customers.length} customers to PDF`
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast({
        title: "Error",
        description: "Failed to export customers to PDF",
        variant: "destructive"
      });
    }
  };

  if (customers.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCSVExport}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        Export CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePDFExport}
        className="gap-2"
      >
        <FileText className="h-4 w-4" />
        Export PDF
      </Button>
    </div>
  );
};

export default CustomerExportActions;