import { Expense } from '@/hooks/useExpenses';
import { format } from 'date-fns';

export const exportExpensesToCSV = (
  expenses: Expense[],
  formatCurrency: (amount: number) => string,
  currency: string = 'USD'
) => {
  if (expenses.length === 0) {
    alert('No expenses to export');
    return;
  }

  const headers = [
    'Date',
    'Description',
    'Category',
    'Amount',
    'Payment Method',
    'Person in Charge',
    'Cash Account',
    'Receipt Available'
  ];

  const csvData = expenses.map(expense => [
    format(expense.date, 'yyyy-MM-dd'),
    `"${expense.description.replace(/"/g, '""')}"`,
    expense.category || '',
    expense.amount.toString(),
    expense.paymentMethod || '',
    expense.personInCharge || '',
    expense.cashAccountId ? 'Yes' : 'No',
    expense.receiptImage ? 'Yes' : 'No'
  ]);

  const csvContent = [headers, ...csvData]
    .map(row => row.join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `expenses-${currency}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};