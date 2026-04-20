from typing import List, Dict, Any, Optional
from .base import BaseHistorySource
from finance.models import Expense, CashTransaction
from django.db.models import Q

class FinanceSource(BaseHistorySource):
    @property
    def module_name(self) -> str:
        return 'FINANCE'

    def get_events(self, branch_id: str, last_timestamp: Optional[str] = None, limit: int = 50, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        # 🚀 SMART FILTER: Skip if module filter is active and not FINANCE/EXPENSES
        target_module = filters.get('module') if filters else None
        if target_module and target_module not in ['FINANCE', 'EXPENSES', 'ALL']:
            return []

        # 🚀 SMART FILTER: Skip if activityType is active and not CREATE
        if filters and filters.get('activityType') and filters.get('activityType') != 'CREATE' and filters.get('activityType') != 'ALL':
            return []

        events = []
        search = filters.get('search') if filters else None
        date_from = filters.get('dateFrom') if filters else None
        date_to = filters.get('dateTo') if filters else None
        user_id = filters.get('userId') if filters else None
        
        # 1. Fetch Expenses
        expense_qs = Expense.objects.filter(branch_id=branch_id).select_related('user')
        if user_id and user_id != 'ALL':
            expense_qs = expense_qs.filter(user_id=user_id)
        if last_timestamp:
            expense_qs = expense_qs.filter(created_at__lt=last_timestamp)
        if date_from:
            expense_qs = expense_qs.filter(created_at__gte=date_from)
        if date_to:
            expense_qs = expense_qs.filter(created_at__lte=date_to)
        if search:
            expense_qs = expense_qs.filter(
                Q(description__icontains=search) | Q(category__icontains=search)
            )
            
        for expense in expense_qs.order_by('-created_at')[:limit]:
            events.append(self.normalize_event(
                item=expense,
                activity_type='CREATE',
                description=f"Recorded expense: {expense.description} - Amount: {expense.amount}",
                entity_name=f"Expense ({expense.category})",
                entity_type='expense'
            ))

        # 2. Fetch Standalone Cash Transactions
        if not search:
            excluded_types = ['SALE', 'EXPENSE', 'INSTALLMENT']
            cash_qs = CashTransaction.objects.filter(branch_id=branch_id).exclude(reference_type__in=excluded_types).select_related('user', 'account')
            if user_id and user_id != 'ALL':
                cash_qs = cash_qs.filter(user_id=user_id)
            if last_timestamp:
                cash_qs = cash_qs.filter(created_at__lt=last_timestamp)
            if date_from:
                cash_qs = cash_qs.filter(created_at__gte=date_from)
            if date_to:
                cash_qs = cash_qs.filter(created_at__lte=date_to)
                
            for tx in cash_qs.order_by('-created_at')[:limit]:
                events.append(self.normalize_event(
                    item=tx,
                    activity_type='CREATE',
                    description=f"Cash {tx.transaction_type.replace('_', ' ')}: {tx.description} - Amount: {tx.amount}",
                    entity_name=f"Cash ({tx.account.name})",
                    entity_type='cash_transaction'
                ))

        return sorted(events, key=lambda x: x['created_at'], reverse=True)[:limit]

    def get_stats(self, branch_id: str, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        target_module = filters.get('module') if filters else None
        if target_module and target_module not in ['FINANCE', 'EXPENSES', 'ALL']:
            return {"count": 0, "module": self.module_name}

        qs = Expense.objects.filter(branch_id=branch_id)
        date_from = filters.get('dateFrom') if filters else None
        date_to = filters.get('dateTo') if filters else None
        user_id = filters.get('userId') if filters else None
        
        if user_id and user_id != 'ALL':
            qs = qs.filter(user_id=user_id)
        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__lte=date_to)
            
        return {
            "count": qs.count(),
            "module": self.module_name
        }
