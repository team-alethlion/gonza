"use client";
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Eye,
  Trash2,
  Package,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePagination } from '@/hooks/usePagination';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { cn } from '@/lib/utils';

interface SavedRequisitionsProps {
  requisitions: any[];
  isLoading: boolean;
  onRefresh: () => void;
  onDelete: (id: string) => void;
  onDownloadPDF?: (id: string) => void;
  businessName?: string;
}

const SavedRequisitions = ({
  requisitions,
  isLoading,
  onRefresh,
  onDelete,
  onDownloadPDF,
  businessName = 'Your Business Name'
}: SavedRequisitionsProps) => {
  const isMobile = useIsMobile();
  const [selectedRequisition, setSelectedRequisition] = useState<any | null>(null);

  const {
    currentPage,
    setCurrentPage,
    paginatedItems,
    totalPages
  } = usePagination({ items: requisitions, itemsPerPage: 10 });

  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'fulfilled': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatNumber = (num: number) => {
    return Math.round(num).toLocaleString();
  };

  const formatSafeDate = (dateVal: any) => {
    if (!dateVal) return "N/A";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "N/A";
    return format(d, 'MMM d, yyyy');
  };

  const RequisitionCard = ({ requisition }: { requisition: any }) => {
    const totalQuantity = (requisition.items || []).reduce((sum: number, item: any) => sum + item.quantity, 0);
    const urgentItems = (requisition.items || []).filter((item: any) => item.urgentItem).length;

    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-sm font-medium">{requisition.title || 'Untitled Requisition'}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {requisition.requisition_number || requisition.requisitionNumber} • {formatSafeDate(requisition.createdAt || requisition.created_at || requisition.date)}
              </p>
            </div>
            <Badge className={cn('text-xs', getStatusColor(requisition.status))}>
              {requisition.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Items:</span>
              <span>{(requisition.items || []).length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Qty:</span>
              <span>{formatNumber(totalQuantity)}</span>
            </div>
            {requisition.estimated_total > 0 && (
              <div className="flex justify-between font-medium">
                <span className="text-muted-foreground">Est. Value:</span>
                <span>UGX {formatNumber(requisition.estimated_total)}</span>
              </div>
            )}
            {urgentItems > 0 && (
              <div className="flex justify-between text-orange-600">
                <span className="flex items-center gap-1">
                  <AlertTriangle size={12} />
                  Urgent:
                </span>
                <span>{urgentItems}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedRequisition(requisition)}
              className="flex-1"
            >
              <Eye size={14} className="mr-1" />
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownloadPDF?.(requisition.id)}
              className="flex-1"
            >
              <Download size={14} className="mr-1" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(requisition.id)}
              className="px-2"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading requisitions...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (requisitions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No requisitions yet</h3>
            <p className="text-muted-foreground">
              Create your first requisition to see it appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Saved Requisitions ({requisitions.length})</CardTitle>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isMobile ? (
            <div className="space-y-4">
              {paginatedItems.map(requisition => (
                <RequisitionCard key={requisition.id} requisition={requisition} />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total Qty</TableHead>
                    <TableHead>Est. Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map(requisition => {
                    const totalQuantity = (requisition.items || []).reduce((sum: number, item: any) => sum + item.quantity, 0);
                    const urgentItems = (requisition.items || []).filter((item: any) => item.urgentItem).length;

                    return (
                      <TableRow key={requisition.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{requisition.title || 'Untitled'}</div>
                            {urgentItems > 0 && (
                              <div className="flex items-center gap-1 text-orange-600 text-xs mt-1">
                                <AlertTriangle size={10} />
                                {urgentItems} urgent
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {requisition.requisition_number || requisition.requisitionNumber}
                        </TableCell>
                        <TableCell>
                          {formatSafeDate(requisition.createdAt || requisition.created_at || requisition.date)}
                        </TableCell>
                        <TableCell>{(requisition.items || []).length}</TableCell>
                        <TableCell>{formatNumber(totalQuantity)}</TableCell>
                        <TableCell className="font-medium">
                          {requisition.estimated_total > 0 ? `UGX ${formatNumber(requisition.estimated_total)}` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs', getStatusColor(requisition.status))}>
                            {requisition.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedRequisition(requisition)}
                            >
                              <Eye size={14} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onDownloadPDF?.(requisition.id)}
                            >
                              <Download size={14} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onDelete(requisition.id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Requisition Detail Modal */}
      {selectedRequisition && (
        <Card className="fixed inset-4 z-50 overflow-auto bg-background border shadow-lg">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{selectedRequisition.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedRequisition.requisition_number || selectedRequisition.requisitionNumber} • {formatSafeDate(selectedRequisition.createdAt || selectedRequisition.created_at || selectedRequisition.date)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={cn('text-xs', getStatusColor(selectedRequisition.status))}>
                  {selectedRequisition.status}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => setSelectedRequisition(null)}>
                  Close
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedRequisition.notes && (
                <div>
                  <h4 className="font-medium mb-2">Notes:</h4>
                  <p className="text-sm text-muted-foreground">{selectedRequisition.notes}</p>
                </div>
              )}

              {selectedRequisition.estimated_total > 0 && (
                <div className="p-3 bg-primary/5 rounded-md border border-primary/10">
                  <span className="text-sm font-medium">Estimated Total Value: </span>
                  <span className="text-lg font-bold text-primary">UGX {formatNumber(selectedRequisition.estimated_total)}</span>
                </div>
              )}

              <div>
                <h4 className="font-medium mb-2">Items ({(selectedRequisition.items || []).length}):</h4>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Urgent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selectedRequisition.items || []).map((item: any, index: number) => {
                        const isUrgent = item.urgentItem || item.urgent_item;
                        const productName = item.productName || item.product_name;
                        
                        return (
                          <TableRow key={index} className={isUrgent ? "bg-orange-50" : ""}>
                            <TableCell>{productName}</TableCell>
                            <TableCell>{formatNumber(item.quantity)}</TableCell>
                            <TableCell>
                              {isUrgent && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle size={10} className="mr-1" />
                                  Urgent
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SavedRequisitions;