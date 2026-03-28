/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useBusiness } from '@/contexts/BusinessContext';
import { useProducts } from '@/hooks/useProducts';
import { useToast } from '@/hooks/use-toast';
import { recordStockTransferAction, getStockTransfersAction } from '@/app/actions/inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, Plus, Send, AlertCircle, History, ArrowRight, Package } from 'lucide-react';
import ProductSuggestionsPanel from './ProductSuggestionsPanel';
import { useProductSuggestions } from '@/hooks/useProductSuggestions';
import { Product } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface TransferItem {
    id: string;
    productId: string;
    name: string;
    sku: string;
    availableStock: number;
    quantity: number;
    searchTerm: string;
}

// ─── Mobile card for a single line item ───────────────────────────────────────
const MobileTransferRow = ({
    item,
    isOver,
    onSearch,
    onFocus,
    onQuantityChange,
    onRemove,
    canRemove,
    focusedId,
    suggestions,
    panelOpen,
    closePanel,
    onProductSelect,
}: {
    item: TransferItem;
    isOver: boolean;
    onSearch: (id: string, val: string) => void;
    onFocus: (id: string) => void;
    onQuantityChange: (id: string, val: number) => void;
    onRemove: (id: string) => void;
    canRemove: boolean;
    focusedId: string | null;
    suggestions: Product[];
    panelOpen: boolean;
    closePanel: () => void;
    onProductSelect: (p: Product) => void;
}) => (
    <Card className={cn("mb-3", isOver && "border-destructive border-2", item.productId && "border-green-200")}>
        <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Product</span>
                <Button
                    variant="ghost" size="icon"
                    onClick={() => onRemove(item.id)}
                    disabled={!canRemove}
                    className="h-7 w-7 text-red-400 hover:text-red-600"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>
            <div className="relative">
                <Input
                    placeholder="Search product..."
                    value={item.searchTerm}
                    onChange={e => onSearch(item.id, e.target.value)}
                    onFocus={() => onFocus(item.id)}
                    className={cn(item.productId ? "border-green-300" : "")}
                />
                {focusedId === item.id && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1">
                        <ProductSuggestionsPanel
                            suggestions={suggestions}
                            isOpen={panelOpen}
                            onClose={closePanel}
                            onSelectProduct={onProductSelect}
                            searchTerm={item.searchTerm}
                        />
                    </div>
                )}
            </div>
            {item.productId && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-muted/50 p-2 rounded">
                        <p className="text-xs text-muted-foreground">In Stock</p>
                        <p className={cn("font-bold", isOver && "text-destructive")}>{item.availableStock}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">Transfer Qty</p>
                        <Input
                            type="number" min="1"
                            value={item.quantity}
                            onChange={e => onQuantityChange(item.id, parseInt(e.target.value) || 0)}
                            className="h-8 text-center font-bold"
                        />
                    </div>
                </div>
            )}
            {isOver && (
                <p className="text-xs text-destructive">⚠ Quantity exceeds available stock</p>
            )}
        </CardContent>
    </Card>
);

