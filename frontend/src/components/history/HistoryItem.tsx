"use client";

import React from 'react';
import { ActivityHistoryItem } from '@/types';
import { formatDate } from '@/lib/utils';
import { 
  PlusCircle, 
  RefreshCcw, 
  Trash2, 
  ShoppingCart, 
  Package, 
  Receipt, 
  Wallet, 
  Users, 
  CheckSquare,
  FileText,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HistoryItemProps {
  activity: ActivityHistoryItem;
  isGrouped?: boolean;
  additionalCount?: number;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ 
  activity, 
  isGrouped = false,
  additionalCount = 0
}) => {
  const getIcon = () => {
    switch (activity.activity_type) {
      case 'CREATE': return <PlusCircle className="h-4 w-4 text-green-600" />;
      case 'UPDATE': return <RefreshCcw className="h-4 w-4 text-blue-600" />;
      case 'DELETE': return <Trash2 className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-slate-500" />;
    }
  };

  const getModuleIcon = () => {
    switch (activity.module) {
      case 'SALES': return <ShoppingCart className="h-4 w-4" />;
      case 'INVENTORY': return <Package className="h-4 w-4" />;
      case 'EXPENSES': return <Receipt className="h-4 w-4" />;
      case 'FINANCE': return <Wallet className="h-4 w-4" />;
      case 'CUSTOMERS': return <Users className="h-4 w-4" />;
      case 'TASKS': return <CheckSquare className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getModuleColor = () => {
    switch (activity.module) {
      case 'SALES': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'INVENTORY': return 'bg-orange-50 text-orange-700 border-orange-100';
      case 'EXPENSES': return 'bg-red-50 text-red-700 border-red-100';
      case 'FINANCE': return 'bg-green-50 text-green-700 border-green-100';
      case 'CUSTOMERS': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'TASKS': return 'bg-slate-50 text-slate-700 border-slate-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-white dark:bg-slate-900 dark:border-slate-800 hover:shadow-sm transition-shadow">
      <div className={cn("p-2.5 rounded-lg border", getModuleColor())}>
        {getModuleIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
              {activity.profile_name || 'System'}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
              {getIcon()}
              {activity.activity_type}
            </span>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDate(activity.created_at)}
          </span>
        </div>
        
        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">
          {activity.description}
        </p>
        
        <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
          <span className="px-2 py-0.5 rounded-full border border-slate-100 dark:border-slate-800">
            {activity.entity_type}: {activity.entity_name}
          </span>
          {isGrouped && additionalCount > 0 && (
            <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
              +{additionalCount} more actions
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryItem;
