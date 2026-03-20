
import { CashTransaction } from '@/types/cash';
import { format } from 'date-fns';

export const exportCashTransactionsToCSV = (
  transactions: CashTransaction[],
  getAccountName: (accountId: string | null) => string,
  formatCurrency: (amount: number) => string,
  currency: string = 'USD'
) => {
  if (transactions.length === 0) {
    alert('No transactions to export');
    return;
  }

  const headers = [
    'Date',
    'Type',
    'Account',
    'Description',
    'Category',
    'Person in Charge',
    'Amount',
    'Payment Method'
  ];

  const csvData = transactions.map(transaction => [
    format(transaction.date, 'yyyy-MM-dd'),
    transaction.transactionType.replace('_', ' '),
    getAccountName(transaction.accountId),
    `"${transaction.description.replace(/"/g, '""')}"`,
    transaction.category,
    transaction.personInCharge || '',
    transaction.amount.toString(),
    transaction.paymentMethod || ''
  ]);

  const csvContent = [headers, ...csvData]
    .map(row => row.join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cash-transactions-${currency}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
