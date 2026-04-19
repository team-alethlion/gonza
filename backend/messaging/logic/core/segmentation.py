from django.db.models import Sum, Max, Q
from django.utils import timezone
from datetime import timedelta
from customers.models import Customer
from sales.models import Sale

class CustomerSegmenter:
    """
    🎯 CUSTOMER SEGMENTER
    SQL-optimized logic to identify customer groups for targeted messaging.
    """

    @staticmethod
    def get_unpaid_customers(branch_id):
        """
        Identify customers with outstanding balances (balance_due > 0).
        """
        # Find all sales for this branch with balance due > 0
        unpaid_sales = Sale.objects.filter(
            branch_id=branch_id,
            is_deleted=False,
            balance_due__gt=0
        )
        
        # Get distinct customer IDs from these sales
        customer_ids = unpaid_sales.values_list('customer_id', flat=True).distinct()
        
        # Return customer objects (filtering out guest sales if ID is null)
        return Customer.objects.filter(
            id__in=customer_ids,
            branch_id=branch_id
        ).annotate(
            total_balance_due=Sum('sales__balance_due', filter=Q(sales__is_deleted=False))
        )

    @staticmethod
    def get_inactive_customers(branch_id, days=90):
        """
        Identify customers who haven't made a purchase within the specified days.
        """
        cutoff_date = timezone.now().date() - timedelta(days=days)
        
        # Identify customers who HAVE been active in the period
        active_customer_ids = Sale.objects.filter(
            branch_id=branch_id,
            is_deleted=False,
            date__gte=cutoff_date
        ).values_list('customer_id', flat=True).distinct()

        # Return customers who are NOT in that active list
        return Customer.objects.filter(
            branch_id=branch_id
        ).exclude(
            id__in=active_customer_ids
        ).annotate(
            last_purchase_date=Max('sales__date', filter=Q(sales__is_deleted=False))
        )

    @staticmethod
    def get_all_customers(branch_id):
        """
        Simply returns all customers for a branch.
        """
        return Customer.objects.filter(branch_id=branch_id)
