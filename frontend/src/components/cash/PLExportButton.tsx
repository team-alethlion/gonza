"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, FileText, File } from 'lucide-react';
import { ProfitLossData } from '@/hooks/useProfitLossData';
import { exportProfitLossToCSV } from '@/utils/exportProfitLossToCSV';
import { exportProfitLossToPDF } from '@/utils/exportProfitLossToPDF';
import { useToast } from '@/hooks/use-toast';

interface PLExportButtonProps {
  data: ProfitLossData;
  dateRange: { from: Date | undefined; to: Date | undefined };
  currency: string;
  businessName?: string;
  businessLogo?: string;
  dateFilter?: string;
}

const PLExportButton: React.FC<PLExportButtonProps> = ({ 
  data, 
  dateRange, 
  currency, 
  businessName, 
  businessLogo,
  dateFilter 
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      exportProfitLossToCSV({
        data,
        dateRange,
        currency,
        businessName,
        dateFilter
      });
      toast({
        title: "Export Successful",
        description: "Profit & Loss Account exported to CSV successfully.",
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export Profit & Loss Account to CSV.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      await exportProfitLossToPDF({
        data,
        dateRange,
        currency,
        businessName,
        businessLogo,
        dateFilter
      });
      toast({
        title: "Export Successful",
        description: "Profit & Loss Account exported to PDF successfully.",
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export Profit & Loss Account to PDF.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={handleExportCSV} disabled={isExporting}>
          <File className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF} disabled={isExporting}>
          <FileText className="h-4 w-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PLExportButton;
