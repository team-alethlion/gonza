from django.db import transaction
from django.utils.timezone import now
from sales.models import Sale
from inventory.models import Product, ProductHistory
from core_app.models import ActivityHistory

def process_sale_deletion(sale_id, user_id, deleted_reason=None):
    """
    Modular logic to handle sale deletion:
    1. Restores inventory
    2. Logs the activity
    3. Deletes the sale record (Soft Delete)
    """
    with transaction.atomic():
        try:
            sale = Sale.objects.select_for_update().get(id=sale_id)
        except Sale.DoesNotExist:
            return False, "Sale not found"

        # 1. Restore Inventory
        # ... (rest of inventory logic remains the same)
        for item in sale.items.all():
            if item.product:
                product = item.product
                old_stock = product.stock
                product.stock += item.quantity
                product.save(update_fields=['stock'])
                
                ProductHistory.objects.create(
                    user_id=user_id,
                    branch_id=sale.branch_id,
                    product=product,
                    old_stock=old_stock,
                    new_stock=product.stock,
                    type='RETURN_IN',
                    change_reason='SALE_CANCELLED',
                    reason=f"Deleted Sale #{sale.receipt_number}. Reason: {deleted_reason or 'No reason provided'}",
                    reference_id=sale.receipt_number,
                    reference_type='SALE_CANCEL'
                )

        # 2. Create Activity Log
        # ... (rest of activity log logic remains the same)
        items_data = [
            {
                "description": item.product_name or "Unknown Product",
                "quantity": float(item.quantity),
                "price": float(item.unit_price),
                "total": float(item.total)
            }
            for item in sale.items.all()
        ]

        ActivityHistory.objects.create(
            user_id=user_id,
            agency_id=sale.agency_id,
            branch_id=sale.branch_id,
            activity_type='DELETE',
            module='SALES',
            entity_type='sale',
            entity_id=sale.id,
            entity_name=f"Sale #{sale.receipt_number}",
            description=f"Deleted sale for {sale.customer_name or 'Walking Customer'} - Reason: {deleted_reason or 'No reason provided'} - Total: {sale.total_amount}",
            metadata={
                "receiptNumber": sale.receipt_number,
                "totalAmount": float(sale.total_amount),
                "customerName": sale.customer_name or "Walking Customer",
                "reason": deleted_reason,
                "items": items_data,
                "items_count": len(items_data)
            }
        )

        # 3. Perform soft deletion instead of hard delete
        sale.is_deleted = True
        sale.deleted_at = now()
        sale.deleted_reason = deleted_reason
        sale.save(update_fields=['is_deleted', 'deleted_at', 'deleted_reason'])
        
        return True, "Sale deleted successfully"
