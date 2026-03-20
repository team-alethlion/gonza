"use client";
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, LayoutGrid, Upload, Download, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpenseCenterProps {
    onNewEntry: () => void;
    onBulkEntry: () => void;
    onImportCSV: () => void;
    canCreate?: boolean;
}

const ExpenseCenter: React.FC<ExpenseCenterProps> = ({
    onNewEntry,
    onBulkEntry,
    onImportCSV,
    canCreate = true
}) => {
    return (
        <Card className="border-none shadow-md overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 mb-6">
            <div className="p-4 sm:p-6 space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                        <h3 className="text-lg font-bold tracking-tight">Expense Center</h3>
                        <p className="text-xs text-muted-foreground">Manage your business expenditures efficiently</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Primary Action - New Single Entry */}
                    <Button
                        type="button"
                        onClick={onNewEntry}
                        disabled={!canCreate}
                        className={cn(
                            "h-auto py-4 flex flex-col items-center justify-center gap-2 text-white shadow-lg border-none active:scale-[0.98] transition-all",
                            canCreate ? "bg-red-600 hover:bg-red-700" : "bg-slate-400 cursor-not-allowed opacity-60"
                        )}
                    >
                        <div className="bg-white/20 p-2 rounded-lg">
                            <Plus className="h-5 w-5" />
                        </div>
                        <div className="text-center">
                            <span className="block font-bold">New Entry</span>
                            <span className="block text-[10px] opacity-80 font-medium">Single Expense</span>
                        </div>
                    </Button>

                    {/* Bulk Entry */}
                    <Button
                        type="button"
                        onClick={onBulkEntry}
                        variant="outline"
                        disabled={!canCreate}
                        className={cn(
                            "h-auto py-4 flex flex-col items-center justify-center gap-2 border-slate-200 dark:border-slate-800 shadow-sm active:scale-[0.98] transition-all",
                            canCreate ? "hover:bg-orange-50/50 dark:hover:bg-orange-900/10 hover:border-orange-200" : "opacity-60 cursor-not-allowed"
                        )}
                    >
                        <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg text-orange-600 dark:text-orange-400">
                            <LayoutGrid className="h-5 w-5" />
                        </div>
                        <div className="text-center">
                            <span className="block font-bold">Bulk Entry</span>
                            <span className="block text-[10px] text-muted-foreground font-medium">Manual Batch</span>
                        </div>
                    </Button>

                    {/* CSV Import */}
                    <Button
                        type="button"
                        onClick={onImportCSV}
                        variant="outline"
                        disabled={!canCreate}
                        className={cn(
                            "h-auto py-4 flex flex-col items-center justify-center gap-2 border-slate-200 dark:border-slate-800 shadow-sm active:scale-[0.98] transition-all",
                            canCreate ? "hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 hover:border-emerald-200" : "opacity-60 cursor-not-allowed"
                        )}
                    >
                        <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
                            <Upload className="h-5 w-5" />
                        </div>
                        <div className="text-center">
                            <span className="block font-bold">Import CSV</span>
                            <span className="block text-[10px] text-muted-foreground font-medium">Process Legacy Logs</span>
                        </div>
                    </Button>
                </div>
            </div>
        </Card>
    );
};

export default ExpenseCenter;
