from typing import List, Dict, Any, Optional
from .base import BaseHistorySource
from sales.models import Sale, InstallmentPayment
from django.db.models import Q

class SalesSource(BaseHistorySource):
    @property
    def module_name(self) -> str:
        return 'SALES'

    def get_events(self, branch_id: str, last_timestamp: Optional[str] = None, limit: int = 50, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        # 🚀 SMART FILTER: Skip if module filter is active and not SALES
        if filters and filters.get('module') and filters.get('module') != 'SALES' and filters.get('module') != 'ALL':
            return []

        # 🚀 SMART FILTER: Skip if activityType is active and not CREATE (SalesSource only yields creations)
        if filters and filters.get('activityType') and filters.get('activityType') != 'CREATE' and filters.get('activityType') != 'ALL':
            return []

        events = []
        search = filters.get('search') if filters else None
        date_from = filters.get('dateFrom') if filters else None
        date_to = filters.get('dateTo') if filters else None
        user_id = filters.get('userId') if filters else None
        
        # 1. Fetch Sales
        sales_qs = Sale.objects.filter(branch_id=branch_id, is_deleted=False).select_related('user')
        if user_id and user_id != 'ALL':
            sales_qs = sales_qs.filter(user_id=user_id)
        if last_timestamp:
            sales_qs = sales_qs.filter(created_at__lt=last_timestamp)
        if date_from:
            sales_qs = sales_qs.filter(created_at__gte=date_from)
        if date_to:
            sales_qs = sales_qs.filter(created_at__lte=date_to)
        if search:
            sales_qs = sales_qs.filter(
                Q(customer_name__icontains=search) | 
                Q(receipt_number__icontains=search) |
                Q(customer_phone__icontains=search)
            )
        
        for sale in sales_qs.order_by('-created_at')[:limit]:
            events.append(self.normalize_event(
                item=sale,
                activity_type='CREATE',
                description=f"Completed sale for {sale.customer_name or 'Walking Customer'} - Total: {sale.total_amount}",
                entity_name=f"Sale #{sale.receipt_number or sale.id}",
                entity_type='sale'
            ))

        # 2. Fetch Installments
        # Skip if searching since search is optimized for Sale names mainly
        if not search:
            payments_qs = InstallmentPayment.objects.filter(branch_id=branch_id).select_related('received_by', 'sale')
            if user_id and user_id != 'ALL':
                payments_qs = payments_qs.filter(received_by_id=user_id)
            if last_timestamp:
                payments_qs = payments_qs.filter(created_at__lt=last_timestamp)
            if date_from:
                payments_qs = payments_qs.filter(created_at__gte=date_from)
            if date_to:
                payments_qs = payments_qs.filter(created_at__lte=date_to)
                
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

    def get_stats(self, branch_id: str, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if filters and filters.get('module') and filters.get('module') != 'SALES' and filters.get('module') != 'ALL':
            return {"count": 0, "module": self.module_name}

        date_from = filters.get('dateFrom') if filters else None
        date_to = filters.get('dateTo') if filters else None
        user_id = filters.get('userId') if filters else None
        
        # 1. Count Sales (Strictly non-deleted for consistency)
        sales_qs = Sale.objects.filter(branch_id=branch_id, is_deleted=False)
        if user_id and user_id != 'ALL':
            sales_qs = sales_qs.filter(user_id=user_id)
        if date_from:
            sales_qs = sales_qs.filter(created_at__gte=date_from)
        if date_to:
            sales_qs = sales_qs.filter(created_at__lte=date_to)
            
        # 2. Count Installments
        payments_qs = InstallmentPayment.objects.filter(branch_id=branch_id)
        if user_id and user_id != 'ALL':
            payments_qs = payments_qs.filter(received_by_id=user_id)
        if date_from:
            payments_qs = payments_qs.filter(created_at__gte=date_from)
        if date_to:
            payments_qs = payments_qs.filter(created_at__lte=date_to)

        return {
            "count": sales_qs.count() + payments_qs.count(),
            "module": self.module_name
        }
