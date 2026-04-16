from django.db.models.signals import pre_delete
from django.dispatch import receiver
from sales.models import Sale
from finance.models import Expense
from tasks.models import Task
from .models import ActivityHistory

@receiver(pre_delete, sender=Sale)
def log_sale_deletion(sender, instance, **kwargs):
    ActivityHistory.objects.create(
        user=instance.user,
        branch=instance.branch,
        agency=instance.agency,
        activity_type='DELETE',
        module='SALES',
        entity_type='sale',
        entity_id=instance.id,
        entity_name=f"Sale #{instance.receipt_number}",
        description=f"Permanently deleted sale for {instance.customer_name or 'Walking Customer'} - Total: {instance.total_amount}",
        metadata={"total": float(instance.total_amount), "reason": "Hard Delete"}
    )

@receiver(pre_delete, sender=Expense)
def log_expense_deletion(sender, instance, **kwargs):
    ActivityHistory.objects.create(
        user=instance.user,
        branch=instance.branch,
        agency=instance.agency,
        activity_type='DELETE',
        module='EXPENSES',
        entity_type='expense',
        entity_id=instance.id,
        entity_name=instance.description,
        description=f"Permanently deleted expense: {instance.description} - Category: {instance.category}",
        metadata={"category": instance.category, "amount": float(instance.amount)}
    )

@receiver(pre_delete, sender=Task)
def log_task_deletion(sender, instance, **kwargs):
    ActivityHistory.objects.create(
        user=instance.created_by,
        branch=instance.branch,
        agency=instance.branch.agency if instance.branch else None,
        activity_type='DELETE',
        module='TASKS',
        entity_type='task',
        entity_id=instance.id,
        entity_name=instance.title,
        description=f"Permanently deleted task: {instance.title}",
        metadata={"priority": instance.priority}
    )
