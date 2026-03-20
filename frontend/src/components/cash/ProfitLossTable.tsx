
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ProfitLossData } from '@/hooks/useProfitLossData';
import TaxCalculator from './TaxCalculator';
import PLExportButton from './PLExportButton';

interface ProfitLossTableProps {
  data: ProfitLossData;
  isLoading: boolean;
  formatCurrency: (amount: number) => string;
  onTaxChange: (percentage: number) => void;
  dateRange: { from: Date | undefined; to: Date | undefined };
  businessName?: string;
  businessLogo?: string;
  currency: string;
  dateFilter?: string;
}

const ProfitLossTable: React.FC<ProfitLossTableProps> = ({ 
  data, 
  isLoading, 
  formatCurrency, 
  onTaxChange, 
  dateRange, 
  businessName, 
  businessLogo, 
  currency,
  dateFilter 
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profit & Loss Account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(15)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const tableRows = [
    // Sales Section
    { detail: 'SALES/REVENUE', amount: data.sales, isBold: true },
    { detail: 'SALES RETURNS', amount: data.salesReturns, isSubtraction: true },
    { detail: 'NET SALES', amount: data.netSales, isBold: true, isTotal: true },
    
    // Spacer
    { detail: '', amount: null, isSpacer: true },
    
    // COGS Section - Updated structure with new formula
    { detail: 'COST OF GOODS SOLD (COGS)', amount: null, isHeader: true },
    { detail: 'TOTAL COST SALES', amount: data.totalCostSales },
    { detail: 'CARRIAGE INWARDS', amount: data.carriageInwards },
    { detail: 'TOTAL COST OF GOODS SOLD (COGS)', amount: data.totalCOGS, isBold: true, isTotal: true },
    
    // Spacer
    { detail: '', amount: null, isSpacer: true },
    
    // Gross Profit
    { detail: 'GROSS PROFIT', amount: data.grossProfit, isBold: true, isTotal: true },
    
    // Spacer
    { detail: '', amount: null, isSpacer: true },
    
    // Expenses Section
    { detail: 'EXPENSES', amount: null, isHeader: true },
  ];

  // Add expense categories
  Object.entries(data.expensesByCategory).forEach(([category, amount]) => {
    tableRows.push({
      detail: category.toUpperCase(),
      amount: amount
    });
  });

  // Continue with totals
  tableRows.push(
    { detail: 'TOTAL EXPENSES', amount: data.totalExpenses, isBold: true, isTotal: true },
    { detail: '', amount: null, isSpacer: true },
    { detail: 'NET PROFIT / LOSS', amount: data.netProfitLoss, isBold: true, isTotal: true },
    { detail: 'TAX', amount: data.taxAmount },
    { detail: 'FINAL PROFIT AFTER TAX', amount: data.finalProfitAfterTax, isBold: true, isTotal: true }
  );

  const getRowColor = (row: any) => {
    if (row.amount < 0) return 'text-red-600';
    if (row.detail?.includes('PROFIT') && row.amount > 0) return 'text-green-600';
    if (row.detail?.includes('EXPENSE') || row.detail?.includes('TAX')) return 'text-red-600';
    return 'text-gray-900';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Profit & Loss Account</CardTitle>
              <PLExportButton
                data={data}
                dateRange={dateRange}
                currency={currency}
                businessName={businessName}
                businessLogo={businessLogo}
                dateFilter={dateFilter}
              />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <TaxCalculator
          taxPercentage={data.taxPercentage}
          onTaxChange={onTaxChange}
          netProfitLoss={data.netProfitLoss}
          formatCurrency={formatCurrency}
        />
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold text-left">DETAILS</TableHead>
                <TableHead className="font-bold text-right">AMOUNT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableRows.map((row, index) => {
                if (row.isSpacer) {
                  return (
                    <TableRow key={index}>
                      <TableCell colSpan={2} className="h-4 border-0"></TableCell>
                    </TableRow>
                  );
                }

                if (row.isHeader) {
                  return (
                    <TableRow key={index}>
                      <TableCell colSpan={2} className="font-bold text-gray-800 bg-gray-50 border-0">
                        {row.detail}
                      </TableCell>
                    </TableRow>
                  );
                }

                return (
                  <TableRow key={index} className={row.isTotal ? 'border-t-2 border-gray-300' : ''}>
                    <TableCell className={`${row.isBold ? 'font-bold' : ''} ${getRowColor(row)}`}>
                      {row.detail}
                    </TableCell>
                    <TableCell className={`text-right ${row.isBold ? 'font-bold' : ''} ${getRowColor(row)}`}>
                      {row.amount !== null ? (
                        <span>
                          {row.isSubtraction && '('}
                          {formatCurrency(Math.abs(row.amount))}
                          {row.isSubtraction && ')'}
                        </span>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-blue-600 font-medium">Gross Profit</p>
              <p className="text-lg font-bold text-blue-800">{formatCurrency(data.grossProfit)}</p>
            </CardContent>
          </Card>
          
          <Card className={`border-${data.netProfitLoss >= 0 ? 'green' : 'red'}-200 bg-${data.netProfitLoss >= 0 ? 'green' : 'red'}-50`}>
            <CardContent className="p-4 text-center">
              <p className={`text-sm text-${data.netProfitLoss >= 0 ? 'green' : 'red'}-600 font-medium`}>
                Net {data.netProfitLoss >= 0 ? 'Profit' : 'Loss'}
              </p>
              <p className={`text-lg font-bold text-${data.netProfitLoss >= 0 ? 'green' : 'red'}-800`}>
                {formatCurrency(Math.abs(data.netProfitLoss))}
              </p>
            </CardContent>
          </Card>
          
          <Card className={`border-${data.finalProfitAfterTax >= 0 ? 'green' : 'red'}-200 bg-${data.finalProfitAfterTax >= 0 ? 'green' : 'red'}-50`}>
            <CardContent className="p-4 text-center">
              <p className={`text-sm text-${data.finalProfitAfterTax >= 0 ? 'green' : 'red'}-600 font-medium`}>
                Final {data.finalProfitAfterTax >= 0 ? 'Profit' : 'Loss'} After Tax
              </p>
              <p className={`text-lg font-bold text-${data.finalProfitAfterTax >= 0 ? 'green' : 'red'}-800`}>
                {formatCurrency(Math.abs(data.finalProfitAfterTax))}
              </p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfitLossTable;
