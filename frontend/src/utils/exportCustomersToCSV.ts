import { Customer } from '@/hooks/useCustomers';
import { format } from 'date-fns';

export const exportCustomersToCSV = (
  customers: Customer[],
  currency: string = 'UGX',
  getCategoryName: (categoryId: string | null) => string
) => {
  if (customers.length === 0) {
    alert('No customers to export');
    return;
  }

  const headers = [
    'Full Name',
    'Phone Number',
    'Email',
    'Gender',
    'Location',
    'Birthday',
    'Category',
    'Lifetime Value',
    'Total Orders',
    'Notes',
    'Tags',
    'Created Date'
  ];

  const csvData = customers.map(customer => {
    return [
      `"${(customer.fullName || '').replace(/"/g, '""')}"`,
      `"${(customer.phoneNumber || '').replace(/"/g, '""')}"`,
      `"${(customer.email || '').replace(/"/g, '""')}"`,
      `"${(customer.gender || '').replace(/"/g, '""')}"`,
      `"${(customer.location || '').replace(/"/g, '""')}"`,
      customer.birthday ? format(new Date(customer.birthday), 'yyyy-MM-dd') : '',
      `"${getCategoryName(customer.categoryId || null).replace(/"/g, '""')}"`,
      (customer.lifetimeValue || 0).toFixed(2),
      (customer.orderCount || 0).toString(),
      `"${(customer.notes || '').replace(/"/g, '""')}"`,
      `"${(customer.tags || []).join(', ').replace(/"/g, '""')}"`,
      format(new Date(customer.createdAt), 'yyyy-MM-dd HH:mm:ss')
    ];
  });

  const csvContent = [headers, ...csvData]
    .map(row => row.join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `customers-${currency}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};