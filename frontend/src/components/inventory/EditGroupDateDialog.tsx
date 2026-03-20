"use client";
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StockHistoryEntry } from '@/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useProducts } from '@/hooks/useProducts';
import { useAuth } from '@/components/auth/AuthProvider';

interface EditGroupDateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    group: { supplier?: string; invoice?: string; date: Date; entries: StockHistoryEntry[] } | null;
    onConfirm: (newDate: Date) => Promise<boolean>;
}

export const EditGroupDateDialog: React.FC<EditGroupDateDialogProps> = ({
    open,
    onOpenChange,
    group,
    onConfirm,
}) => {
    const { user } = useAuth();
    const { products } = useProducts(user?.id);
    const [newDate, setNewDate] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationError, setValidationError] = useState<string>('');
    const { toast } = useToast();

    useEffect(() => {
        if (group) {
            setNewDate(format(new Date(group.date), 'yyyy-MM-dd'));
            setValidationError('');
        }
    }, [group]);

    const handleDateChange = (value: string) => {
        setNewDate(value);
        setValidationError('');
    };

    const validateDate = (): boolean => {
        if (!group || !newDate) return false;

        const selectedDate = new Date(newDate);
        selectedDate.setHours(23, 59, 59, 999); // Allow same day

        // Check against all products in the group
        for (const entry of group.entries) {
            const product = products.find(p => p.id === entry.productId);
            if (product && product.createdAt) {
                const createdAt = new Date(product.createdAt);
                if (selectedDate < createdAt) {
                    setValidationError(`New date cannot be earlier than product creation date (${format(createdAt, 'PP')}) for ${product.name}.`);
                    return false;
                }
            }
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!group || !newDate) return;

        if (!validateDate()) return;

        setIsSubmitting(true);
        try {
            const success = await onConfirm(new Date(newDate));
            if (success) {
                toast({
                    title: "Dates updated",
                    description: "All entries in this invoice have been updated to the new date."
                });
                onOpenChange(false);
            }
        } catch (error) {
            console.error('Error updating group date:', error);
            toast({
                title: "Update failed",
                description: "An error occurred while updating the dates.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!group) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Invoice Date</DialogTitle>
                    <DialogDescription>
                        This will update the date for all {group.entries.length} items in this invoice.
                        Time settings for each item will be preserved.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="date">New Date</Label>
                        <Input
                            id="date"
                            type="date"
                            value={newDate}
                            onChange={(e) => handleDateChange(e.target.value)}
                            className={validationError ? 'border-destructive' : ''}
                        />
                        {validationError && (
                            <p className="text-sm text-destructive">{validationError}</p>
                        )}
                    </div>

                    <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                        {group.supplier && <div><strong>Supplier:</strong> {group.supplier}</div>}
                        {group.invoice && <div><strong>Invoice:</strong> {group.invoice}</div>}
                        <div><strong>Current Date:</strong> {format(new Date(group.date), 'PP')}</div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Updating...' : 'Update Dates'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
