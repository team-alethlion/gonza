
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ProfitLossData } from '@/types/cash';
import TaxCalculator from './TaxCalculator';
import PLExportButton from './PLExportButton';
import { cn } from '@/lib/utils';

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

  const tableRows: any[] = [
    // --- TRADING ACCOUNT SECTION ---
    { detail: 'TRADING ACCOUNT', amount: null, isHeader: true },
    { detail: 'SALES / TURNOVER', amount: data.sales, isBold: true },
    { detail: 'LESS: SALES RETURNS', amount: data.salesReturns, isSubtraction: true },
    { detail: 'NET REVENUE', amount: data.netSales, isBold: true, isTotal: true },
    
    { detail: '', amount: null, isSpacer: true },
    
    { detail: 'LESS: COST OF GOODS SOLD (COGS)', amount: null, isBold: true },
    { detail: 'GROSS COST OF SALES', amount: data.totalCostSales },
    { detail: 'LESS: COST OF RETURNS', amount: data.costOfReturns, isSubtraction: true },
    { detail: 'ADD: CARRIAGE INWARDS', amount: data.carriageInwards },
    { detail: 'TOTAL COGS', amount: data.totalCOGS, isBold: true, isTotal: true },
    
    { detail: 'GROSS PROFIT', amount: data.grossProfit, isBold: true, isTotal: true, isResult: true },
    
    { detail: '', amount: null, isSpacer: true },
    
    // --- PROFIT & LOSS ACCOUNT SECTION ---
    { detail: 'PROFIT & LOSS ACCOUNT', amount: null, isHeader: true },
    { detail: 'OPERATING EXPENSES', amount: null, isBold: true },
  ];

  // Add expense categories
  const categories = Object.entries(data.expensesByCategory);
  if (categories.length > 0) {
    categories.forEach(([category, amount]) => {
        tableRows.push({
          detail: category.toUpperCase(),
          amount: amount
        });
      });
  } else {
    tableRows.push({ detail: 'NO EXPENSES RECORDED', amount: 0, isItalic: true });
  }

  // Continue with totals
  tableRows.push(
    { detail: 'TOTAL OPERATING EXPENSES', amount: data.totalExpenses, isBold: true, isTotal: true },
    { detail: '', amount: null, isSpacer: true },
    { detail: 'NET PROFIT / LOSS (EBT)', amount: data.netProfitLoss, isBold: true, isTotal: true, isResult: true },
    { detail: 'TAXATION', amount: data.taxAmount, isSubtraction: true },
    { detail: 'FINAL PROFIT AFTER TAX', amount: data.finalProfitAfterTax, isBold: true, isTotal: true, isResult: true }
  );

  const getRowColor = (row: any) => {
    if (row.isResult && row.amount < 0) return 'text-red-600 bg-red-50';
    if (row.isResult && row.amount >= 0) return 'text-green-600 bg-green-50';
    if (row.amount < 0) return 'text-red-600';
    if (row.detail?.includes('EXPENSES') || row.detail?.includes('TAX')) return 'text-red-600';
    return 'text-gray-900';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Profit & Loss Account</CardTitle>
            <p className="text-xs text-muted-foreground mt-1 uppercase">
                Reporting Basis: <span className="font-bold text-primary">{data.basis}</span>
            </p>
          </div>
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
        
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader className="bg-gray-100">
              <TableRow>
                <TableHead className="font-bold text-left text-gray-900">FINANCIAL DETAILS</TableHead>
                <TableHead className="font-bold text-right text-gray-900">AMOUNT ({currency})</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableRows.map((row, index) => {
                if (row.isSpacer) {
                  return (
                    <TableRow key={index} className="hover:bg-transparent border-none">
                      <TableCell colSpan={2} className="h-4 border-0"></TableCell>
                    </TableRow>
                  );
                }

                if (row.isHeader) {
                  return (
                    <TableRow key={index} className="hover:bg-transparent">
                      <TableCell colSpan={2} className="font-black text-blue-900 bg-blue-50/50 border-y py-3 tracking-wider">
                        {row.detail}
                      </TableCell>
                    </TableRow>
                  );
                }

                return (
                  <TableRow key={index} className={cn(
                    "hover:bg-gray-50/50",
                    row.isTotal && 'border-t-2 border-gray-300',
                    row.isResult && 'border-b-2 border-gray-300'
                  )}>
                    <TableCell className={cn(
                        "py-3",
                        row.isBold && 'font-bold',
                        row.isItalic && 'italic text-muted-foreground text-xs px-8',
                        getRowColor(row)
                    )}>
                      {row.detail}
                    </TableCell>
                    <TableCell className={cn(
                        "text-right py-3",
                        row.isBold && 'font-bold',
                        getRowColor(row)
                    )}>
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
          
          <Card className={cn(
              "border-2",
              data.netProfitLoss >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
          )}>
            <CardContent className="p-4 text-center">
              <p className={cn(
                  "text-sm font-medium",
                  data.netProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                Net {data.netProfitLoss >= 0 ? 'Profit' : 'Loss'} (EBT)
              </p>
              <p className={cn(
                  "text-lg font-bold",
                  data.netProfitLoss >= 0 ? 'text-green-800' : 'text-red-800'
              )}>
                {formatCurrency(Math.abs(data.netProfitLoss))}
              </p>
            </CardContent>
          </Card>
          
          <Card className={cn(
              "border-2 shadow-sm",
              data.finalProfitAfterTax >= 0 ? 'border-green-500 bg-green-100/50' : 'border-red-500 bg-red-100/50'
          )}>
            <CardContent className="p-4 text-center">
              <p className={cn(
                  "text-sm font-bold uppercase",
                  data.finalProfitAfterTax >= 0 ? 'text-green-700' : 'text-red-700'
              )}>
                Retained Earnings
              </p>
              <p className={cn(
                  "text-2xl font-black",
                  data.finalProfitAfterTax >= 0 ? 'text-green-900' : 'text-red-900'
              )}>
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
