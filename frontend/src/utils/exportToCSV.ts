import { Sale } from '@/types';
import { format } from 'date-fns';

export const exportToCSV = (sales: Sale[]) => {
    // Define headers for the CSV file
    const headers = [
        'Receipt #',
        'Date',
        'Customer',
        'Items',
        'Items Count',
        'Total Amount',
        'Amount Paid',
        'Amount Due',
        'Status'
    ];

    // Map sales data to rows
    const rows = sales.map(sale => {
        const totalAmount = sale.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const itemNames = sale.items.map(item => item.description).join('; ');

        return [
            sale.receiptNumber,
            format(new Date(sale.date), 'yyyy-MM-dd HH:mm'),
            sale.customerName,
            itemNames,
            sale.items.length.toString(),
            totalAmount.toFixed(2),
            (sale.amountPaid || 0).toFixed(2),
            (sale.amountDue || 0).toFixed(2),
            sale.paymentStatus
        ];
    });

    // Construct CSV content
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Create a blob and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `sales_export_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
