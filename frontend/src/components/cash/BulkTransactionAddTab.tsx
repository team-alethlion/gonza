"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Plus, Trash2, ArrowUp, ArrowDown, Save, X, Info } from 'lucide-react';
import { CashTransactionFormData } from '@/types/cash';
import { useCashTransactions } from '@/hooks/useCashTransactions';
import { useCashAccounts } from '@/hooks/useCashAccounts';
import { useAuth } from '@/components/auth/AuthProvider';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TransactionRow extends CashTransactionFormData {
    id: string;
}

interface BulkTransactionAddTabProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    accountId: string;
    onSuccess: () => void;
}

const STORAGE_KEY = 'bulk_transactions_draft';

const BulkTransactionAddTab: React.FC<BulkTransactionAddTabProps> = ({
    open,
    onOpenChange,
    accountId,
    onSuccess,
}) => {
    const isMobile = useIsMobile();
    const { user } = useAuth();
    const { accounts } = useCashAccounts();
    const { createBulkTransactions } = useCashTransactions(accountId);
    const [rows, setRows] = useState<TransactionRow[]>([]);
    const [globalDate, setGlobalDate] = useState<Date>(new Date());
    const [isSaving, setIsSaving] = useState(false);

    // Load draft from localStorage
    useEffect(() => {
        if (!open) return;

        const savedDraft = localStorage.getItem(STORAGE_KEY);
        if (savedDraft) {
            try {
                const parsed = JSON.parse(savedDraft);
                setRows(parsed.map((r: any) => ({ ...r, date: new Date(r.date) })));
            } catch (e) {
                console.error('Failed to parse draft', e);
                addEmptyRow();
            }
        } else {
            setRows([]);
            addEmptyRow();
        }
    }, [open]);

    // Save draft to localStorage whenever rows change
    useEffect(() => {
        if (rows.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, [rows]);

    const addEmptyRow = () => {
        const newId = Math.random().toString(36).substr(2, 9);
        const newRow: TransactionRow = {
            id: newId,
            accountId: accountId,
            amount: 0,
            transactionType: 'cash_in',
            description: '',
            category: 'Other',
            paymentMethod: 'Cash',
            personInCharge: '',
            tags: [],
            date: globalDate, // Use the default/global date for new rows
            receiptImage: ''
        };
        setRows(prev => [...prev, newRow]);
    };

    const removeRow = (id: string) => {
        setRows(prev => prev.filter(r => r.id !== id));
        if (rows.length === 1) {
            addEmptyRow();
        }
    };

    const updateRow = (id: string, updates: Partial<TransactionRow>) => {
        setRows(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    };

    const moveRow = (id: string, direction: 'up' | 'down') => {
        const index = rows.findIndex(r => r.id === id);
        if (index < 0) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === rows.length - 1) return;

        const newRows = [...rows];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newRows[index], newRows[targetIndex]] = [newRows[targetIndex], newRows[index]];
        setRows(newRows);
    };

    const handleSaveAll = async () => {
        const validRows = rows.filter(r => r.amount > 0 && r.description.trim() !== '');
        if (validRows.length === 0) {
            alert('Please enter at least one valid transaction with amount and description');
            return;
        }

        // Verify transfers have a destination
        const invalidTransfers = validRows.filter(r => r.transactionType === 'transfer' && !r.toAccountId);
        if (invalidTransfers.length > 0) {
            alert('Please select a destination account for all transfers');
            return;
        }

        setIsSaving(true);
        try {
            // Use the date from each individual row
            await createBulkTransactions(validRows.map(({ id, ...rest }) => ({ ...rest })));
            localStorage.removeItem(STORAGE_KEY);
            onSuccess();
        } catch (e) {
            console.error('Bulk save failed', e);
            alert('Failed to save transactions. Please check your network connection.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        if (isSaving) return;
        onOpenChange(false);
    };

    const renderDesktop = () => (
        <div className="overflow-x-auto rounded-md border">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="w-[140px]">Date</TableHead>
                        <TableHead className="w-[130px]">Type</TableHead>
                        <TableHead className="w-[130px]">Amount</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[140px]">Category</TableHead>
                        <TableHead className="w-[150px]">Details</TableHead>
                        <TableHead className="w-[120px] text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((row) => (
                        <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className={cn("w-full justify-start text-left font-normal h-9", !row.date && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="mr-2 h-3 w-3 shrink-0" />
                                            <span className="truncate">{row.date ? format(row.date, "MMM dd, yyyy") : "Date"}</span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 z-[70]" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={row.date}
                                            onSelect={(date) => date && updateRow(row.id, { date })}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </TableCell>
                            <TableCell>
                                <Select
                                    value={row.transactionType}
                                    onValueChange={(val: any) => updateRow(row.id, { transactionType: val })}
                                >
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cash_in">Cash In</SelectItem>
                                        <SelectItem value="cash_out">Cash Out</SelectItem>
                                        <SelectItem value="transfer">Transfer</SelectItem>
                                    </SelectContent>
                                </Select>
                                {row.transactionType === 'transfer' && (
                                    <div className="mt-1.5">
                                        <Select
                                            value={row.toAccountId}
                                            onValueChange={(val) => updateRow(row.id, { toAccountId: val })}
                                        >
                                            <SelectTrigger className="text-[10px] h-7 px-2">
                                                <SelectValue placeholder="To Account" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {accounts.filter(a => a.id !== accountId).map(acc => (
                                                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </TableCell>
                            <TableCell>
                                <Input
                                    type="number"
                                    value={row.amount || ''}
                                    onChange={(e) => updateRow(row.id, { amount: Number(e.target.value) })}
                                    className="h-9 font-medium"
                                    placeholder="0.00"
                                />
                            </TableCell>
                            <TableCell>
                                <Input
                                    value={row.description}
                                    onChange={(e) => updateRow(row.id, { description: e.target.value })}
                                    placeholder="Description..."
                                    className="h-9"
                                />
                            </TableCell>
                            <TableCell>
                                <Select
                                    value={row.category}
                                    onValueChange={(val) => updateRow(row.id, { category: val })}
                                >
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Sales">Sales</SelectItem>
                                        <SelectItem value="Expenses">Expenses</SelectItem>
                                        <SelectItem value="Payroll">Payroll</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </TableCell>
                            <TableCell className="space-y-1">
                                <Input
                                    placeholder="Payment Method"
                                    value={row.paymentMethod}
                                    onChange={(e) => updateRow(row.id, { paymentMethod: e.target.value })}
                                    className="text-[10px] h-7 px-1.5"
                                />
                                <Input
                                    placeholder="Person In Charge"
                                    value={row.personInCharge}
                                    onChange={(e) => updateRow(row.id, { personInCharge: e.target.value })}
                                    className="text-[10px] h-7 px-1.5"
                                />
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-0.5">
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => moveRow(row.id, 'up')}>
                                        <ArrowUp className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => moveRow(row.id, 'down')}>
                                        <ArrowDown className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => removeRow(row.id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );

    const renderMobile = () => (
        <div className="space-y-4 px-1">
            {rows.map((row, index) => (
                <Card key={row.id} className="overflow-hidden border-l-4 border-l-primary/30">
                    <CardHeader className="flex flex-row items-center justify-between p-3 pb-2 bg-muted/20">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Transaction {index + 1}
                        </CardTitle>
                        <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => moveRow(row.id, 'up')}>
                                <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive/70" onClick={() => removeRow(row.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-3 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={cn("w-full justify-start text-left font-normal h-9", !row.date && "text-muted-foreground")}
                                    >
                                        <CalendarIcon className="mr-2 h-3 w-3" />
                                        <span className="truncate text-xs">{row.date ? format(row.date, "MMM dd, yyyy") : "Date"}</span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 z-[70]" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={row.date}
                                        onSelect={(date) => date && updateRow(row.id, { date })}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <Select
                                value={row.transactionType}
                                onValueChange={(val: any) => updateRow(row.id, { transactionType: val })}
                            >
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash_in">Cash In</SelectItem>
                                    <SelectItem value="cash_out">Cash Out</SelectItem>
                                    <SelectItem value="transfer">Transfer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <Input
                                type="number"
                                placeholder="Amount"
                                value={row.amount || ''}
                                onChange={(e) => updateRow(row.id, { amount: Number(e.target.value) })}
                                className="h-9 font-medium"
                            />
                            <Select
                                value={row.category}
                                onValueChange={(val) => updateRow(row.id, { category: val })}
                            >
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Sales">Sales</SelectItem>
                                    <SelectItem value="Expenses">Expenses</SelectItem>
                                    <SelectItem value="Payroll">Payroll</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {row.transactionType === 'transfer' && (
                            <Select
                                value={row.toAccountId}
                                onValueChange={(val) => updateRow(row.id, { toAccountId: val })}
                            >
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Target Account" />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.filter(a => a.id !== accountId).map(acc => (
                                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        <Input
                            placeholder="Description"
                            value={row.description}
                            onChange={(e) => updateRow(row.id, { description: e.target.value })}
                            className="h-9"
                        />

                        <div className="grid grid-cols-2 gap-2">
                            <Input
                                placeholder="Payment Method"
                                value={row.paymentMethod}
                                onChange={(e) => updateRow(row.id, { paymentMethod: e.target.value })}
                                className="h-8 text-[11px]"
                            />
                            <Input
                                placeholder="Person In Charge"
                                value={row.personInCharge}
                                onChange={(e) => updateRow(row.id, { personInCharge: e.target.value })}
                                className="h-8 text-[11px]"
                            />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={(val) => !isSaving && onOpenChange(val)}>
            <DialogContent className="max-w-6xl w-[95vw] h-[95vh] sm:h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
                <DialogHeader className="p-6 pb-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 border-b">
                    <div className="flex justify-between items-start">
                        <div>
                            <DialogTitle className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <Wallet className="h-5 w-5 text-blue-600" />
                                Bulk Transaction Entry
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 dark:text-slate-400 mt-1">
                                Add multiple records at once. Each row can have its own date and details.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/30 dark:bg-slate-950/30">
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border space-y-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                <Alert className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900 py-2">
                                    <Info className="h-4 w-4 text-blue-500" />
                                    <AlertDescription className="text-[11px] sm:text-xs">
                                        Use the <strong>Default Date</strong> to quickly set dates for newly added rows.
                                    </AlertDescription>
                                </Alert>
                            </div>
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="flex-1 md:flex-initial">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 ml-1">Default Date</p>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className={cn("justify-start text-left font-normal w-full md:w-[200px] h-10 shadow-sm", !globalDate && "text-muted-foreground")}>
                                                <CalendarIcon className="mr-2 h-4 w-4 text-blue-500" />
                                                {globalDate ? format(globalDate, "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 z-[80]" align="end">
                                            <Calendar
                                                mode="single"
                                                selected={globalDate}
                                                onSelect={(date) => date && setGlobalDate(date)}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="flex items-end h-full">
                                    <Button
                                        onClick={addEmptyRow}
                                        variant="secondary"
                                        className="gap-2 h-10 font-semibold border border-slate-200 dark:border-slate-800"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add Row
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="min-h-[200px]">
                            {isMobile ? renderMobile() : renderDesktop()}
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center p-6 border-t bg-white dark:bg-slate-900 shrink-0">
                    <div className="text-sm font-medium text-slate-500">
                        Total Valid: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{rows.filter(r => r.amount > 0).length}</span>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="ghost"
                            onClick={handleCancel}
                            disabled={isSaving}
                            className="gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            <X className="h-4 w-4" />
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveAll}
                            disabled={isSaving}
                            className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md transition-all active:scale-[0.98]"
                        >
                            {isSaving ? <Save className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save {rows.filter(r => r.amount > 0).length} Transactions
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// Internal icon for naming consistency but imports lucide-react Wallet
const Wallet = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
);

export default BulkTransactionAddTab;
