
export const generateProductCSVTemplate = () => {
  const headers = [
    'Product Name',
    'Category',
    'Description',
    'Supplier',
    'Creation Date',
    'Initial Stock',
    'Minimum Stock Level',
    'Cost Price',
    'Selling Price'
  ];

  const sampleData = [
    [
      '"Sample Product with, commas"',
      'Electronics',
      '"A detailed product description, with commas and other punctuation!"',
      '"Supplier Name, Inc."',
      '15/01/2024',
      '10',
      '5',
      '50.00',
      '75.00'
    ],
    [
      'Simple Product Name',
      'Home & Garden',
      'Basic description without commas',
      'Basic Supplier',
      '2024-01-16',
      '-5',
      '0',
      '-25.50',
      '100.75'
    ]
  ];

  const csvContent = [
    headers.join(','),
    ...sampleData.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'product_template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const generateTransactionCSVTemplate = () => {
  const headers = [
    'Date',
    'Type',
    'Amount',
    'Description',
    'Category',
    'Payment Method',
    'Person In Charge',
    'To Account'
  ];

  const sampleData = [
    [
      '22/12/2025',
      'cash_in',
      '1500.00',
      'Sales income from morning shift',
      'Sales',
      'Cash',
      'John Doe',
      ''
    ],
    [
      '22/12/2025',
      'cash_out',
      '200.50',
      'Purchased cleaning supplies',
      'Expenses',
      'Cash',
      'Jane Smith',
      ''
    ],
    [
      '22/12/2025',
      'transfer',
      '5000.00',
      'Moving funds to main safe',
      'Internal',
      '',
      'Admin',
      'Main Safe'
    ]
  ];

  const csvContent = [
    headers.join(','),
    ...sampleData.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'transaction_template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
