from django.db.models import Sum, F
from django.db.models.functions import Coalesce
from decimal import Decimal
from sales.models import Sale, SaleItem, SalesReturn, SalesReturnItem
from ...models import CarriageInward
from core.utils import to_decimal

class COGSCalculator:
    """
    Calculates Gross Cost, Return Cost, Carriage, and Net COGS.
    """
    def __init__(self, branch_id, start_date, end_date):
        self.branch_id = branch_id
        self.start_date = start_date
        self.end_date = end_date

    def calculate(self):
        # Base Querysets
        sales_qs = Sale.objects.filter(
            branch_id=self.branch_id,
            date__range=[self.start_date, self.end_date],
            is_deleted=False,
            status__in=['COMPLETED', 'PARTIAL', 'INSTALLMENT']
        )
        
        returns_qs = SalesReturn.objects.filter(
            branch_id=self.branch_id,
            date__range=[self.start_date, self.end_date],
            status='COMPLETED'
        )

        # 1. Gross Cost: Sum(cost_price * quantity) from SaleItem
        sale_items = SaleItem.objects.filter(sale__in=sales_qs)
        gross_cost = to_decimal(sale_items.aggregate(
            total=Coalesce(Sum(F('cost_price') * F('quantity')), Decimal('0.00'))
        )['total'])

        # 2. Return Cost: Sum(cost_price * quantity) from returned items
        # Note: We use cost_price from the linked SaleItem
        return_items = SalesReturnItem.objects.filter(sales_return__in=returns_qs)
        return_cost = to_decimal(return_items.aggregate(
            total=Coalesce(Sum(F('sale_item__cost_price') * F('quantity')), Decimal('0.00'))
        )['total'])

        # 3. Carriage: Sum(amount) from CarriageInward
        carriage_val = to_decimal(CarriageInward.objects.filter(
            branch_id=self.branch_id,
            date__range=[self.start_date, self.end_date]
        ).aggregate(total=Coalesce(Sum('amount'), Decimal('0.00')))['total'])

        # 4. Net COGS: Gross Cost - Return Cost + Carriage
        net_cogs = gross_cost - return_cost + carriage_val

        return {
            "gross_cost": gross_cost,
            "return_cost": return_cost,
            "carriage": carriage_val,
            "net_cogs": net_cogs
        }
