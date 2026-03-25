from django.db.models import Sum, Count, F, Q
from inventory.models import Product

def get_inventory_stats(branch_id):
    """
    Calculates inventory statistics for a given branch.
    Returns total count, total cost value, total stock value, out of stock count, 
    low stock count, and aggregated quantities for charts.
    """
    # Use branch=branch_id to be safe with the ForeignKey field name
    products = Product.objects.filter(branch=branch_id)
    stats = products.aggregate(
        total_count=Count('id'),
        total_stock_value=Sum(F('stock') * F('selling_price')),
        total_cost_value=Sum(F('stock') * F('cost_price')),
        out_of_stock_count=Count('id', filter=Q(stock__lte=0)),
        low_stock_count=Count('id', filter=Q(stock__gt=0) & Q(stock__lte=F('min_stock'))),
        # Metrics for StockLevelChart
        total_in_stock_qty=Sum('stock', filter=Q(stock__gt=F('min_stock'))),
        total_low_stock_qty=Sum('stock', filter=Q(stock__gt=0) & Q(stock__lte=F('min_stock'))),
        total_min_level_qty=Sum('min_stock')
    )
    
    return {
        "totalCount": int(stats['total_count'] or 0),
        "totalCostValue": float(stats['total_cost_value'] or 0),
        "totalStockValue": float(stats['total_stock_value'] or 0),
        "outOfStockCount": int(stats['out_of_stock_count'] or 0),
        "lowStockCount": int(stats['low_stock_count'] or 0),
        "totalInStockQty": float(stats['total_in_stock_qty'] or 0),
        "totalLowStockQty": float(stats['total_low_stock_qty'] or 0),
        "totalMinLevelQty": float(stats['total_min_level_qty'] or 0)
    }
