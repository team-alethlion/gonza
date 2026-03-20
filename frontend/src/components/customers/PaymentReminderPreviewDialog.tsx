"use client";
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { Download, Printer, Share2, X, Loader2, MessageCircle } from 'lucide-react';
import { Sale, Customer, BusinessSettings } from '@/types';
import { generatePaymentReminderPDF } from '@/utils/generatePaymentReminderPDF';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useToast } from '@/hooks/use-toast';
import { openWhatsApp } from '@/utils/smsUtils';
import { useBusiness } from '@/contexts/BusinessContext';

interface PaymentReminderPreviewDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    sale: Sale | null;
    customer?: Customer | null;
    unpaidSales?: Sale[];
}

const PaymentReminderPreviewDialog: React.FC<PaymentReminderPreviewDialogProps> = ({
    isOpen,
    onOpenChange,
    sale,
    customer,
    unpaidSales
}) => {
    const isMobile = useIsMobile();
    const { settings, isLoading: settingsLoading } = useBusinessSettings();
    const { currentBusiness } = useBusiness();
    const { toast } = useToast();
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Prepare customer and sales data without making redundant requests
    // Using sale data directly satisfies our PDF generation needs since we only need name, contact, and address
    const targetCustomer: Customer | null = customer || (sale ? {
        id: 'placeholder',
        fullName: sale.customerName,
        phoneNumber: sale.customerContact,
        email: null,
        location: sale.customerAddress || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lifetimeValue: 0,
        orderCount: 0,
        categoryId: null,
        birthday: null,
        socialMedia: null,
        gender: null,
        tags: null,
        notes: null,
        branchId: currentBusiness?.id || 'placeholder'
    } as Customer : null);

    const targetSales = unpaidSales || (sale ? [sale] : []);

    // Calculate total amount due
    const totalAmountDue = targetSales.reduce((sum, s) => {
        const subtotal = s.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
        const taxAmount = subtotal * ((s.taxRate || 0) / 100);
        return sum + subtotal + taxAmount;
    }, 0);

    useEffect(() => {
        if (isOpen && targetCustomer && targetSales.length > 0 && settings) {
            generatePreview();
        } else if (!isOpen) {
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
                setPdfUrl(null);
            }
        }
    }, [isOpen, settings]);

    const generatePreview = async () => {
        if (!targetCustomer || targetSales.length === 0 || !settings) return;

        setIsGenerating(true);
        try {
            const blob = await generatePaymentReminderPDF(
                targetCustomer,
                targetSales,
                totalAmountDue,
                settings,
                undefined,
                'blob'
            ) as Blob;

            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
            setPdfBlob(blob);
        } catch (error) {
            console.error('Error generating preview:', error);
            toast({
                title: "Error",
                description: "Failed to generate PDF preview.",
                variant: "destructive"
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = async () => {
        if (!targetCustomer || targetSales.length === 0 || !settings) return;
        try {
            await generatePaymentReminderPDF(
                targetCustomer,
                targetSales,
                totalAmountDue,
                settings,
                undefined,
                'save'
            );
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to download PDF.",
                variant: "destructive"
            });
        }
    };

    const handlePrint = () => {
        if (pdfUrl) {
            const printWindow = window.open(pdfUrl);
            if (printWindow) {
                printWindow.addEventListener('load', () => {
                    printWindow.print();
                });
            }
        }
    };

    const handleShare = async () => {
        const fileName = `Payment_Reminder_${targetCustomer?.fullName.replace(/\s+/g, '_') || 'Customer'}.pdf`;
        const message = `Hello ${targetCustomer?.fullName || 'Customer'}, this is a payment reminder from ${settings?.businessName || 'our business'} regarding your outstanding balance of ${settings?.currency || ''} ${totalAmountDue.toLocaleString()}.`;

        if (navigator.share && pdfBlob) {
            try {
                const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

                // Check if sharing files is supported
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'Payment Reminder',
                        text: message,
                    });
                    return; // Success
                }

                // If can't share files, try sharing just text
                await navigator.share({
                    title: 'Payment Reminder',
                    text: message,
                });
            } catch (error) {
                if ((error as Error).name !== 'AbortError') {
                    console.error('Error sharing:', error);
                }
            }
        } else if (navigator.share) {
            // No blob yet, just share text
            try {
                await navigator.share({
                    title: 'Payment Reminder',
                    text: message,
                });
            } catch (error) {
                if ((error as Error).name !== 'AbortError') {
                    console.error('Error sharing:', error);
                }
            }
        } else {
            // Fallback: copy to clipboard
            try {
                await navigator.clipboard.writeText(message);
                toast({
                    title: "Copied to clipboard",
                    description: "Payment reminder summary copied to clipboard.",
                });
            } catch (err) {
                toast({
                    title: "Share failed",
                    description: "Could not share or copy the message.",
                    variant: "destructive"
                });
            }
        }
    };

    const Content = () => (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex flex-wrap gap-2 justify-center py-2 order-first">
                <Button
                    variant="outline"
                    onClick={handleShare}
                    className="flex-1 min-w-[120px] bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                >
                    <Share2 className="h-4 w-4 mr-2 text-blue-600" />
                    Share
                </Button>
                <Button
                    variant="outline"
                    onClick={handlePrint}
                    className="flex-1 min-w-[120px]"
                    disabled={!pdfUrl}
                >
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                </Button>
                <Button
                    onClick={handleDownload}
                    className="flex-1 min-w-[120px] bg-orange-500 hover:bg-orange-600"
                >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                </Button>
            </div>

            <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden min-h-[600px] relative">
                {isGenerating ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 bg-white/50 backdrop-blur-sm">
                        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                        <p className="text-sm font-medium text-gray-600">Generating preview...</p>
                    </div>
                ) : pdfUrl ? (
                    <iframe
                        src={pdfUrl}
                        className="w-full h-full min-h-[600px] border-none"
                        title="Payment Reminder Preview"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-sm text-gray-500">Preview not available.</p>
                    </div>
                )}
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={onOpenChange}>
                <DrawerContent className="max-h-[95vh]">
                    <DrawerHeader className="border-b pb-2">
                        <div className="flex items-center justify-between">
                            <DrawerTitle>Payment Reminder Preview</DrawerTitle>
                            <DrawerClose asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <X className="h-4 w-4" />
                                </Button>
                            </DrawerClose>
                        </div>
                    </DrawerHeader>
                    <div className="px-4 py-4 overflow-y-auto">
                        <Content />
                    </div>
                    <DrawerFooter className="pt-2 border-t">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle>Payment Reminder Preview</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    <Content />
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default PaymentReminderPreviewDialog;
