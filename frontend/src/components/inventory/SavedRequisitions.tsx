"use client";
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Package,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePagination } from '@/hooks/usePagination';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { cn } from '@/lib/utils';
import { Requisition } from '@/hooks/useRequisitions';

// Alternative PDF generation using HTML
const generateAlternativePDF = async (requisition: Requisition, businessName: string) => {
  // Create a temporary HTML element for PDF generation
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.width = '800px';
  tempDiv.style.padding = '40px';
  tempDiv.style.backgroundColor = 'white';
  tempDiv.style.fontFamily = 'Arial, sans-serif';

  const validItems = requisition.items.filter(item => item.quantity > 0);
  const totalQuantity = validItems.reduce((sum, item) => sum + item.quantity, 0);
  const urgentItems = validItems.filter(item => item.urgentItem).length;

  tempDiv.innerHTML = `
    <div style="text-align: center; margin-bottom: 40px;">
      <h1 style="color: #2563eb; font-size: 24px; margin: 0;">PURCHASE REQUISITION</h1>
    </div>
    
    <div style="margin-bottom: 30px;">
      <p><strong>Business:</strong> ${businessName}</p>
      <p><strong>Date:</strong> ${format(requisition.createdAt, 'PPP')}</p>
      <p><strong>Requisition #:</strong> ${requisition.requisitionNumber}</p>
      <p><strong>Title:</strong> ${requisition.title}</p>
      <p><strong>Status:</strong> ${requisition.status.toUpperCase()}</p>
    </div>
    
    ${validItems.length > 0 ? `
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr style="background-color: #2563eb; color: white;">
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">#</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Item Description</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Quantity</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Urgent</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Supplier/Price</th>
          </tr>
        </thead>
        <tbody>
          ${validItems.map((item, index) => `
            <tr style="${item.urgentItem ? 'background-color: #fef3c7;' : ''}">
              <td style="border: 1px solid #ddd; padding: 8px;">${index + 1}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${item.productName}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${Math.round(item.quantity).toLocaleString()}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${item.urgentItem ? 'Yes' : 'No'}</td>
              <td style="border: 1px solid #ddd; padding: 8px;"></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div style="margin-bottom: 30px; padding: 15px; background-color: #f8fafc; border-radius: 8px;">
        <h3 style="margin: 0 0 10px 0; color: #1e40af;">SUMMARY</h3>
        <p><strong>Total Items:</strong> ${validItems.length}</p>
        <p><strong>Total Quantity:</strong> ${totalQuantity.toLocaleString()}</p>
        <p><strong>Urgent Items:</strong> ${urgentItems}</p>
      </div>
    ` : `
      <p>No items in this requisition.</p>
    `}
    
    ${requisition.notes ? `
      <div style="margin-bottom: 30px;">
        <h3 style="color: #1e40af;">NOTES</h3>
        <p style="padding: 10px; background-color: #f1f5f9; border-radius: 4px;">${requisition.notes}</p>
      </div>
    ` : ''}
    
    <div style="margin-top: 60px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
        <div>
          <p>Requested by: _____________________</p>
          <p>Date: _____________</p>
        </div>
        <div>
          <p>Approved by: _____________________</p>
          <p>Date: _____________</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(tempDiv);

  try {
    const { generateVectorPDF } = await import('@/utils/generateVectorPDF');
    await generateVectorPDF(tempDiv, {
      filename: `Requisition_${requisition.requisitionNumber}.pdf`,
      orientation: 'portrait',
      format: 'a4',
      margins: { top: 10, right: 10, bottom: 10, left: 10 }
    });
  } finally {
    document.body.removeChild(tempDiv);
  }
};

interface SavedRequisitionsProps {
  requisitions: Requisition[];
  isLoading: boolean;
  onRefresh: () => void;
  onDelete: (id: string) => void;
  businessName?: string;
}

const SavedRequisitions = ({
  requisitions,
  isLoading,
  onRefresh,
  onDelete,
  businessName = 'Your Business Name'
}: SavedRequisitionsProps) => {
  const isMobile = useIsMobile();
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null);

  const {
    currentPage,
    setCurrentPage,
    paginatedItems,
    totalPages
  } = usePagination({ items: requisitions, itemsPerPage: 10 });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatNumber = (num: number) => {
    return Math.round(num).toLocaleString();
  };

  const generateRequisitionPDF = async (requisition: Requisition) => {
    try {
      console.log('Starting PDF generation for requisition:', requisition.requisitionNumber);

      // Use the alternative PDF generation method
      await generateAlternativePDF(requisition, businessName);
      console.log('PDF generated successfully using alternative method');

    } catch (error: any) {
      console.error('PDF generation failed:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);

      // Show user-friendly error message
      alert(`Failed to generate PDF: ${error.message || 'Unknown error occurred'}`);
    }
  };

  const RequisitionCard = ({ requisition }: { requisition: Requisition }) => {
    const totalQuantity = requisition.items.reduce((sum, item) => sum + item.quantity, 0);
    const urgentItems = requisition.items.filter(item => item.urgentItem).length;

    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-sm font-medium">{requisition.title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {requisition.requisitionNumber} • {format(requisition.createdAt, 'MMM d, yyyy')}
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
              <span>{requisition.items.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Qty:</span>
              <span>{formatNumber(totalQuantity)}</span>
            </div>
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
              onClick={() => generateRequisitionPDF(requisition)}
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
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map(requisition => {
                    const totalQuantity = requisition.items.reduce((sum, item) => sum + item.quantity, 0);
                    const urgentItems = requisition.items.filter(item => item.urgentItem).length;

                    return (
                      <TableRow key={requisition.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{requisition.title}</div>
                            {urgentItems > 0 && (
                              <div className="flex items-center gap-1 text-orange-600 text-xs mt-1">
                                <AlertTriangle size={10} />
                                {urgentItems} urgent
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {requisition.requisitionNumber}
                        </TableCell>
                        <TableCell>
                          {format(requisition.createdAt, 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>{requisition.items.length}</TableCell>
                        <TableCell>{formatNumber(totalQuantity)}</TableCell>
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
                              onClick={() => generateRequisitionPDF(requisition)}
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
                  {selectedRequisition.requisitionNumber} • {format(selectedRequisition.createdAt, 'PPP')}
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

              <div>
                <h4 className="font-medium mb-2">Items ({selectedRequisition.items.length}):</h4>
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
                      {selectedRequisition.items.map((item, index) => (
                        <TableRow key={index} className={item.urgentItem ? "bg-orange-50" : ""}>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell>{formatNumber(item.quantity)}</TableCell>
                          <TableCell>
                            {item.urgentItem && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle size={10} className="mr-1" />
                                Urgent
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
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