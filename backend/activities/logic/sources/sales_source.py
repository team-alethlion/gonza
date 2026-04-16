from typing import List, Dict, Any, Optional
from .base import BaseHistorySource
from sales.models import Sale, InstallmentPayment
from django.db.models import Q

class SalesSource(BaseHistorySource):
    @property
    def module_name(self) -> str:
        return 'SALES'

    def get_events(self, branch_id: str, last_timestamp: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        events = []
        
        # 1. Fetch Sales
        sales_qs = Sale.objects.filter(branch_id=branch_id, is_deleted=False).select_related('user')
        if last_timestamp:
            sales_qs = sales_qs.filter(created_at__lt=last_timestamp)
        
        for sale in sales_qs.order_by('-created_at')[:limit]:
            events.append(self.normalize_event(
                item=sale,
                activity_type='CREATE',
                description=f"Completed sale for {sale.customer_name or 'Walking Customer'} - Total: {sale.total_amount}",
                entity_name=f"Sale #{sale.receipt_number or sale.id}",
                entity_type='sale'
            ))

        # 2. Fetch Installments
        payments_qs = InstallmentPayment.objects.filter(branch_id=branch_id).select_related('received_by')
        if last_timestamp:
            payments_qs = payments_qs.filter(created_at__lt=last_timestamp)
            
        for payment in payments_qs.order_by('-created_at')[:limit]:
            # Fake a 'user' attribute for normalization compatibility
            payment.user = payment.received_by
            events.append(self.normalize_event(
                item=payment,
                activity_type='CREATE',
                description=f"Received payment of {payment.amount} for Sale #{payment.sale.receipt_number}",
                entity_name="Installment Payment",
                entity_type='payment'
            ))

        return sorted(events, key=lambda x: x['created_at'], reverse=True)[:limit]

    def get_stats(self, branch_id: str, date_from: Optional[str] = None, date_to: Optional[str] = None) -> Dict[str, Any]:
        qs = Sale.objects.filter(branch_id=branch_id, is_deleted=False)
        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__lte=date_to)
            
        return {
            "count": qs.count(),
            "module": self.module_name
        }
