"use client";
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ActivityHistoryItem } from '@/hooks/useActivityHistory';
import {
  ShoppingCart,
  Package,
  Receipt,
  CreditCard,
  Users,
  CheckSquare,
  Plus,
  Edit,
  Trash2,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useFinancialVisibility } from '@/hooks/useFinancialVisibility';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { formatNumber } from '@/lib/utils';

interface HistoryItemProps {
  activities: ActivityHistoryItem[];
  isGrouped?: boolean;
  activity?: ActivityHistoryItem; // For backward compatibility if needed, though we'll use activities[0]
}

const getModuleIcon = (module: string) => {
  switch (module) {
    case 'SALES':
      return <ShoppingCart className="h-4 w-4" />;
    case 'INVENTORY':
      return <Package className="h-4 w-4" />;
    case 'EXPENSES':
      return <Receipt className="h-4 w-4" />;
    case 'FINANCE':
      return <CreditCard className="h-4 w-4" />;
    case 'CUSTOMERS':
      return <Users className="h-4 w-4" />;
    case 'TASKS':
      return <CheckSquare className="h-4 w-4" />;
    default:
      return <Package className="h-4 w-4" />;
  }
};

const getActivityIcon = (activityType: string) => {
  switch (activityType) {
    case 'CREATE':
      return <Plus className="h-3 w-3" />;
    case 'UPDATE':
      return <Edit className="h-3 w-3" />;
    case 'DELETE':
      return <Trash2 className="h-3 w-3" />;
    default:
      return <Edit className="h-3 w-3" />;
  }
};

const getActivityVariant = (activityType: string) => {
  switch (activityType) {
    case 'CREATE':
      return 'default';
    case 'UPDATE':
      return 'secondary';
    case 'DELETE':
      return 'destructive';
    default:
      return 'secondary';
  }
};