// ─── Main component ────────────────────────────────────────────────────────────
const StockTransferTab = () => {
    const { user } = useAuth();
    const { currentBusiness, businessLocations } = useBusiness();
    const { products, loadProducts } = useProducts(user?.id, 10000);
    const { toast } = useToast();

    // ── Form state ──
    const [destinationBranchId, setDestinationBranchId] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<TransferItem[]>([{
        id: '1', productId: '', name: '', sku: '', availableStock: 0, quantity: 1, searchTerm: ''
    }]);
    const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showOverstockConfirm, setShowOverstockConfirm] = useState(false);
    const [pendingTransferData, setPendingTransferData] = useState<any>(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [userInputCode, setUserInputCode] = useState('');

    // ── History state ──
    const [transfers, setTransfers] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [activeTab, setActiveTab] = useState('new');

    // ── Product suggestions ──
    const focusedRow = items.find(i => i.id === focusedRowId);
    const { suggestions, isOpen: panelOpen, closePanel } = useProductSuggestions(products, focusedRow?.searchTerm || '');

    const containerRef = useRef<HTMLDivElement>(null);

    const otherBranches = businessLocations.filter(b => b.id !== currentBusiness?.id);

    // Close suggestion panel when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setFocusedRowId(null);
                closePanel();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [closePanel]);

    // ── Load history ──
    const loadTransferHistory = useCallback(async () => {
        if (!currentBusiness?.id) return;
        setIsLoadingHistory(true);
        try {
            const result = await getStockTransfersAction(currentBusiness.id);
            if (result.success) {
                const raw = Array.isArray(result.data) ? result.data : (result.data as any)?.results || [];
                setTransfers(raw);
            }
        } finally {
            setIsLoadingHistory(false);
        }
    }, [currentBusiness?.id]);

    useEffect(() => {
        if (activeTab === 'history') {
            loadTransferHistory();
        }
    }, [activeTab, loadTransferHistory]);

    // ── Row helpers ──
    const updateRow = (id: string, updates: Partial<TransferItem>) =>
        setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));

    const handleProductSelect = useCallback((product: Product) => {
        if (!focusedRowId) return;
        updateRow(focusedRowId, {
            productId: product.id,
            name: product.name,
            sku: product.itemNumber || '',
            availableStock: product.quantity,
            searchTerm: product.name,
        });
        setFocusedRowId(null);
        closePanel();
    }, [focusedRowId, closePanel]); // eslint-disable-line

    const addRow = () => setItems(prev => [...prev, {
        id: Date.now().toString(), productId: '', name: '', sku: '', availableStock: 0, quantity: 1, searchTerm: ''
    }]);

    const removeRow = (id: string) => {
        if (items.length > 1) setItems(prev => prev.filter(i => i.id !== id));
    };

    const resetForm = () => {
        setItems([{ id: Date.now().toString(), productId: '', name: '', sku: '', availableStock: 0, quantity: 1, searchTerm: '' }]);
        setDestinationBranchId('');
        setNotes('');
    };

    // ── Validation ──
    const buildTransferPayload = () => {
        const validItems = items.filter(i => i.productId && i.quantity > 0);
        return {
            from_branch: currentBusiness!.id,
            to_branch: destinationBranchId,
            status: 'COMPLETED',
            notes: notes || `Transfer from ${currentBusiness?.name}`,
            items: validItems.map(i => ({ sku: i.sku, quantity: i.quantity })),
            _validItems: validItems,
        };
    };

    const handleInitiateTransfer = () => {
        if (!currentBusiness?.id || !destinationBranchId) {
            toast({ title: 'Error', description: 'Please select a destination branch.', variant: 'destructive' });
            return;
        }
        const validItems = items.filter(i => i.productId && i.quantity > 0);
        if (validItems.length === 0) {
            toast({ title: 'Error', description: 'Please add at least one product with quantity > 0.', variant: 'destructive' });
            return;
        }
        const overstockItems = validItems.filter(i => i.quantity > i.availableStock);
        const payload = buildTransferPayload();

        if (overstockItems.length > 0) {
            // Generate a random 6-character code
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            setVerificationCode(code);
            setUserInputCode('');
            setPendingTransferData(payload);
            setShowOverstockConfirm(true);
        } else {
            executeTransfer(payload);
        }
    };

    const executeTransfer = async (payload: any) => {
        setIsSubmitting(true);
        try {
            const { _validItems: _, ...data } = payload; // strip internal field
            const result = await recordStockTransferAction(data);
            if (result.success) {
                toast({ title: 'Transfer Complete', description: `Stock transferred to ${businessLocations.find(b => b.id === destinationBranchId)?.name}.` });
                resetForm();
                loadProducts();
            } else {
                toast({ title: 'Transfer Failed', description: result.error || 'Unknown error', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const overstockItems = items.filter(i => i.productId && i.quantity > i.availableStock);

    return (
        <div ref={containerRef}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                    <TabsTrigger value="new" className="gap-2"><Send className="h-4 w-4" />New Transfer</TabsTrigger>
                    <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" />Transfer History</TabsTrigger>
                </TabsList>

                {/* ── NEW TRANSFER TAB ── */}
                <TabsContent value="new">
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Send className="h-5 w-5 text-blue-500" />
                                    New Stock Transfer
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                {/* Destination + Notes */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Destination Branch <span className="text-destructive">*</span></label>
                                        <Select value={destinationBranchId} onValueChange={setDestinationBranchId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select target branch..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {otherBranches.map(b => (
                                                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                                ))}
                                                {otherBranches.length === 0 && (
                                                    <div className="p-2 text-sm text-muted-foreground text-center">No other branches available</div>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Notes / Memo</label>
                                        <Textarea
                                            placeholder="Optional: reason for transfer, reference number..."
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                            className="h-10 resize-none"
                                            rows={1}
                                        />
                                    </div>
                                </div>

                                {/* Add Item button */}
                                <div className="flex justify-end">
                                    <Button onClick={addRow} variant="outline" size="sm" className="gap-2">
                                        <Plus className="h-4 w-4" /> Add Item
                                    </Button>
                                </div>

                                {/* Desktop table */}
                                <div className="hidden md:block border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead>Product</TableHead>
                                                <TableHead className="text-center w-32">SKU</TableHead>
                                                <TableHead className="text-center w-28">Available</TableHead>
                                                <TableHead className="text-center w-28">Transfer Qty</TableHead>
                                                <TableHead className="w-12" />
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {items.map(item => {
                                                const isOver = item.productId ? item.quantity > item.availableStock : false;
                                                return (
                                                    <TableRow key={item.id} className={cn(isOver && "bg-red-50")}>
                                                        <TableCell>
                                                            <div className="relative">
                                                                <Input
                                                                    placeholder="Search product..."
                                                                    value={item.searchTerm}
                                                                    onChange={e => updateRow(item.id, { searchTerm: e.target.value })}
                                                                    onFocus={() => setFocusedRowId(item.id)}
                                                                    className={cn(item.productId ? "border-green-300" : "")}
                                                                />
                                                                {focusedRowId === item.id && (
                                                                    <div className="absolute top-full left-0 right-0 z-50 mt-1">
                                                                        <ProductSuggestionsPanel
                                                                            suggestions={suggestions}
                                                                            isOpen={panelOpen}
                                                                            onClose={closePanel}
                                                                            onSelectProduct={handleProductSelect}
                                                                            searchTerm={item.searchTerm}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                                            {item.sku || '—'}
                                                        </TableCell>
                                                        <TableCell className={cn("text-center font-bold", isOver && "text-destructive")}>
                                                            {item.availableStock || '—'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="number" min="1"
                                                                value={item.quantity}
                                                                onChange={e => updateRow(item.id, { quantity: parseInt(e.target.value) || 0 })}
                                                                className={cn("text-center font-black", isOver && "border-destructive text-destructive")}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                variant="ghost" size="icon"
                                                                onClick={() => removeRow(item.id)}
                                                                disabled={items.length === 1}
                                                                className="text-red-400 hover:text-red-600 hover:bg-red-50"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Mobile cards */}
                                <div className="md:hidden space-y-2">
                                    {items.map(item => {
                                        const isOver = item.productId ? item.quantity > item.availableStock : false;
                                        return (
                                            <MobileTransferRow
                                                key={item.id}
                                                item={item}
                                                isOver={isOver}
                                                onSearch={(id, val) => updateRow(id, { searchTerm: val })}
                                                onFocus={setFocusedRowId}
                                                onQuantityChange={(id, val) => updateRow(id, { quantity: val })}
                                                onRemove={removeRow}
                                                canRemove={items.length > 1}
                                                focusedId={focusedRowId}
                                                suggestions={suggestions}
                                                panelOpen={panelOpen}
                                                closePanel={closePanel}
                                                onProductSelect={handleProductSelect}
                                            />
                                        );
                                    })}
                                </div>

                                {/* Summary + submit */}
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-2 border-t">
                                    <div className="text-sm text-muted-foreground">
                                        {items.filter(i => i.productId).length} product{items.filter(i => i.productId).length !== 1 ? 's' : ''} · 
                                        {' '}{items.reduce((s, i) => s + (i.productId ? i.quantity : 0), 0)} units total
                                        {overstockItems.length > 0 && (
                                            <span className="ml-2 text-destructive font-medium">· {overstockItems.length} item(s) exceed available stock</span>
                                        )}
                                    </div>
                                    <Button
                                        onClick={handleInitiateTransfer}
                                        disabled={isSubmitting || !destinationBranchId}
                                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 px-8 min-w-[200px]"
                                    >
                                        {isSubmitting ? 'Processing...' : <><Send className="h-4 w-4" />Complete Transfer</>}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Info box */}
                        <Card className="bg-amber-50 border-amber-200">
                            <CardContent className="pt-4 pb-4">
                                <div className="flex gap-3">
                                    <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                    <div className="text-sm text-amber-900 space-y-1">
                                        <p className="font-semibold">How stock transfers work:</p>
                                        <ul className="list-disc pl-4 space-y-0.5 text-amber-800">
                                            <li>Stock is immediately deducted from <strong>this branch</strong> and added to the destination.</li>
                                            <li>Both branches receive a history entry (TRANSFER_OUT / TRANSFER_IN).</li>
                                            <li>Transfers are permanent — verify destination and quantities before submitting.</li>
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ── HISTORY TAB ── */}
                <TabsContent value="history">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <History className="h-5 w-5" />
                                Transfer History
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoadingHistory ? (
                                <div className="text-center py-10 text-muted-foreground">Loading transfers...</div>
                            ) : transfers.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground">
                                    <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                    <p>No transfers found for this branch.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {transfers.map((t: any) => {
                                        const fromBranch = businessLocations.find(b => b.id === t.from_branch);
                                        const toBranch = businessLocations.find(b => b.id === t.to_branch);
                                        const itemsList: any[] = t.items || [];
                                        return (
                                            <Card key={t.id} className="border shadow-none">
                                                <CardContent className="p-4">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 font-semibold text-sm">
                                                                <span>{fromBranch?.name || t.from_branch}</span>
                                                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                                                <span>{toBranch?.name || t.to_branch}</span>
                                                            </div>
                                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                                <span>{t.transfer_number || t.id}</span>
                                                                <span>·</span>
                                                                <span>{t.created_at ? format(new Date(t.created_at), 'MMM d, yyyy HH:mm') : '—'}</span>
                                                                {t.notes && <><span>·</span><span className="italic">{t.notes}</span></>}
                                                            </div>
                                                        </div>
                                                        <Badge variant={t.status === 'COMPLETED' ? 'default' : 'secondary'}>
                                                            {t.status || 'Unknown'}
                                                        </Badge>
                                                    </div>
                                                    {itemsList.length > 0 && (
                                                        <div className="mt-3 border-t pt-3">
                                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                                                                {itemsList.map((item: any, idx: number) => (
                                                                    <div key={idx} className="text-xs bg-muted/40 rounded px-2 py-1 flex justify-between gap-2">
                                                                        <span className="truncate text-muted-foreground">{item.product_name || item.sku}</span>
                                                                        <span className="font-semibold shrink-0">×{item.quantity}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                            <div className="pt-4 flex justify-end">
                                <Button variant="outline" size="sm" onClick={loadTransferHistory} disabled={isLoadingHistory}>
                                    Refresh
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* ── Overstock Confirmation Dialog ── */}
            <AlertDialog open={showOverstockConfirm} onOpenChange={setShowOverstockConfirm}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-5 w-5" />
                            Transfer Exceeds Available Stock
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-4">
                            <p>The following items have quantities that exceed what is currently available in this branch:</p>
                            <ul className="list-disc pl-5 space-y-1 bg-red-50 p-3 rounded border border-red-100 text-red-900">
                                {items
                                    .filter(i => i.productId && i.quantity > i.availableStock)
                                    .map(i => (
                                        <li key={i.id} className="text-xs">
                                            <strong>{i.name}</strong>: requesting {i.quantity}, have {i.availableStock}
                                        </li>
                                    ))}
                            </ul>
                            <div className="space-y-3 pt-2">
                                <p className="text-sm font-semibold text-gray-900">
                                    To proceed anyway and allow negative stock, please type the following code:
                                </p>
                                <div className="flex flex-col items-center gap-3">
                                    <div className="bg-muted px-4 py-2 rounded-md font-mono text-xl font-bold tracking-widest border-2 border-dashed select-none">
                                        {verificationCode}
                                    </div>
                                    <Input
                                        value={userInputCode}
                                        onChange={e => setUserInputCode(e.target.value.toUpperCase())}
                                        placeholder="Enter code here"
                                        className="text-center font-bold text-lg uppercase h-12"
                                        maxLength={6}
                                    />
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPendingTransferData(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90 text-white disabled:opacity-50"
                            disabled={userInputCode !== verificationCode}
                            onClick={() => {
                                if (pendingTransferData) {
                                    executeTransfer({ ...pendingTransferData, allow_negative: true });
                                }
                                setShowOverstockConfirm(false);
                            }}
                        >
                            Proceed Anyway
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default StockTransferTab;
