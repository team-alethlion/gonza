import uuid
from decimal import Decimal
from django.utils import timezone
from inventory.models import ProductHistory

def record_stock_change(product, user_id, change_type, quantity_change, reason, reference_id=None, reference_type=None, created_at=None):
    """
    Centralized utility to record product stock history.
    Ensures that old_stock, new_stock, and quantity_change are ALWAYS mathematically synced.
    """
    if created_at is None:
        created_at = timezone.now()
        
    old_stock = int(product.stock - quantity_change)
    new_stock = int(product.stock)
    
    # 🛡️ DATA INTEGRITY: Ensure we record the actual mathematical delta
    history = ProductHistory.objects.create(
        id=f"hist_{uuid.uuid4().hex[:10]}",
        user_id=user_id,
        branch_id=product.branch_id,
        agency_id=product.agency_id,
        product=product,
        type=change_type,
        old_stock=old_stock,
        new_stock=new_stock,
        quantity_change=int(quantity_change),
        reason=reason,
        reference_id=reference_id,
        reference_type=reference_type,
        created_at=created_at,
        old_price=product.selling_price,
        new_price=product.selling_price,
        old_cost=product.cost_price,
        new_cost=product.cost_price
    )
    
    print(f"[History] Recorded {change_type} for {product.name}: {old_stock} -> {new_stock} (Change: {quantity_change})")
    return history
