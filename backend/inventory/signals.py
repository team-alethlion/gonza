import uuid
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Product, ProductHistory

@receiver(post_save, sender=Product)
def product_history_signal_handler(sender, instance, created, **kwargs):
    """
    🛡️ AUTOMATED HISTORY LOGGING
    Captures any stock change and records it in ProductHistory.
    Supports context-rich logging via temporary instance attributes.
    """
    old_stock = instance._original_stock if instance._original_stock is not None else 0
    new_stock = instance.stock
    
    # 1. Determine if we should log
    # We log if it's a new product with stock OR if existing product stock changed
    should_log = created or (old_stock != new_stock)
    
    if not should_log:
        return

    # 2. Calculate quantity change
    quantity_change = new_stock - old_stock
    
    # 3. Determine logging context (Who, Why, When)
    user_id = instance._history_user_id
    change_type = instance._history_type
    reason = instance._history_reason
    reference_id = instance._history_reference_id
    reference_type = instance._history_reference_type
    created_at = instance._history_created_at or timezone.now()

    # 4. Fallback logic if context was not manually provided by the view
    if not change_type:
        if created:
            change_type = 'CREATED'
        elif quantity_change > 0:
            change_type = 'RESTOCK'
        else:
            change_type = 'ADJUSTMENT'
            
    if not reason:
        if created:
            reason = f"[{instance.name}] | Initial stock"
        else:
            reason = f"[{instance.name}] | System-detected stock change"

    # 5. Create the history record
    ProductHistory.objects.create(
        id=f"hist_{uuid.uuid4().hex[:10]}",
        user_id=user_id,
        branch_id=instance.branch_id,
        agency_id=instance.agency_id,
        product=instance,
        type=change_type,
        old_stock=old_stock,
        new_stock=new_stock,
        quantity_change=quantity_change,
        reason=reason,
        reference_id=reference_id,
        reference_type=reference_type,
        created_at=created_at,
        old_price=instance.selling_price,
        new_price=instance.selling_price,
        old_cost=instance.cost_price,
        new_cost=instance.cost_price
    )
    
    # Reset original stock for subsequent saves in same process
    instance._original_stock = new_stock
    
    print(f"[Signal] Recorded {change_type} for {instance.name}: {old_stock} -> {new_stock} (Delta: {quantity_change})")
