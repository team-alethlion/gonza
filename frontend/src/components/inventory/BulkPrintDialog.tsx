"use client";

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Product } from '@/types';
import { BulkOperationProgress } from './BulkOperationProgress';
import { Printer, Settings2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface BulkPrintDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedProducts: Product[];
    onConfirm: (showPrice: boolean) => void;
    isPrinting: boolean;
    printProgress?: {
        current: number;
        total: number;
    };
}

const BulkPrintDialog: React.FC<BulkPrintDialogProps> = ({
    open,
    onOpenChange,
    selectedProducts,
    onConfirm,
    isPrinting,
    printProgress
}) => {
    const [showPrice, setShowPrice] = useState(true);

    // Prevent dialog from closing during printing process
    const handleOpenChange = (newOpen: boolean) => {
        if (!isPrinting) {
            onOpenChange(newOpen);
        }
    };

    const productCount = selectedProducts.length;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Printer className="h-5 w-5" />
                        Print Barcode Labels
                    </DialogTitle>
                    <DialogDescription>
                        You are about to print barcodes for {productCount} product{productCount > 1 ? 's' : ''}.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2">
                            <Settings2 className="h-4 w-4 text-muted-foreground" />
                            <div className="space-y-0.5">
                                <Label htmlFor="bulk-print-price" className="text-sm font-medium cursor-pointer">
                                    Show Price on Label
                                </Label>
                                <p className="text-xs text-muted-foreground">Include selling price on each label</p>
                            </div>
                        </div>
                        <Switch
                            id="bulk-print-price"
                            checked={showPrice}
                            onCheckedChange={setShowPrice}
                            disabled={isPrinting}
                        />
                    </div>

                    <div className="max-h-40 overflow-y-auto border rounded-md p-2 bg-muted/10">
                        <div className="space-y-1">
                            {selectedProducts.map((product) => (
                                <div key={product.id} className="text-xs text-muted-foreground truncate px-2 py-1">
                                    • {product.name} ({product.itemNumber})
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                {isPrinting && printProgress && (
                    <BulkOperationProgress
                        title="Printing Labels..."
                        currentCount={printProgress.current}
                        totalCount={printProgress.total}
                        status="processing"
                    />
                )}

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                        disabled={isPrinting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => onConfirm(showPrice)}
                        disabled={isPrinting || productCount === 0}
                        className="gap-2"
                    >
                        {isPrinting ? (
                            `Printing... ${Math.round((printProgress?.current || 0) / (printProgress?.total || 1) * 100)}%`
                        ) : (
                            <>
                                <Printer className="h-4 w-4" />
                                Print {productCount} Label{productCount > 1 ? 's' : ''}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default BulkPrintDialog;
