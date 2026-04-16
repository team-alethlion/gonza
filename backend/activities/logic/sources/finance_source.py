from typing import List, Dict, Any, Optional
from .base import BaseHistorySource
from finance.models import Expense, CashTransaction
from django.db.models import Q

class FinanceSource(BaseHistorySource):
    @property
    def module_name(self) -> str:
        return 'FINANCE'

    def get_events(self, branch_id: str, last_timestamp: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        events = []
        
        # 1. Fetch Expenses
        expense_qs = Expense.objects.filter(branch_id=branch_id).select_related('user')
        if last_timestamp:
            expense_qs = expense_qs.filter(created_at__lt=last_timestamp)
            
        for expense in expense_qs.order_by('-created_at')[:limit]:
            events.append(self.normalize_event(
                item=expense,
                activity_type='CREATE',
                description=f"Recorded expense: {expense.description} - Amount: {expense.amount}",
                entity_name=f"Expense ({expense.category})",
                entity_type='expense'
            ))

        # 2. Fetch Standalone Cash Transactions (Direct deposits/withdrawals/transfers)
        # Exclude those linked to SALES or EXPENSES or INSTALLMENTS to avoid duplicates
        excluded_types = ['SALE', 'EXPENSE', 'INSTALLMENT']
        cash_qs = CashTransaction.objects.filter(branch_id=branch_id).exclude(reference_type__in=excluded_types).select_related('user', 'account')
        if last_timestamp:
            cash_qs = cash_qs.filter(created_at__lt=last_timestamp)
            
        for tx in cash_qs.order_by('-created_at')[:limit]:
            events.append(self.normalize_event(
                item=tx,
                activity_type='CREATE',
                description=f"Cash {tx.transaction_type.replace('_', ' ')}: {tx.description} - Amount: {tx.amount}",
                entity_name=f"Cash ({tx.account.name})",
                entity_type='cash_transaction'
            ))

        return sorted(events, key=lambda x: x['created_at'], reverse=True)[:limit]

    def get_stats(self, branch_id: str, date_from: Optional[str] = None, date_to: Optional[str] = None) -> Dict[str, Any]:
        qs = Expense.objects.filter(branch_id=branch_id)
        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__lte=date_to)
            
        return {
            "count": qs.count(),
            "module": self.module_name
        }
