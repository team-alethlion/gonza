import * as XLSX from 'xlsx';

export const generateExpenseTemplate = () => {
    const headers = [
        'Date',
        'Amount',
        'Description',
        'Category',
        'Payment Method',
        'Person In Charge',
        'Link to Finance',
        'Finance Account'
    ];

    const sampleData = [
        {
            'Date': '22/12/2025',
            'Amount': '450.00',
            'Description': 'Office Rent',
            'Category': 'Rent',
            'Payment Method': 'Bank',
            'Person In Charge': 'Admin',
            'Link to Finance': 'true',
            'Finance Account': 'Company Wallet'
        },
        {
            'Date': '23/12/2025',
            'Amount': '120.00',
            'Description': 'Stationery',
            'Category': 'Supplies',
            'Payment Method': 'Cash',
            'Person In Charge': 'Manager',
            'Link to Finance': 'false',
            'Finance Account': ''
        }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses Template");

    // Generate and download
    XLSX.writeFile(workbook, "expense_import_template.xlsx");
};
