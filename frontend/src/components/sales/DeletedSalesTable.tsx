
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { DeletedSale } from '@/hooks/useDeletedSales';
import { Trash2, User, Clock, Package } from 'lucide-react';

interface DeletedSalesTableProps {
    sales: DeletedSale[];
    isLoading: boolean;
    currency?: string;
}

export const DeletedSalesTable: React.FC<DeletedSalesTableProps> = ({ sales, isLoading, currency = 'UGX' }) => {
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-muted-foreground text-sm">Loading deleted sales history...</p>
            </div>
        );
    }

    if (sales.length === 0) {
        return (
            <div className="text-center py-12 border rounded-lg bg-muted/20">
                <Trash2 className="mx-auto h-12 w-12 text-muted-foreground opacity-20 mb-4" />
                <h3 className="text-lg font-medium">Deleted Sales history is empty</h3>
                <p className="text-muted-foreground">Deleted sales logs will appear here.</p>
            </div>
        );
    }

    return (
        <div className="border rounded-lg overflow-hidden bg-white">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead>Receipt #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead className="text-right">Total Qty</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead>Deleted At</TableHead>
                        <TableHead>Deleted By</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sales.map((sale) => (
                        <TableRow key={sale.id} className="hover:bg-muted/30">
                            <TableCell className="font-mono font-medium">{sale.receiptNumber}</TableCell>
                            <TableCell>{sale.customerName}</TableCell>
                            <TableCell>
                                <div className="max-w-[250px]">
                                    <div className="flex flex-wrap gap-1">
                                        {sale.items.map((item, idx) => {
                                            const qty = item.quantity ?? item.qty ?? 0;
                                            return (
                                                <Badge key={idx} variant="outline" className="text-[10px] py-0 h-4 bg-muted/30">
                                                    {qty}x {item.description}
                                                </Badge>
                                            );
                                        })}
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                                {sale.totalQuantity}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                                {currency} {sale.amount.toLocaleString()}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(sale.deletedAt), 'MMM d, h:mm a')}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-1.5 text-xs">
                                    <User className="h-3 w-3 text-muted-foreground" />
                                    {sale.deletedBy}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};
