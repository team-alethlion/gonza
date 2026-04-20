from typing import List, Dict, Any, Optional
from .base import BaseHistorySource
from inventory.models import ProductHistory, StockTransfer
from django.db.models import Q

class InventorySource(BaseHistorySource):
    @property
    def module_name(self) -> str:
        return 'INVENTORY'

    def get_events(self, branch_id: str, last_timestamp: Optional[str] = None, limit: int = 50, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        # 🚀 SMART FILTER: Skip if module filter is active and not INVENTORY
        if filters and filters.get('module') and filters.get('module') != 'INVENTORY' and filters.get('module') != 'ALL':
            return []

        # 🚀 SMART FILTER: Skip if activityType is active and not UPDATE
        if filters and filters.get('activityType') and filters.get('activityType') != 'UPDATE' and filters.get('activityType') != 'ALL':
            return []

        events = []
        search = filters.get('search') if filters else None
        date_from = filters.get('dateFrom') if filters else None
        date_to = filters.get('dateTo') if filters else None
        user_id = filters.get('userId') if filters else None
        
        # 1. Fetch Product History
        excluded_types = ['SALE']
        history_qs = ProductHistory.objects.filter(branch_id=branch_id).exclude(type__in=excluded_types).select_related('user', 'product')
        if user_id and user_id != 'ALL':
            history_qs = history_qs.filter(user_id=user_id)
        if last_timestamp:
            history_qs = history_qs.filter(created_at__lt=last_timestamp)
        if date_from:
            history_qs = history_qs.filter(created_at__gte=date_from)
        if date_to:
            history_qs = history_qs.filter(created_at__lte=date_to)
        if search:
            history_qs = history_qs.filter(
                Q(product__name__icontains=search) | Q(change_reason__icontains=search)
            )
            
        for entry in history_qs.order_by('-created_at')[:limit]:
            events.append(self.normalize_event(
                item=entry,
                activity_type='UPDATE',
                description=f"{entry.get_type_display()} for {entry.product.name}. Change: {entry.quantity_change}. Reason: {entry.change_reason or 'None'}",
                entity_name=entry.product.name,
                entity_type='product'
            ))

        # 2. Fetch Stock Transfers
        if not search:
            transfer_qs = StockTransfer.objects.filter(Q(from_branch_id=branch_id) | Q(to_branch_id=branch_id)).select_related('user', 'from_branch', 'to_branch')
            if user_id and user_id != 'ALL':
                transfer_qs = transfer_qs.filter(user_id=user_id)
            if last_timestamp:
                transfer_qs = transfer_qs.filter(created_at__lt=last_timestamp)
            if date_from:
                transfer_qs = transfer_qs.filter(created_at__gte=date_from)
            if date_to:
                transfer_qs = transfer_qs.filter(created_at__lte=date_to)
                
            for transfer in transfer_qs.order_by('-created_at')[:limit]:
                direction = "Sent to" if transfer.from_branch_id == branch_id else "Received from"
                other_branch = transfer.to_branch.name if transfer.from_branch_id == branch_id else transfer.from_branch.name
                
                events.append(self.normalize_event(
                    item=transfer,
                    activity_type='UPDATE',
                    description=f"Stock Transfer: {direction} {other_branch}. Status: {transfer.status}",
                    entity_name=f"Transfer #{transfer.transfer_number}",
                    entity_type='transfer'
                ))

        return sorted(events, key=lambda x: x['created_at'], reverse=True)[:limit]

    def get_stats(self, branch_id: str, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if filters and filters.get('module') and filters.get('module') != 'INVENTORY' and filters.get('module') != 'ALL':
            return {"count": 0, "module": self.module_name}

        date_from = filters.get('dateFrom') if filters else None
        date_to = filters.get('dateTo') if filters else None
        user_id = filters.get('userId') if filters else None
        
        # 1. Count Product History
        qs = ProductHistory.objects.filter(branch_id=branch_id).exclude(type='SALE')
        if user_id and user_id != 'ALL':
            qs = qs.filter(user_id=user_id)
        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__lte=date_to)
            
        history_count = qs.count()

        # 2. Count Stock Transfers
        tx_qs = StockTransfer.objects.filter(Q(from_branch_id=branch_id) | Q(to_branch_id=branch_id))
        if user_id and user_id != 'ALL':
            tx_qs = tx_qs.filter(user_id=user_id)
        if date_from:
            tx_qs = tx_qs.filter(created_at__gte=date_from)
        if date_to:
            tx_qs = tx_qs.filter(created_at__lte=date_to)
            
        transfer_count = tx_qs.count()

        return {
            "count": history_count + transfer_count,
            "module": self.module_name
        }
