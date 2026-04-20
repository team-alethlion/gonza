from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import CashTransaction, CashAccount
from .logic.reports import get_live_balance

@receiver(post_save, sender=CashTransaction)
def on_transaction_save(sender, instance, **kwargs):
    """
    Updates the current_balance of the account(s) involved in a transaction.
    """
    if instance.account:
        new_balance = get_live_balance(instance.account)
        # Use update() to bypass signals and prevent recursion if any existed
        CashAccount.objects.filter(id=instance.account.id).update(current_balance=new_balance)

@receiver(post_delete, sender=CashTransaction)
def on_transaction_delete(sender, instance, **kwargs):
    """
    Updates balance when a transaction is deleted.
    """
    if instance.account:
        new_balance = get_live_balance(instance.account)
        CashAccount.objects.filter(id=instance.account.id).update(current_balance=new_balance)
