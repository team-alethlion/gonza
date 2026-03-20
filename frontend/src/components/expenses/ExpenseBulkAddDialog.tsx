"use client";
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Plus, Trash2, ArrowUp, ArrowDown, Save, X, Info, Receipt, Wallet, Link } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface ExpenseRow {
    id: string;
    amount: number;
    description: string;
    category: string;
    date: Date;
    paymentMethod: string;
    personInCharge: string;
    linkToCash: boolean;
    cashAccountId?: string;
}

interface ExpenseBulkAddDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

const STORAGE_KEY = 'bulk_expenses_draft';

const ExpenseBulkAddDialog: React.FC<ExpenseBulkAddDialogProps> = ({
    open,
    onOpenChange,
    onSuccess
}) => {
    const isMobile = useIsMobile();
    const { user } = useAuth();
    const { accounts } = useCashAccounts();
    const { createBulkExpenses } = useExpenses();
    const [rows, setRows] = useState<ExpenseRow[]>([]);
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
        const newRow: ExpenseRow = {
            id: newId,
            amount: 0,
            description: '',
            category: 'Other',
            date: globalDate,
            paymentMethod: 'Cash',
            personInCharge: '',
            linkToCash: false,
            cashAccountId: accounts.length > 0 ? accounts[0].id : undefined
        };
        setRows(prev => [...prev, newRow]);
    };

    const removeRow = (id: string) => {
        setRows(prev => prev.filter(r => r.id !== id));
        if (rows.length === 1) {
            addEmptyRow();
        }
    };

    const updateRow = (id: string, updates: Partial<ExpenseRow>) => {
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
            alert('Please enter at least one valid expense with amount and description');
            return;
        }

        const invalidLinks = validRows.filter(r => r.linkToCash && !r.cashAccountId);
        if (invalidLinks.length > 0) {
            alert('Please select a finance account for all linked expenses');
            return;
        }

        setIsSaving(true);
        try {
            await createBulkExpenses(validRows.map(({ id, ...rest }) => ({ ...rest })));
            localStorage.removeItem(STORAGE_KEY);
            onSuccess();
        } catch (e) {
            console.error('Bulk save failed', e);
            alert('Failed to save expenses. Please check your network connection.');
        } finally {
            setIsSaving(false);
        }
    };

    const renderDesktop = () => (
        <div className="overflow-x-auto rounded-xl border-none shadow-sm bg-white dark:bg-slate-900">
            <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                    <TableRow>
                        <TableHead className="w-[140px]">Date</TableHead>
                        <TableHead className="w-[130px]">Amount</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[140px]">Category</TableHead>
                        <TableHead className="w-[180px]">Link to Cash</TableHead>
                        <TableHead className="w-[120px] text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((row) => (
                        <TableRow key={row.id} className="hover:bg-muted/30 transition-colors border-slate-100 dark:border-slate-800">
                            <TableCell>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className={cn("w-full justify-start text-left font-normal h-9 rounded-lg", !row.date && "text-muted-foreground")}
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
                                <Input
                                    type="number"
                                    value={row.amount || ''}
                                    onChange={(e) => updateRow(row.id, { amount: Number(e.target.value) })}
                                    className="h-9 font-medium rounded-lg"
                                    placeholder="0.00"
                                />
                            </TableCell>
                            <TableCell>
                                <Input
                                    value={row.description}
                                    onChange={(e) => updateRow(row.id, { description: e.target.value })}
                                    placeholder="Description..."
                                    className="h-9 rounded-lg"
                                />
                            </TableCell>
                            <TableCell>
                                <Select
                                    value={row.category}
                                    onValueChange={(val) => updateRow(row.id, { category: val })}
                                >
                                    <SelectTrigger className="h-9 rounded-lg">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Sales">Sales</SelectItem>
                                        <SelectItem value="Expenses">Expenses</SelectItem>
                                        <SelectItem value="Payroll">Payroll</SelectItem>
                                        <SelectItem value="Supplies">Supplies</SelectItem>
                                        <SelectItem value="Utilities">Utilities</SelectItem>
                                        <SelectItem value="Rent">Rent</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col gap-1.5 p-1 bg-slate-50/50 dark:bg-slate-800/50 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`link-${row.id}`}
                                            checked={row.linkToCash}
                                            onCheckedChange={(checked) => updateRow(row.id, { linkToCash: !!checked })}
                                        />
                                        <Label htmlFor={`link-${row.id}`} className="text-[10px] font-medium text-slate-600">Link Transaction</Label>
                                    </div>
                                    {row.linkToCash && (
                                        <Select
                                            value={row.cashAccountId}
                                            onValueChange={(val) => updateRow(row.id, { cashAccountId: val })}
                                        >
                                            <SelectTrigger className="text-[10px] h-7 px-2 rounded-md">
                                                <SelectValue placeholder="Select Account" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {accounts.map(acc => (
                                                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
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
                <Card key={row.id} className="overflow-hidden border-l-4 border-l-red-500/30 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between p-3 pb-2 bg-muted/20">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Expense {index + 1}
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
                                        className={cn("w-full justify-start text-left font-normal h-9 rounded-lg", !row.date && "text-muted-foreground")}
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
                            <Input
                                type="number"
                                placeholder="Amount"
                                value={row.amount || ''}
                                onChange={(e) => updateRow(row.id, { amount: Number(e.target.value) })}
                                className="h-9 font-medium rounded-lg"
                            />
                        </div>

                        <Input
                            placeholder="Description"
                            value={row.description}
                            onChange={(e) => updateRow(row.id, { description: e.target.value })}
                            className="h-9 rounded-lg"
                        />

                        <div className="grid grid-cols-2 gap-2">
                            <Select
                                value={row.category}
                                onValueChange={(val) => updateRow(row.id, { category: val })}
                            >
                                <SelectTrigger className="h-9 text-xs rounded-lg">
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Sales">Sales</SelectItem>
                                    <SelectItem value="Expenses">Expenses</SelectItem>
                                    <SelectItem value="Payroll">Payroll</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={row.paymentMethod}
                                onValueChange={(val) => updateRow(row.id, { paymentMethod: val })}
                            >
                                <SelectTrigger className="h-9 text-xs rounded-lg">
                                    <SelectValue placeholder="Method" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Cash">Cash</SelectItem>
                                    <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                                    <SelectItem value="Bank">Bank</SelectItem>
                                    <SelectItem value="Card">Card</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-2 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id={`link-mobile-${row.id}`}
                                    checked={row.linkToCash}
                                    onCheckedChange={(checked) => updateRow(row.id, { linkToCash: !!checked })}
                                />
                                <Label htmlFor={`link-mobile-${row.id}`} className="text-xs font-medium">Link to Finance Account</Label>
                            </div>
                            {row.linkToCash && (
                                <Select
                                    value={row.cashAccountId}
                                    onValueChange={(val) => updateRow(row.id, { cashAccountId: val })}
                                >
                                    <SelectTrigger className="h-9 text-xs rounded-md">
                                        <SelectValue placeholder="Select Account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accounts.map(acc => (
                                            <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] md:max-w-6xl p-0 overflow-hidden border-none bg-transparent shadow-none">
                <div className="space-y-4 md:space-y-6">
                    <Card className="shadow-2xl overflow-hidden border-none bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
                        <CardHeader className="pb-3 bg-white dark:bg-slate-900 border-b">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg">
                                            <Receipt className="h-5 w-5 text-red-600" />
                                        </div>
                                        <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-100">
                                            Bulk Expense Entry
                                        </CardTitle>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Log multiple expenses efficiently. Link them to finance accounts to update cash ledgers automatically.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
                                        <X className="h-4 w-4 mr-2" />
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSaveAll}
                                        disabled={isSaving}
                                        className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 shadow-lg font-bold"
                                    >
                                        {isSaving ? <Save className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                        Save {rows.filter(r => r.amount > 0).length} Expenses
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                            <div className="bg-white dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800 space-y-4">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="flex items-center gap-3 w-full md:w-auto">
                                        <div className="flex-1 md:flex-initial">
                                            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 ml-1">Default Date</p>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className={cn("justify-start text-left font-normal w-full md:w-[220px] h-10 shadow-sm rounded-lg", !globalDate && "text-muted-foreground")}>
                                                        <CalendarIcon className="mr-2 h-4 w-4 text-red-500" />
                                                        {globalDate ? format(globalDate, "PPP") : <span>Pick a date</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0 z-[100]" align="start">
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
                                                variant="outline"
                                                className="gap-2 h-10 font-semibold border-red-200 dark:border-red-900/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg"
                                            >
                                                <Plus className="h-4 w-4" />
                                                Add Row
                                            </Button>
                                        </div>
                                    </div>

                                    <Alert className="bg-orange-50/50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900 py-2 w-full md:max-w-xs">
                                        <Info className="h-4 w-4 text-orange-500" />
                                        <AlertDescription className="text-[10px] sm:text-xs">
                                            Rows with <strong>Link Transaction</strong> checked will automatically create cash deductions.
                                        </AlertDescription>
                                    </Alert>
                                </div>

                                <div className="min-h-[300px]">
                                    {isMobile ? renderMobile() : renderDesktop()}
                                </div>

                                {rows.length > 5 && (
                                    <div className="flex justify-center pt-2">
                                        <Button
                                            onClick={addEmptyRow}
                                            variant="ghost"
                                            className="gap-2 text-muted-foreground hover:text-red-500"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Add Another Row
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ExpenseBulkAddDialog;
