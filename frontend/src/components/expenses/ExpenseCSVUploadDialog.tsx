"use client";
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileText, AlertCircle, CheckCircle, Download, Info, Receipt, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { parseExpenseCSV, generateErrorLogCSV, ValidationError, CSVExpenseRow, validateExpenseCSVRow } from '@/utils/csvParser';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useExpenses } from '@/hooks/useExpenses';
import { useCashAccounts } from '@/hooks/useCashAccounts';

interface ExpenseCSVUploadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUploadComplete: () => void;
}

interface UploadState {
    step: 'select' | 'preview' | 'uploading' | 'complete';
    file: File | null;
    validRows: CSVExpenseRow[];
    errors: ValidationError[];
    totalRows: number;
    uploadProgress: number;
    successCount: number;
    failureCount: number;
}

const ExpenseCSVUploadDialog: React.FC<ExpenseCSVUploadDialogProps> = ({
    open,
    onOpenChange,
    onUploadComplete
}) => {
    const { createBulkExpenses } = useExpenses();
    const { accounts } = useCashAccounts();
    const [state, setState] = useState<UploadState>({
        step: 'select',
        file: null,
        validRows: [],
        errors: [],
        totalRows: 0,
        uploadProgress: 0,
        successCount: 0,
        failureCount: 0
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const convertCSVRowToExpenseBody = (row: CSVExpenseRow) => {
        let expenseDate = new Date();
        const rawDate = row['Date'] as any;
        const dateValue = rawDate?.toString();

        if (dateValue) {
            if (rawDate instanceof Date) {
                expenseDate = rawDate;
            } else {
                const ddmmyyyyMatch = dateValue.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
                if (ddmmyyyyMatch) {
                    const [, day, month, year] = ddmmyyyyMatch;
                    expenseDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                } else {
                    const parsedDate = new Date(dateValue);
                    if (!isNaN(parsedDate.getTime())) {
                        expenseDate = parsedDate;
                    }
                }
            }
        }

        let cashAccountId = '';
        const linkToCash = row['Link to Finance']?.toString().toLowerCase() === 'true';

        if (linkToCash && row['Finance Account']) {
            const targetAccount = accounts?.find(a =>
                a.name.toLowerCase() === row['Finance Account']?.toString().toLowerCase()
            );
            if (targetAccount) {
                cashAccountId = targetAccount.id;
            }
        }

        return {
            amount: parseFloat(row['Amount']?.toString().replace(/[^0-9.-]/g, '') || '0'),
            description: row['Description'] || '',
            category: row['Category'] || 'Other',
            date: expenseDate,
            paymentMethod: row['Payment Method'] || 'Cash',
            personInCharge: row['Person In Charge'] || '',
            linkToCash,
            cashAccountId: cashAccountId || undefined
        };
    };

    const handleFileSelect = async (file: File) => {
        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
        const isCSV = file.name.endsWith('.csv');

        if (!isExcel && !isCSV) {
            alert('Please select a CSV or Excel file');
            return;
        }

        let result: { validRows: CSVExpenseRow[], errors: ValidationError[], totalRows: number };

        if (isExcel) {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { cellDates: true });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const rawRows = XLSX.utils.sheet_to_json(worksheet) as any[];

            const csvRows: CSVExpenseRow[] = rawRows.map(row => ({
                'Date': row['Date'] || '',
                'Amount': row['Amount'] || '',
                'Description': row['Description'] || '',
                'Category': row['Category'] || '',
                'Payment Method': row['Payment Method'] || '',
                'Person In Charge': row['Person In Charge'] || '',
                'Link to Finance': row['Link to Finance'] || '',
                'Finance Account': row['Finance Account'] || ''
            }));

            const validRows: CSVExpenseRow[] = [];
            const errors: ValidationError[] = [];

            csvRows.forEach((row, index) => {
                const rowErrors = validateExpenseCSVRow(row, index + 2);

                if (row['Link to Finance']?.toString().toLowerCase() === 'true' && row['Finance Account']) {
                    const match = accounts?.find(a =>
                        a.name.toLowerCase() === row['Finance Account']?.toString().toLowerCase()
                    );
                    if (!match) {
                        rowErrors.push({
                            row: index + 2,
                            field: 'Finance Account',
                            message: `Account "${row['Finance Account']}" not found.`
                        });
                    }
                }

                if (rowErrors.length === 0) {
                    validRows.push(row);
                } else {
                    errors.push(...rowErrors);
                }
            });

            result = { validRows, errors, totalRows: csvRows.length };
        } else {
            const text = await file.text();
            result = parseExpenseCSV(text);

            const uploadErrors: ValidationError[] = [];
            const filteredValidRows: CSVExpenseRow[] = [];

            result.validRows.forEach((row, index) => {
                if (row['Link to Finance']?.toString().toLowerCase() === 'true' && row['Finance Account']) {
                    const match = accounts?.find(a =>
                        a.name.toLowerCase() === row['Finance Account']?.toString().toLowerCase()
                    );
                    if (!match) {
                        uploadErrors.push({
                            row: index + 2,
                            field: 'Finance Account',
                            message: `Account "${row['Finance Account']}" not found.`
                        });
                    } else {
                        filteredValidRows.push(row);
                    }
                } else {
                    filteredValidRows.push(row);
                }
            });

            result.errors.push(...uploadErrors);
            result.validRows = filteredValidRows;
        }

        setState({
            ...state,
            step: 'preview',
            file,
            validRows: result.validRows,
            errors: result.errors,
            totalRows: result.totalRows
        });
    };

    const handleConfirmUpload = async () => {
        setState(prev => ({ ...prev, step: 'uploading', uploadProgress: 0 }));
        setIsUploading(true);

        const expenses = state.validRows.map(convertCSVRowToExpenseBody);

        try {
            await createBulkExpenses(expenses);
            setState(prev => ({
                ...prev,
                step: 'complete',
                uploadProgress: 100,
                successCount: expenses.length,
                failureCount: 0
            }));
            setTimeout(() => onUploadComplete(), 1500);
        } catch (error) {
            console.error('Bulk upload failed:', error);
            setState(prev => ({
                ...prev,
                step: 'complete',
                uploadProgress: 100,
                successCount: 0,
                failureCount: expenses.length
            }));
        } finally {
            setIsUploading(false);
        }
    };

    const renderFileSelection = () => (
        <div className="space-y-6">
            <div
                className={cn(
                    "border-4 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300",
                    isDragging
                        ? "border-red-500 bg-red-50/50 scale-[1.01] shadow-xl"
                        : "border-slate-200 dark:border-slate-800 hover:border-red-400 hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
                )}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileSelect(e.dataTransfer.files[0]); }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="bg-red-100 dark:bg-red-900/40 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Upload className="h-10 w-10 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-2">Select CSV or Excel</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-8">
                    Import multiple expenses quickly. Drag and drop your file here or click to browse.
                </p>
                <div className="flex justify-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        <FileText className="h-3 w-3" /> .CSV
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 rounded-full text-[11px] font-bold text-green-700 dark:text-green-400">
                        <FileText className="h-3 w-3" /> .XLSX
                    </div>
                </div>
            </div>

            <div className="border rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-3 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-red-500" />
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Expected Format</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-100/30 dark:bg-slate-900/30">
                                <TableHead className="text-[10px] h-9">Date</TableHead>
                                <TableHead className="text-[10px] h-9">Amount</TableHead>
                                <TableHead className="text-[10px] h-9">Description</TableHead>
                                <TableHead className="text-[10px] h-9">Link to Finance</TableHead>
                                <TableHead className="text-[10px] h-9">Finance Account</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow className="h-9 border-slate-100 dark:border-slate-800">
                                <TableCell className="text-[11px] py-1.5 font-mono">22/12/2025</TableCell>
                                <TableCell className="text-[11px] py-1.5 font-bold">450.00</TableCell>
                                <TableCell className="text-[11px] py-1.5 truncate max-w-[120px]">Office Rent</TableCell>
                                <TableCell className="text-[11px] py-1.5 text-red-600 font-bold italic">true</TableCell>
                                <TableCell className="text-[11px] py-1.5 truncate max-w-[120px]">Company Wallet</TableCell>
                            </TableRow>
                            <TableRow className="h-9 border-none">
                                <TableCell className="text-[11px] py-1.5 font-mono">23/12/2025</TableCell>
                                <TableCell className="text-[11px] py-1.5 font-bold">120.00</TableCell>
                                <TableCell className="text-[11px] py-1.5 truncate max-w-[120px]">Stationery</TableCell>
                                <TableCell className="text-[11px] py-1.5 text-slate-400 font-bold italic">false</TableCell>
                                <TableCell className="text-[11px] py-1.5 text-slate-400 italic">Leave Empty</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>
            <input ref={fileInputRef} type="file" accept=".csv, .xlsx, .xls" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} className="hidden" />
        </div>
    );

    const renderPreview = () => (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-50 dark:bg-red-900/30 p-2 rounded-xl">
                            <FileText className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                            <span className="text-lg font-black text-slate-900 dark:text-slate-100">{state.file?.name}</span>
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-tight">Analyzed Successfully</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setState(prev => ({ ...prev, step: 'select' }))} className="text-red-600 font-bold">
                        Change File
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Card className="shadow-none bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50">
                        <CardContent className="p-6">
                            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{state.validRows.length}</div>
                            <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-500 uppercase tracking-widest mt-1">Ready to Import</p>
                        </CardContent>
                    </Card>
                    <Card className="shadow-none bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-800/50">
                        <CardContent className="p-6">
                            <div className="text-3xl font-black text-rose-600 dark:text-rose-400">{state.errors.length}</div>
                            <p className="text-[10px] font-black text-rose-700 dark:text-rose-500 uppercase tracking-widest mt-1">Invalid Records</p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {state.errors.length > 0 && (
                <Alert variant="destructive" className="bg-rose-50/50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-900/50 rounded-2xl p-4">
                    <AlertCircle className="h-5 w-5 text-rose-600" />
                    <AlertDescription className="text-sm text-rose-700 dark:text-rose-400 leading-relaxed font-bold ml-2">
                        Heads up! {state.errors.length} rows have errors and will be skipped.
                        <Button
                            variant="link"
                            className="p-0 h-auto ml-2 text-rose-800 dark:text-rose-300 underline font-black uppercase text-xs"
                            onClick={() => generateErrorLogCSV(state.errors, 'expense_errors.csv')}
                        >
                            <Download className="h-3 w-3 mr-1 inline" /> Export Error Log
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            <Button
                className="w-full h-14 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 shadow-xl font-black text-lg rounded-2xl"
                onClick={handleConfirmUpload}
                disabled={state.validRows.length === 0}
            >
                Confirm Import of {state.validRows.length} Expenses
            </Button>
        </div>
    );

    const renderUploading = () => (
        <div className="space-y-10 py-12 text-center">
            <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 rounded-3xl border-4 border-slate-100 dark:border-slate-800" />
                <div className="absolute inset-0 rounded-3xl border-4 border-t-red-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Receipt className="h-10 w-10 text-red-500/30" />
                </div>
            </div>
            <div className="space-y-4">
                <h3 className="text-2xl font-black">Processing Your Data</h3>
                <div className="max-w-xs mx-auto space-y-2">
                    <Progress value={state.uploadProgress} className="h-3 rounded-full bg-slate-100 dark:bg-slate-800" />
                    <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{Math.round(state.uploadProgress)}% Complete</span>
                </div>
            </div>
        </div>
    );

    const renderComplete = () => (
        <div className="space-y-8 py-8 text-center animate-in fade-in zoom-in duration-500">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="space-y-2">
                <h3 className="text-3xl font-black tracking-tight">Import Complete!</h3>
                <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-xs tracking-widest">
                    Successfully Added <span className="text-emerald-600 dark:text-emerald-400 font-black">{state.successCount} Records</span>
                </p>
            </div>
            <Button onClick={onUploadComplete} className="h-14 px-12 rounded-2xl text-lg font-black bg-slate-900 hover:bg-black dark:bg-white dark:text-black shadow-xl">
                Return to Dashboard
            </Button>
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] md:max-w-4xl p-0 overflow-hidden border-none bg-transparent shadow-none">
                <div className="space-y-6">
                    <Card className="shadow-2xl border-none bg-transparent">
                        <CardHeader className="px-6 py-4 bg-white dark:bg-slate-900 border-b rounded-t-[2rem]">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="bg-red-600 p-2.5 rounded-2xl text-white shadow-lg">
                                        <Upload className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-2xl font-black tracking-tight">CSV/Excel Importer</CardTitle>
                                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Bulk process historical expense logs</p>
                                    </div>
                                </div>
                                <Button variant="ghost" onClick={() => onOpenChange(false)} className="bg-white dark:bg-slate-900 shadow-sm border rounded-xl h-10 px-4">
                                    <X className="h-4 w-4 mr-2" /> Cancel
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-b-[2rem] p-8 md:p-12 border shadow-sm min-h-[450px] max-h-[85vh] overflow-y-auto custom-scrollbar flex flex-col justify-center">
                                {state.step === 'select' && renderFileSelection()}
                                {state.step === 'preview' && renderPreview()}
                                {state.step === 'uploading' && renderUploading()}
                                {state.step === 'complete' && renderComplete()}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ExpenseCSVUploadDialog;
