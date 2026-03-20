"use client";
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StockHistoryEntry } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Edit, Clock, Trash2, History } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useProfiles } from '@/contexts/ProfileContext';
import { format } from 'date-fns';
import EditStockHistoryDialog from './EditStockHistoryDialog';
import DeleteStockHistoryDialog from './DeleteStockHistoryDialog';

interface ProductStockHistoryProps {
  stockHistory: StockHistoryEntry[];
  isLoadingHistory: boolean;
  onEditStockHistory: (entryId: string, newQuantity: number, newReason: string, newDate?: Date) => Promise<boolean>;
  onDeleteStockHistory: (entryId: string) => Promise<boolean>;
  products: any[];
}

const ProductStockHistory: React.FC<ProductStockHistoryProps> = ({
  stockHistory,
  isLoadingHistory,
  onEditStockHistory,
  onDeleteStockHistory,
  products
}) => {
  const { hasPermission } = useProfiles();
  const [editHistoryDialog, setEditHistoryDialog] = useState<{ open: boolean; entry: StockHistoryEntry | null }>({ open: false, entry: null });
  const [deleteHistoryDialog, setDeleteHistoryDialog] = useState<{ open: boolean; entry: StockHistoryEntry | null }>({ open: false, entry: null });
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  const [expandedManual, setExpandedManual] = useState<string | null>(null);

  // Check if a stock history entry was created by a sale operation
  const isSaleRelatedEntry = (entry: StockHistoryEntry): boolean => {
    const saleReasons = ['Sale', 'Delete sale', 'Deleted Sale', 'Sale qty edit'];
    return saleReasons.some(reason => entry.changeReason.toLowerCase().includes(reason.toLowerCase()));
  };

  const formatChangeReason = (reason: string): string => {
    return reason
      .replace('Deleted sale', 'Deleted Sale');
  };

  // Check if a stock history entry is initial stock (first entry chronologically)
  const isInitialStockEntry = (entry: StockHistoryEntry): boolean => {
    if (stockHistory.length === 0) return false;

    // Sort by creation date to find the chronologically first entry
    const sortedHistory = [...stockHistory].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return sortedHistory[0]?.id === entry.id;
  };

  // Prepare unified display items
  const displayItems = useMemo(() => {
    const saleGroups: Record<string, StockHistoryEntry[]> = {};
    const singles: StockHistoryEntry[] = [];

    // 1. Organize entries
    stockHistory.forEach(entry => {
      if (isSaleRelatedEntry(entry)) {
        const key = entry.receiptNumber || entry.referenceId || entry.id;
        if (!saleGroups[key]) saleGroups[key] = [];
        saleGroups[key].push(entry);
      } else {
        singles.push(entry);
      }
    });

    // 2. Create standardized items
    const items = [
      // Add sale groups
      ...Object.values(saleGroups).map(group => {
        // Sort inside group by date (Oldest -> Newest for correct timeline in details)
        // If you want details to be Newest on top, swap a and b.
        // User asked for "Progressive order", so let's stick to Oldest -> Newest for details too to be consistent.
        // BUT current UI logic for "main" uses sorted[0] as display. Let's see.
        // If I strictly follow chronological, details should be Oldest -> Newest.
        // The previous code had `new Date(b.createdAt) - new Date(a.createdAt)` (Newest first).

        // Let's sort Newest First for the "main" display (so we show the latest state),
        // but for the sorting of the *Card* itself, we use the LATEST date (what is displayed) to avoid visual confusion.
        const sortedForMain = [...group].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        // const sortedForTimeline = [...group].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        return {
          type: 'sale' as const,
          main: sortedForMain[0], // Display the latest state
          all: sortedForMain, // Details table (Newest first is clearer for "Recent actions")
          // Sort Key: Use the *displayed* date (Latest) to place it chronologically in the timeline relative to other events
          sortDate: sortedForMain[0].createdAt
        };
      }),
      // Add single entries
      ...singles.map(entry => ({
        type: 'single' as const,
        entry,
        sortDate: entry.createdAt
      }))
    ];

    // 3. Sort main list Descending (Newest at Top, Oldest at Bottom)
    // Ensure progressive order from bottom to top
    return items.sort((a, b) => {
      const dateA = new Date(a.sortDate).getTime();
      const dateB = new Date(b.sortDate).getTime();
      // console.log('Sort comparison:', { dateA, dateB, diff: dateB - dateA });
      return dateB - dateA;
    });
  }, [stockHistory]);

  const stockHistoryList = isLoadingHistory ? (
    <div className="animate-pulse text-center py-8">
      <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
      <p className="text-gray-500">Loading stock history...</p>
    </div>
  ) : stockHistory.length === 0 ? (
    <div className="text-center py-8 text-gray-500">
      <History size={48} className="mx-auto mb-4 opacity-50" />
      <p>No stock history available for this product</p>
      <p className="text-sm mt-2">Stock changes will appear here once you make adjustments</p>
    </div>
  ) : (
    <div className="space-y-3">
      {displayItems.map((item) => {
        // SALE ITEM RENDER
        if (item.type === 'sale') {
          const { main, all } = item;
          const saleKey = main.receiptNumber || main.referenceId || main.id;
          const isExpanded = expandedSale === saleKey;

          // Per-sale summary data (all is sorted Newest -> Oldest)
          const currentRef = all[0];
          const originalRef = all[all.length - 1];
          const hasHistory = all.length > 1;

          return (
            <div key={main.id} className={`border rounded-lg p-4 transition-colors ${main.newQuantity > main.oldQuantity
              ? 'bg-green-50 border-green-200 hover:bg-green-100'
              : main.newQuantity < main.oldQuantity
                ? 'bg-red-50 border-red-200 hover:bg-red-100'
                : 'border-gray-200 hover:bg-gray-50'
              }`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      Sale - {main.receiptNumber || main.referenceId || main.id}
                    </Badge>
                    {hasHistory && (
                      <Badge variant="secondary" className="text-[10px] h-5">
                        Edited
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    {hasHistory ? (
                      <>
                        <Badge variant="outline" className="text-xs bg-muted/50 font-normal">
                          Original: {originalRef.oldQuantity} → {originalRef.newQuantity} ({originalRef.newQuantity - originalRef.oldQuantity > 0 ? '+' : ''}{originalRef.newQuantity - originalRef.oldQuantity})
                        </Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge variant="secondary" className="text-xs font-normal">
                          Current: {currentRef.oldQuantity} → {currentRef.newQuantity} ({currentRef.newQuantity - currentRef.oldQuantity > 0 ? '+' : ''}{currentRef.newQuantity - currentRef.oldQuantity})
                        </Badge>
                      </>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-muted/50 font-normal">
                        Qty: {main.oldQuantity} → {main.newQuantity} ({main.newQuantity - main.oldQuantity > 0 ? '+' : ''}{main.newQuantity - main.oldQuantity})
                      </Badge>
                    )}
                    {!hasHistory && (
                      <div className="text-sm text-gray-500 flex items-center gap-1 ml-2">
                        <Clock className="inline-block w-3 h-3" />
                        {format(main.createdAt, 'MMM d, yyyy h:mm a')}
                      </div>
                    )}
                    {hasHistory && (
                      <div className="text-sm text-gray-500 flex items-center gap-1 ml-2">
                        <Clock className="inline-block w-3 h-3" />
                        {/* Show Last Edit Time */}
                        {format(currentRef.createdAt, 'MMM d, yyyy h:mm a')}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => setExpandedSale(isExpanded ? null : saleKey)}
                  >
                    {isExpanded ? 'Hide Details' : 'View Details'}
                  </Button>
                </div>
              </div>
              {isExpanded && (
                <div className="mt-4 border-t pt-3">
                  <div className="font-semibold mb-2 text-sm text-muted-foreground">Sale Actions</div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs border">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="px-2 py-1 text-left">Action</th>
                          <th className="px-2 py-1 text-left">Date</th>
                          <th className="px-2 py-1 text-left">Qty Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {all.map((entry) => (
                          <tr key={entry.id} className="border-b last:border-b-0">
                            <td className="px-2 py-1 font-medium">{formatChangeReason(entry.changeReason)}</td>
                            <td className="px-2 py-1 text-muted-foreground">{format(entry.createdAt, 'MMM d, yyyy h:mm a')}</td>
                            <td className="px-2 py-1">{entry.oldQuantity} → {entry.newQuantity} ({entry.newQuantity - entry.oldQuantity > 0 ? '+' : ''}{entry.newQuantity - entry.oldQuantity})</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        } else {
          // SINGLE ENTRY RENDER
          const { entry } = item;
          const isExpanded = expandedManual === entry.id;
          return (
            <div key={entry.id} className={`border rounded-lg p-4 transition-colors ${entry.newQuantity > entry.oldQuantity
              ? 'bg-green-50 border-green-200 hover:bg-green-100'
              : entry.newQuantity < entry.oldQuantity
                ? 'bg-red-50 border-red-200 hover:bg-red-100'
                : 'border-gray-200 hover:bg-gray-50'
              }`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {formatChangeReason(entry.changeReason)}
                      {entry.receiptNumber && ` - #${entry.receiptNumber}`}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs bg-muted/50 font-normal">
                      Qty: {entry.oldQuantity} → {entry.newQuantity} ({entry.newQuantity - entry.oldQuantity > 0 ? '+' : ''}{entry.newQuantity - entry.oldQuantity})
                    </Badge>
                    <div className="text-sm text-gray-500 flex items-center gap-1 ml-2">
                      <Clock className="inline-block w-3 h-3" />
                      {format(entry.createdAt, 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => setExpandedManual(isExpanded ? null : entry.id)}
                  >
                    {isExpanded ? 'Hide Details' : 'View Details'}
                  </Button>
                  {isInitialStockEntry(entry) ? (
                    <>
                      {hasPermission('inventory', 'edit') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditHistoryDialog({ open: true, entry })}
                          className="h-8 px-2"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                      <div className="text-xs text-muted-foreground px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        Initial Stock
                      </div>
                    </>
                  ) : (
                    <>
                      {hasPermission('inventory', 'edit') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditHistoryDialog({ open: true, entry })}
                          className="h-8 px-2"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                      {hasPermission('inventory', 'delete') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteHistoryDialog({ open: true, entry })}
                          className="h-8 px-2 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
              {isExpanded && (
                <div className="mt-4 border-t pt-3">
                  <div className="font-semibold mb-2 text-sm text-muted-foreground">Details</div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs border">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="px-2 py-1 text-left">Reason</th>
                          <th className="px-2 py-1 text-left">Date</th>
                          <th className="px-2 py-1 text-left">Qty Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b last:border-b-0">
                          <td className="px-2 py-1 font-medium">{formatChangeReason(entry.changeReason)}</td>
                          <td className="px-2 py-1 text-muted-foreground">{format(entry.createdAt, 'MMM d, yyyy h:mm a')}</td>
                          <td className="px-2 py-1">{entry.oldQuantity} → {entry.newQuantity} ({entry.newQuantity - entry.oldQuantity > 0 ? '+' : ''}{entry.newQuantity - entry.oldQuantity})</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        }
      })}
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Stock History
              {stockHistory.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {stockHistory.length} entries
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {stockHistoryList}
        </CardContent>
      </Card>

      <EditStockHistoryDialog
        open={editHistoryDialog.open}
        onOpenChange={(open) => setEditHistoryDialog({ open, entry: null })}
        entry={editHistoryDialog.entry}
        onConfirm={onEditStockHistory}
        isInitialStock={editHistoryDialog.entry ? isInitialStockEntry(editHistoryDialog.entry) : false}
        stockHistory={stockHistory}
        productCreatedAt={editHistoryDialog.entry ? (() => {
          const product = products.find(p => p.id === editHistoryDialog.entry?.productId);
          return product ? new Date(product.createdAt) : undefined;
        })() : undefined}
      />

      <DeleteStockHistoryDialog
        open={deleteHistoryDialog.open}
        onOpenChange={(open) => setDeleteHistoryDialog({ open, entry: null })}
        entry={deleteHistoryDialog.entry}
        onConfirm={onDeleteStockHistory}
      />
    </>
  );
};

export default ProductStockHistory;