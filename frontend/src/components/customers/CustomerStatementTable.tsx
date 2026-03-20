"use client";
import React, { useMemo } from 'react';
import { Sale } from '@/types';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface CustomerStatementTableProps {
  sales: Sale[];
  currency: string;
  onExportCSV: () => void;
  onExportPDF: () => void;
}

const CustomerStatementTable: React.FC<CustomerStatementTableProps> = ({ sales, currency, onExportCSV, onExportPDF }) => {
  // Calculate running balance
  const rows = useMemo(() => {
    const sortedSales = [...sales].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    interface StatementRow {
      date: string;
      details: string;
      amount: string;
      balance: string;
    }

    return sortedSales.reduce<StatementRow[]>((acc, sale) => {
      const amount = sale.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const previousBalance = acc.length > 0 
        ? parseFloat(acc[acc.length - 1].balance.replace(/[^0-9.-]+/g, "")) 
        : 0;
      
      const currentBalance = previousBalance + amount;
      
      acc.push({
        date: format(new Date(sale.date), 'yyyy-MM-dd'),
        details: sale.items.map(i => i.description).join(', '),
        amount: `${currency} ${amount.toLocaleString()}`,
        balance: `${currency} ${currentBalance.toLocaleString()}`,
      });
      
      return acc;
    }, []);
  }, [sales, currency]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-2">
        <Button size="sm" variant="outline" onClick={onExportCSV}>Export CSV</Button>
        <Button size="sm" variant="outline" onClick={onExportPDF}>Export PDF</Button>
      </div>
      <div className="overflow-x-auto border rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Details / Product</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-2">{row.date}</td>
                <td className="px-4 py-2">{row.details}</td>
                <td className="px-4 py-2 text-right">{row.amount}</td>
                <td className="px-4 py-2 text-right">{row.balance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerStatementTable;
