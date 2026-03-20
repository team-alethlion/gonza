"use client";
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Download } from 'lucide-react';

export interface BarcodeExportConfig {
    showPrice: boolean;
}

interface BarcodeExportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    productCount: number;
    onConfirm: (config: BarcodeExportConfig) => void;
    isExporting: boolean;
}

const BarcodeExportDialog: React.FC<BarcodeExportDialogProps> = ({
    open,
    onOpenChange,
    productCount,
    onConfirm,
    isExporting,
}) => {
    const [showPrice, setShowPrice] = useState(true);

    const handleConfirm = () => {
        onConfirm({
            showPrice,
        });
    };

    // Standardized calculation for A4 (210x297mm) with 10mm margins
    // 50x30mm labels with 2mm spacing
    const calculateLayout = () => {
        const labelWidth = 45;
        const labelHeight = 30;
        const spacing = 2;
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 10;

        const cols = Math.floor((pageWidth - (2 * margin) + spacing) / (labelWidth + spacing));
        const rows = Math.floor((pageHeight - (2 * margin) + spacing) / (labelHeight + spacing));

        return { cols, rows, itemsPerPage: cols * rows };
    };

    const calculatePages = () => {
        const { itemsPerPage } = calculateLayout();
        return Math.ceil(productCount / itemsPerPage);
    };

    const { cols, rows, itemsPerPage } = calculateLayout();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Export Barcodes to PDF</DialogTitle>
                    <DialogDescription>
                        Barcodes are automatically arranged on A4 paper (45mm × 30mm labels).
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Product Count Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-900">
                            <strong>{productCount}</strong> product{productCount !== 1 ? 's' : ''} with barcodes will be exported
                        </p>
                    </div>

                    {/* Layout Info */}
                    <div className="space-y-2">
                        <Label className="text-base font-semibold">Automatic Layout</Label>
                        <div className="text-sm text-muted-foreground space-y-1">
                            <p>• {cols} columns × {rows} rows</p>
                            <p>• {itemsPerPage} barcodes per page</p>
                            <p>• Fixed size: 45mm × 30mm</p>
                        </div>
                    </div>

                    {/* Show Price Toggle */}
                    <div className="flex items-center justify-between py-2 border-t">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-medium">Include Price</Label>
                            <p className="text-xs text-muted-foreground">Show product price on each barcode</p>
                        </div>
                        <Switch
                            checked={showPrice}
                            onCheckedChange={setShowPrice}
                        />
                    </div>

                    {/* Estimated Pages */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <p className="text-sm text-gray-700">
                            <strong>Estimated pages:</strong> {calculatePages()}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                    <Button
                        onClick={handleConfirm}
                        disabled={isExporting}
                        className="w-full gap-2"
                    >
                        <Download className="h-4 w-4" />
                        {isExporting ? 'Exporting...' : 'Export PDF'}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isExporting}
                        className="w-full"
                    >
                        Cancel
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default BarcodeExportDialog;
