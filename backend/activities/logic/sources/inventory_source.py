from typing import List, Dict, Any, Optional
from .base import BaseHistorySource
from inventory.models import ProductHistory, StockTransfer
from django.db.models import Q

class InventorySource(BaseHistorySource):
    @property
    def module_name(self) -> str:
        return 'INVENTORY'

    def get_events(self, branch_id: str, last_timestamp: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        events = []
        
        # 1. Fetch Product History
        # Exclude 'SALE' as it's handled by sales_source
        excluded_types = ['SALE']
        history_qs = ProductHistory.objects.filter(branch_id=branch_id).exclude(type__in=excluded_types).select_related('user', 'product')
        if last_timestamp:
            history_qs = history_qs.filter(created_at__lt=last_timestamp)
            
        for entry in history_qs.order_by('-created_at')[:limit]:
            events.append(self.normalize_event(
                item=entry,
                activity_type='UPDATE',
                description=f"{entry.get_type_display()} for {entry.product.name}. Change: {entry.quantity_change}. Reason: {entry.change_reason or 'None'}",
                entity_name=entry.product.name,
                entity_type='product'
            ))

        # 2. Fetch Stock Transfers
        transfer_qs = StockTransfer.objects.filter(Q(from_branch_id=branch_id) | Q(to_branch_id=branch_id)).select_related('user', 'from_branch', 'to_branch')
        if last_timestamp:
            transfer_qs = transfer_qs.filter(created_at__lt=last_timestamp)
            
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

    def get_stats(self, branch_id: str, date_from: Optional[str] = None, date_to: Optional[str] = None) -> Dict[str, Any]:
        qs = ProductHistory.objects.filter(branch_id=branch_id).exclude(type='SALE')
        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__lte=date_to)
            
        return {
            "count": qs.count(),
            "module": self.module_name
        }
