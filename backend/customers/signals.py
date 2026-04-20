from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.db.models import Sum, Count
from sales.models import Sale
from .models import Customer

from django.db import transaction

def update_customer_stats(customer_id):
    """
    Recalculates total_spent and order_count for a customer using row-level locking.
    """
    if not customer_id:
        return

    with transaction.atomic():
        # 🔒 LOCK: Ensure no other process updates this customer until we are done
        customer = Customer.objects.select_for_update().filter(id=customer_id).first()
        if not customer:
            return

        # Aggregate all non-quote sales
        stats = Sale.objects.filter(
            customer_id=customer.id
        ).exclude(status='QUOTE').aggregate(
            total=Sum('total_amount'),
            count=Count('id')
        )

        customer.total_spent = stats['total'] or 0
        customer.order_count = stats['count'] or 0
        customer.save(update_fields=['total_spent', 'order_count'])

@receiver(post_save, sender=Sale)
def on_sale_save(sender, instance, **kwargs):
    # 1. Update the current customer
    if instance.customer_id:
        update_customer_stats(instance.customer_id)
    
    # 2. Update the OLD customer if they were changed
    old_customer_id = getattr(instance, '_old_customer_id', None)
    if old_customer_id and old_customer_id != instance.customer_id:
        update_customer_stats(old_customer_id)

@receiver(post_delete, sender=Sale)
def on_sale_delete(sender, instance, **kwargs):
    if instance.customer_id:
        update_customer_stats(instance.customer_id)

@receiver(pre_save, sender=Sale)
def on_sale_pre_save(sender, instance, **kwargs):
    """
    Captures the old customer ID before the sale is saved to handle transitions.
    """
    if instance.pk:
        try:
            old_instance = Sale.objects.get(pk=instance.pk)
            instance._old_customer_id = old_instance.customer_id
        except Sale.DoesNotExist:
            instance._old_customer_id = None