const getModuleColor = (module: string) => {
  switch (module) {
    case 'SALES':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'INVENTORY':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'EXPENSES':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'FINANCE':
      return 'text-purple-600 bg-purple-50 border-purple-200';
    case 'CUSTOMERS':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'TASKS':
      return 'text-indigo-600 bg-indigo-50 border-indigo-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

export const HistoryItem: React.FC<HistoryItemProps> = ({ activities, isGrouped, activity: singleActivity }) => {
  // Handle both new array prop and legacy single prop
  const activityList = activities || (singleActivity ? [singleActivity] : []);
  if (activityList.length === 0) return null;

  const latestActivity = activityList[0];

  return (
    <Card className="p-3 md:p-4 transition-colors hover:bg-muted/50">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
        {/* Mobile: Icon and header on same line */}
        <div className="flex items-start gap-3 flex-1">
          <div className={`p-2 rounded-lg border flex-shrink-0 ${getModuleColor(latestActivity.module)}`}>
            {getModuleIcon(latestActivity.module)}
          </div>

          <div className="flex-1 min-w-0">
            {/* Entity name - ensure it doesn't overflow */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="font-medium text-foreground leading-tight break-words">
                {latestActivity.entity_name}
              </span>
              <div className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0 sm:hidden">
                {formatDistanceToNow(new Date(latestActivity.created_at), { addSuffix: true })}
              </div>
            </div>

            {/* Badges - wrap on mobile */}
            <div className="flex flex-wrap items-center gap-1 mb-2">
              <Badge variant={getActivityVariant(latestActivity.activity_type) as any} className="gap-1 text-xs">
                {getActivityIcon(latestActivity.activity_type)}
                <span className="hidden xs:inline">{latestActivity.activity_type}</span>
                <span className="xs:hidden">{latestActivity.activity_type.charAt(0)}</span>
              </Badge>
              <Badge variant="outline" className="text-xs">
                {latestActivity.module}
              </Badge>
              {latestActivity.profile_name && (
                <Badge variant="secondary" className="text-xs truncate max-w-24">
                  {latestActivity.profile_name}
                </Badge>
              )}
              {isGrouped && (
                <Badge variant="outline" className="text-xs bg-muted/50">
                  <Clock className="h-3 w-3 mr-1" />
                  {activityList.length} actions
                </Badge>
              )}
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
              {latestActivity.description}
            </p>

            {/* Details */}
            {latestActivity.metadata && Object.keys(latestActivity.metadata).length > 0 && (
              <div className="text-xs text-muted-foreground">
                <details className="cursor-pointer group">
                  <summary className="hover:text-foreground py-1 select-none flex items-center gap-1">
                    <span className="group-open:rotate-90 transition-transform inline-block">▸</span> View details
                  </summary>
                  <div className="mt-2 pl-2 border-l-2 border-muted">
                    {latestActivity.module === 'SALES' && latestActivity.metadata.items ? (
                      <SaleDetailsView metadata={latestActivity.metadata} />
                    ) : (
                      <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                        {JSON.stringify(latestActivity.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                </details>
              </div>
            )}

            {/* Timeline for Grouped Activities */}
            {isGrouped && activityList.length > 1 && (
              <div className="mt-3 pt-3 border-t">
                <details className="cursor-pointer group">
                  <summary className="text-xs font-medium hover:text-foreground select-none flex items-center gap-1">
                    <span className="group-open:rotate-90 transition-transform inline-block">▸</span> Activity Timeline ({activityList.length} actions)
                  </summary>
                  <div className="mt-3 space-y-3 pl-1">
                    {activityList.map((item, index) => (
                      <div key={item.id} className="relative pl-4 border-l border-border last:border-0 pb-1">
                        {/* Timeline dot */}
                        <div className={`absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border ${index === 0 ? 'bg-primary border-primary' : 'bg-background border-muted-foreground'
                          }`} />

                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={getActivityVariant(item.activity_type) as any} className="text-[10px] h-5 px-1.5">
                              {item.activity_type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                            </span>
                            {item.profile_name && (
                              <span className="text-xs text-muted-foreground">
                                by {item.profile_name}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>

        {/* Desktop timestamp */}
        <div className="text-xs text-muted-foreground whitespace-nowrap hidden sm:block flex-shrink-0">
          {formatDistanceToNow(new Date(latestActivity.created_at), { addSuffix: true })}
        </div>
      </div>
    </Card>
  );
};

// Component for displaying sale details in a user-friendly format
const SaleDetailsView: React.FC<{ metadata: any }> = ({ metadata }) => {
  const { canViewSellingPrice, canViewProfit, canViewTotalAmount } = useFinancialVisibility();
  const { settings } = useBusinessSettings();
  const currency = settings?.currency || 'UGX';

  return (
    <div className="space-y-3 p-2 md:p-3 bg-muted rounded">
      {/* Sale Summary - Stack on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 pb-2 border-b border-border">
        <div>
          <span className="text-xs font-medium text-muted-foreground">Receipt #</span>
          <p className="text-sm font-mono break-all">{metadata.receiptNumber}</p>
        </div>
        <div>
          <span className="text-xs font-medium text-muted-foreground">Total Amount</span>
          <p className="text-sm font-semibold">
            {canViewTotalAmount || canViewSellingPrice ? `${currency} ${formatNumber(metadata.totalAmount || 0)}` : '•••'}
          </p>
        </div>
        <div>
          <span className="text-xs font-medium text-muted-foreground">Payment Status</span>
          <p className="text-sm">{metadata.paymentStatus}</p>
        </div>
        <div>
          <span className="text-xs font-medium text-muted-foreground">Profit</span>
          <p className="text-sm">
            {canViewProfit ? `${currency} ${formatNumber(metadata.profit || 0)}` : '•••'}
          </p>
        </div>
      </div>

      {/* Additional Info for Deletions */}
      {metadata.restoredToInventory && (
        <div className="pb-2 border-b border-border">
          <span className="text-xs font-medium text-orange-600">⚠️ Inventory Restored</span>
          <p className="text-xs text-muted-foreground">Product quantities were restored to inventory</p>
        </div>
      )}

      {metadata.hadCashTransaction && (
        <div className="pb-2 border-b border-border">
          <span className="text-xs font-medium text-red-600">💰 Cash Transaction Removed</span>
          <p className="text-xs text-muted-foreground">Associated cash transaction was also deleted</p>
        </div>
      )}

      {/* Customer Information */}
      {(metadata.customerAddress || metadata.customerContact) && (
        <div className="pb-2 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground">Customer Details</span>
          {metadata.customerAddress && (
            <p className="text-xs">Address: {metadata.customerAddress}</p>
          )}
          {metadata.customerContact && (
            <p className="text-xs">Contact: {metadata.customerContact}</p>
          )}
        </div>
      )}
      {/* Items */}
      {metadata.items && metadata.items.length > 0 && (
        <div>
          <span className="text-xs font-medium text-muted-foreground">Items ({metadata.items.length})</span>
          <div className="mt-1 space-y-2 max-h-40 overflow-y-auto">
            {metadata.items.map((item: any, index: number) => (
              <div key={index} className="p-2 bg-background rounded border">
                <div className="space-y-1">
                  <p className="text-xs font-medium break-words">{item.description}</p>
                  <div className="flex flex-col xs:flex-row xs:justify-between gap-1">
                    <p className="text-xs text-muted-foreground">
                      Qty: {item.quantity} × {canViewSellingPrice ? `${currency} ${formatNumber(item.price || 0)}` : '•••'}
                    </p>
                    <p className="text-xs font-medium">
                      = {canViewSellingPrice ? `${currency} ${formatNumber(item.total || 0)}` : '•••'}
                    </p>
                  </div>
                  {item.discountPercentage > 0 && (
                    <p className="text-xs text-orange-600">
                      Discount: {item.discountPercentage}% ({canViewSellingPrice ? `${currency} ${formatNumber(item.discountAmount || 0)}` : '•••'})
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Details */}
      {metadata.amountPaid !== undefined && (
        <div className="pt-2 border-t border-border">
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Amount Paid:</span>
              <span className="ml-1 font-medium">
                {canViewTotalAmount || canViewSellingPrice ? `${currency} ${formatNumber(metadata.amountPaid || 0)}` : '•••'}
              </span>
            </div>
            {metadata.taxRate > 0 && (
              <div>
                <span className="text-muted-foreground">Tax Rate:</span>
                <span className="ml-1">{metadata.taxRate}%</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {metadata.notes && (
        <div className="pt-2 border-t border-border">
          <span className="text-xs font-medium text-muted-foreground">Notes</span>
          <p className="text-xs">{metadata.notes}</p>
        </div>
      )}
    </div>
  );
};