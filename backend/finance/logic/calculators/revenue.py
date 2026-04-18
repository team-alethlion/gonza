from django.db.models import Sum, F
from django.db.models.functions import Coalesce
from decimal import Decimal
from sales.models import Sale, SalesReturn, SalesReturnItem
from core.utils import to_decimal

class RevenueCalculator:
    """
    Calculates Turnover, Returns, and Net Revenue.
    """
    def __init__(self, branch_id, start_date, end_date):
        self.branch_id = branch_id
        self.start_date = start_date
        self.end_date = end_date

    def calculate(self, basis='accrual'):
        # 1. Turnover: Sum(subtotal) of COMPLETED/PARTIAL/INSTALLMENT sales.
        # 🚀 REALIZATION TOGGLE: Switch between Accrual (all sales) and Cash (only paid amount)
        turnover_qs = Sale.objects.filter(
            branch_id=self.branch_id,
            date__range=[self.start_date, self.end_date],
            is_deleted=False,
            status__in=['COMPLETED', 'PARTIAL', 'INSTALLMENT']
        )
        
        sum_field = 'amount_paid' if basis == 'cash' else 'subtotal'
        
        turnover = to_decimal(turnover_qs.aggregate(
            total=Coalesce(Sum(sum_field), Decimal('0.00'))
        )['total'])

        # 2. Returns: Sum(quantity_returned * unit_price)
        # We look at completed returns in the period
        returns_qs = SalesReturn.objects.filter(
            branch_id=self.branch_id,
            date__range=[self.start_date, self.end_date],
            status='COMPLETED'
        )
        
        return_items = SalesReturnItem.objects.filter(sales_return__in=returns_qs)
        
        # Using F() expression to multiply quantity * unit_price (from sale_item)
        returns_val = to_decimal(return_items.aggregate(
            total=Coalesce(Sum(F('quantity') * F('sale_item__unit_price')), Decimal('0.00'))
        )['total'])

        # 3. Net Revenue: Turnover - Returns
        net_revenue = turnover - returns_val

        return {
            "turnover": turnover,
            "returns": returns_val,
            "net_revenue": net_revenue,
            "sales_count": turnover_qs.count(),
            "returns_count": returns_qs.count()
        }
