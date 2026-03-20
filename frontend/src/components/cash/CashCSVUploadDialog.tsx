"use client";
import React, { useState, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileText, AlertCircle, CheckCircle, Download, Info, MoveRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { parseTransactionCSV, generateErrorLogCSV, ValidationError, CSVTransactionRow, validateTransactionCSVRow } from '@/utils/csvParser';
import { CashTransactionFormData, CashAccount } from '@/types/cash';
import { cn } from '@/lib/utils';
import { useCashTransactions } from '@/hooks/useCashTransactions';
import { useCashAccounts } from '@/hooks/useCashAccounts';

interface CashCSVUploadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    accountId: string;
    onUploadComplete: () => void;
}

interface UploadState {
    step: 'select' | 'preview' | 'uploading' | 'complete';
    file: File | null;
    validRows: CSVTransactionRow[];
    errors: ValidationError[];
    totalRows: number;
    uploadProgress: number;
    successCount: number;
    failureCount: number;
    currentTransactionIndex: number;
}

const CashCSVUploadDialog: React.FC<CashCSVUploadDialogProps> = ({
    open,
    onOpenChange,
    accountId,
    onUploadComplete
}) => {
    const { createBulkTransactions } = useCashTransactions(accountId);
    const { accounts } = useCashAccounts();
    const [state, setState] = useState<UploadState>({
        step: 'select',
        file: null,
        validRows: [],
        errors: [],
        totalRows: 0,
        uploadProgress: 0,
        successCount: 0,
        failureCount: 0,
        currentTransactionIndex: 0
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const convertCSVRowToTransaction = (row: CSVTransactionRow): CashTransactionFormData => {
        let transactionDate = new Date();

        const rawDate = row['Date'] as any;
        const dateValue = rawDate?.toString();
        if (dateValue) {
            // Support raw Date objects from SheetJS {cellDates: true}
            if (rawDate instanceof Date) {
                transactionDate = rawDate;
            } else {
                // Support DD/MM/YYYY, D/M/YYYY, DD-MM-YYYY
                const ddmmyyyyMatch = dateValue.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
                if (ddmmyyyyMatch) {
                    const [, day, month, year] = ddmmyyyyMatch;
                    transactionDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                } else {
                    const parsedDate = new Date(dateValue);
                    if (!isNaN(parsedDate.getTime())) {
                        transactionDate = parsedDate;
                    }
                }
            }
        }

        // If something went wrong with the date, use today but ensure it's a valid object
        if (isNaN(transactionDate.getTime())) {
            transactionDate = new Date();
        }

        let toAccountId = '';
        if (row['Type']?.toLowerCase() === 'transfer' && row['To Account']) {
            const targetAccount = accounts?.find(a =>
                a.name.toLowerCase() === row['To Account']?.toString().toLowerCase() && a.id !== accountId
            );
            if (targetAccount) {
                toAccountId = targetAccount.id;
            }
        }

        return {
            accountId: accountId || '',
            amount: parseFloat(row['Amount']?.toString().replace(/[^0-9.-]/g, '') || '0'),
            transactionType: (row['Type']?.toLowerCase() || 'cash_in') as 'cash_in' | 'cash_out' | 'transfer',
            toAccountId,
            category: row['Category'] || 'Other',
            description: row['Description'] || '',
            paymentMethod: row['Payment Method'] || 'Cash',
            personInCharge: row['Person In Charge'] || '',
            tags: [],
            date: transactionDate,
            receiptImage: ''
        };
    };

    const handleFileSelect = async (file: File) => {
        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
        const isCSV = file.name.endsWith('.csv');

        if (!isExcel && !isCSV) {
            alert('Please select a CSV or Excel file');
            return;
        }

        let result: { validRows: CSVTransactionRow[], errors: ValidationError[], totalRows: number };

        if (isExcel) {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { cellDates: true });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // Use SheetJS to get clean objects directly
            const rawRows = XLSX.utils.sheet_to_json(worksheet) as any[];

            // Map keys back to expected format if they differ slightly
            const csvRows: CSVTransactionRow[] = rawRows.map(row => ({
                'Date': row['Date'] || '',
                'Type': row['Type'] || '',
                'Amount': row['Amount'] || '',
                'Description': row['Description'] || '',
                'Category': row['Category'] || '',
                'Payment Method': row['Payment Method'] || '',
                'Person In Charge': row['Person In Charge'] || '',
                'To Account': row['To Account'] || ''
            }));

            // Crucially: run the SAME validation as CSV
            const validRows: CSVTransactionRow[] = [];
            const errors: ValidationError[] = [];

            csvRows.forEach((row, index) => {
                const rowErrors = validateTransactionCSVRow(row, index + 2);

                // Add specific validation for account matching if it's a transfer
                if (row['Type']?.toLowerCase() === 'transfer' && row['To Account']) {
                    const match = accounts?.find(a =>
                        a.name.toLowerCase() === row['To Account']?.toString().toLowerCase() && a.id !== accountId
                    );
                    if (!match) {
                        rowErrors.push({
                            row: index + 2,
                            field: 'To Account',
                            message: `Account "${row['To Account']}" not found or is the current account.`
                        });
                    }
                }

                if (rowErrors.length === 0) {
                    validRows.push(row);
                } else {
                    errors.push(...rowErrors);
                }
            });

            result = {
                validRows,
                errors,
                totalRows: csvRows.length
            };
        } else {
            const text = await file.text();
            result = parseTransactionCSV(text);

            // Post-process CSV results for account matching
            const accountErrors: ValidationError[] = [];
            const filteredValidRows: CSVTransactionRow[] = [];

            result.validRows.forEach((row, index) => {
                if (row['Type']?.toLowerCase() === 'transfer' && row['To Account']) {
                    const match = accounts?.find(a =>
                        a.name.toLowerCase() === row['To Account']?.toString().toLowerCase() && a.id !== accountId
                    );
                    if (!match) {
                        accountErrors.push({
                            row: index + 2, // This might be slightly off for CSV if index is non-sequential, but usually okay
                            field: 'To Account',
                            message: `Account "${row['To Account']}" not found.`
                        });
                    } else {
                        filteredValidRows.push(row);
                    }
                } else {
                    filteredValidRows.push(row);
                }
            });

            result.errors.push(...accountErrors);
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

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };


    const handleConfirmUpload = async () => {
        setState(prev => ({ ...prev, step: 'uploading', uploadProgress: 0, currentTransactionIndex: 0 }));
        setIsUploading(true);

        const transactions = state.validRows.map(convertCSVRowToTransaction);

        try {
            await createBulkTransactions(transactions);

            setState(prev => ({
                ...prev,
                step: 'complete',
                uploadProgress: 100,
                successCount: transactions.length,
                failureCount: 0,
                currentTransactionIndex: transactions.length
            }));
        } catch (error) {
            console.error('Bulk upload failed:', error);
            setState(prev => ({
                ...prev,
                step: 'complete',
                uploadProgress: 100,
                successCount: 0,
                failureCount: transactions.length,
                currentTransactionIndex: transactions.length
            }));
        } finally {
            setIsUploading(false);
        }
    };

    const handleClose = () => {
        if (isUploading) return;

        const wasSuccessfulUpload = state.step === 'complete' && state.successCount > 0;

        setState({
            step: 'select',
            file: null,
            validRows: [],
            errors: [],
            totalRows: 0,
            uploadProgress: 0,
            successCount: 0,
            failureCount: 0,
            currentTransactionIndex: 0
        });

        onOpenChange(false);

        if (wasSuccessfulUpload) {
            onUploadComplete();
        }
    };

    const renderFileSelection = () => (
        <div className="space-y-6">
            <div
                className={cn(
                    "border-4 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300",
                    isDragging
                        ? "border-blue-500 bg-blue-50/50 scale-[1.01] shadow-lg"
                        : "border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
                    <Upload className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    Click or Drag File to Upload
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-6">
                    Select your transaction data file. **CSV** and **Excel (.xlsx, .xls)** files are supported for bulk processing.
                </p>
                <div className="flex items-center justify-center gap-2">
                    <div className="h-1 w-8 bg-slate-200 dark:bg-slate-800 rounded-full" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Multi-Format Support</span>
                    <div className="h-1 w-8 bg-slate-200 dark:bg-slate-800 rounded-full" />
                </div>
            </div>

            <div className="border rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-blue-500" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">DATA FORMAT GUIDE</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">Headers are required</span>
                </div>
                <div className="overflow-x-auto p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-100/30 dark:bg-slate-900/30">
                                <TableHead className="text-[10px] uppercase h-8 py-0">Date</TableHead>
                                <TableHead className="text-[10px] uppercase h-8 py-0">Type</TableHead>
                                <TableHead className="text-[10px] uppercase h-8 py-0">Amount</TableHead>
                                <TableHead className="text-[10px] uppercase h-8 py-0">Description</TableHead>
                                <TableHead className="text-[10px] uppercase h-8 py-0">Category</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow className="h-8 py-0">
                                <TableCell className="text-[11px] py-1 text-slate-600 font-mono">22/12/2025</TableCell>
                                <TableCell className="text-[11px] py-1 text-green-600 font-semibold italic">cash_in</TableCell>
                                <TableCell className="text-[11px] py-1 text-slate-800 font-bold">1500.00</TableCell>
                                <TableCell className="text-[11px] py-1 truncate max-w-[80px]">Product Sale #44</TableCell>
                                <TableCell className="text-[11px] py-1">Sales</TableCell>
                            </TableRow>
                            <TableRow className="h-8 py-0 border-none">
                                <TableCell className="text-[11px] py-1 text-slate-600 font-mono">21/12/2025</TableCell>
                                <TableCell className="text-[11px] py-1 text-red-600 font-semibold italic">cash_out</TableCell>
                                <TableCell className="text-[11px] py-1 text-slate-800 font-bold">450.00</TableCell>
                                <TableCell className="text-[11px] py-1 truncate max-w-[80px]">Office Supplies</TableCell>
                                <TableCell className="text-[11px] py-1">Expenses</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
                <div className="p-3 bg-blue-50/30 dark:bg-blue-900/10 text-[10px] text-blue-600 dark:text-blue-400 leading-relaxed border-t italic">
                    <strong>Note:</strong> Allowed types are: <code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded mx-0.5">cash_in</code>, <code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded mx-0.5">cash_out</code>, <code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded mx-0.5">transfer</code>
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileInputChange}
                className="hidden"
            />
        </div>
    );

    const renderPreview = () => (
        <div className="space-y-6">
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-4">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{state.file?.name}</span>
                        <p className="text-[10px] text-slate-500">File attached and analyzed</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <Card className="shadow-none bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30 overflow-hidden">
                        <CardContent className="p-4">
                            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{state.validRows.length}</div>
                            <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-500 uppercase">Valid Rows</p>
                        </CardContent>
                    </Card>
                    <Card className="shadow-none bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30 overflow-hidden">
                        <CardContent className="p-4">
                            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{state.errors.length}</div>
                            <p className="text-[10px] font-bold text-rose-700 dark:text-rose-500 uppercase">Invalid</p>
                        </CardContent>
                    </Card>
                    <Card className="shadow-none bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 overflow-hidden text-center">
                        <CardContent className="p-4 flex flex-col items-center justify-center">
                            <div className="text-sm font-black text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                {Math.round((state.validRows.length / state.totalRows) * 100) || 0}%
                                <MoveRight className="h-3 w-3" />
                            </div>
                            <p className="text-[10px] font-bold text-blue-700 dark:text-blue-500 uppercase">Integrity</p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {state.errors.length > 0 && (
                <Alert variant="destructive" className="bg-rose-50/50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-900">
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                    <AlertDescription className="text-xs text-rose-700 dark:text-rose-400 leading-relaxed font-medium">
                        Found {state.errors.length} rows with errors that will be skipped during the process.
                        <Button
                            variant="link"
                            className="p-0 h-auto ml-2 text-rose-700 dark:text-rose-400 underline font-bold"
                            onClick={() => generateErrorLogCSV(state.errors, 'transaction_upload_errors.csv')}
                        >
                            <Download className="h-3 w-3 mr-1 inline" />
                            View Error Details
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            <div className="flex gap-3">
                <Button
                    variant="ghost"
                    className="flex-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => setState(prev => ({ ...prev, step: 'select' }))}
                >
                    Choose Different File
                </Button>
                <Button
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md font-bold transition-all active:scale-[0.98]"
                    onClick={handleConfirmUpload}
                    disabled={state.validRows.length === 0}
                >
                    Proceed with {state.validRows.length} Records
                </Button>
            </div>
        </div>
    );

    const renderUploading = () => (
        <div className="space-y-8 py-4">
            <div className="text-center space-y-2">
                <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Upload className="h-8 w-8 text-blue-500/50" />
                    </div>
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Processing Data...</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">This will only take a few moments</p>
            </div>

            <div className="space-y-2 px-4 text-center">
                <Progress value={state.uploadProgress} className="h-2 w-full bg-slate-100 dark:bg-slate-800" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{Math.round(state.uploadProgress)}% Complete</span>
            </div>

            <Alert className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <Info className="h-4 w-4 text-slate-400" />
                <AlertDescription className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    We are verifying and persisting each transaction. Please keep your browser window active.
                </AlertDescription>
            </Alert>
        </div>
    );

    const renderComplete = () => (
        <div className="space-y-6 pt-4 text-center">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Synchronized Successfully!</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    A total of <span className="text-emerald-600 dark:text-emerald-400 font-bold">{state.successCount} transactions</span> have been merged into the financial ledger.
                    {state.failureCount > 0 && <span className="text-rose-500 font-bold"> ({state.failureCount} entries reported issues)</span>}
                </p>
            </div>
            <Button
                onClick={handleClose}
                className="w-full h-12 rounded-xl text-lg font-bold shadow-lg transition-all hover:translate-y-[-2px] active:translate-y-[0px] bg-slate-900 hover:bg-black dark:bg-white dark:text-black dark:hover:bg-slate-200"
            >
                Return to Dashboard
            </Button>
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={(val) => !isUploading && onOpenChange(val)}>
            <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
                <DialogHeader className="p-8 pb-4 bg-gradient-to-b from-slate-50/50 to-white dark:from-slate-900 dark:to-slate-950">
                    <DialogTitle className="flex items-center gap-3 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">
                        <div className="bg-blue-600 p-2 rounded-xl text-white">
                            <Upload className="h-6 w-6" />
                        </div>
                        Financial Importer
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                        Scale your data management by importing bulk CSV logs.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-8 pb-8 pt-0">
                    {state.step === 'select' && renderFileSelection()}
                    {state.step === 'preview' && renderPreview()}
                    {state.step === 'uploading' && renderUploading()}
                    {state.step === 'complete' && renderComplete()}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default CashCSVUploadDialog;
