import uuid
import logging
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from core.utils import to_decimal

logger = logging.getLogger(__name__)

def process_installment_payment(sale_id, amount, user_id, branch_id, agency_id, account_id=None, notes=None, date=None):
    """
    🛡️ ATOMIC INSTALLMENT CREATOR
    Handles:
    1. Creation of InstallmentPayment record.
    2. Optional creation of CashTransaction (Cash In).
    3. Incremental update of Sale.amount_paid and Sale.balance_due.
    4. Auto-completion of Sale status if fully paid.
    """
    from sales.models import Sale, InstallmentPayment
    from finance.models import CashAccount, CashTransaction

    with transaction.atomic():
        sale = Sale.objects.select_for_update().get(id=sale_id)
        amount_dec = to_decimal(amount)
        payment_date = date or timezone.now()

        if amount_dec <= 0:
            raise ValueError("Payment amount must be greater than zero.")

        # 1. Create Cash Transaction if account provided
        cash_tx = None
        if account_id:
            try:
                account = CashAccount.objects.get(id=account_id)
                desc = f"Installment payment for {sale.customer_name} - Sale #{sale.receipt_number}"
                if notes: desc += f" ({notes[:50]})"

                cash_tx = CashTransaction.objects.create(
                    amount=amount_dec,
                    transaction_type='cash_in',
                    category='Installment payment',
                    description=desc,
                    agency_id=agency_id,
                    branch_id=branch_id,
                    user_id=user_id,
                    account=account,
                    date=payment_date,
                    reference_id=sale.id, # We'll update this to payment.id after creation
                    reference_type='INSTALLMENT'
                )
            except CashAccount.DoesNotExist:
                logger.warning(f"Cash account {account_id} not found.")

        # 2. Create Installment Record
        payment = InstallmentPayment.objects.create(
            sale=sale,
            amount=amount_dec,
            notes=notes,
            payment_method="CASH",
            agency_id=agency_id,
            branch_id=branch_id,
            received_by_id=user_id,
            cash_account_id=account_id if cash_tx else None,
            cash_transaction=cash_tx,
            date=payment_date
        )

        # Update Cash Transaction reference to the specific payment
        if cash_tx:
            cash_tx.reference_id = payment.id
            cash_tx.save(update_fields=['reference_id'])

        # 3. Update Sale Totals
        sale.amount_paid += amount_dec
        sale.balance_due = max(0, sale.total_amount - sale.amount_paid)
        
        if sale.balance_due <= 0:
            sale.status = 'COMPLETED'
        elif sale.status == 'UNPAID':
            sale.status = 'INSTALLMENT'
            
        sale.save(update_fields=['amount_paid', 'balance_due', 'status'])

        return payment

def update_installment_payment(payment_id, updates, user_id):
    """
    🛡️ ATOMIC INSTALLMENT UPDATER
    Handles:
    1. Calculating delta between old and new amount.
    2. Updating Sale totals by the delta.
    3. Updating associated CashTransaction.
    """
    from sales.models import InstallmentPayment

    with transaction.atomic():
        payment = InstallmentPayment.objects.select_for_update().get(id=payment_id)
        sale = payment.sale
        
        old_amount = payment.amount
        new_amount = to_decimal(updates.get('amount', old_amount))
        delta = new_amount - old_amount

        # 1. Update Payment Record
        if 'amount' in updates: payment.amount = new_amount
        if 'notes' in updates: payment.notes = updates['notes']
        if 'paymentDate' in updates or 'date' in updates:
            payment.date = updates.get('paymentDate') or updates.get('date')
        
        payment.save()

        # 2. Sync Cash Transaction
        if payment.cash_transaction:
            ctx = payment.cash_transaction
            ctx.amount = new_amount
            ctx.date = payment.date
            ctx.save(update_fields=['amount', 'date'])

        # 3. Sync Sale Totals
        if delta != 0:
            sale.amount_paid += delta
            sale.balance_due = max(0, sale.total_amount - sale.amount_paid)
            
            if sale.balance_due <= 0:
                sale.status = 'COMPLETED'
            else:
                sale.status = 'INSTALLMENT'
            
            sale.save(update_fields=['amount_paid', 'balance_due', 'status'])

        return payment

def delete_installment_payment(payment_id):
    """
    🛡️ ATOMIC INSTALLMENT DELETER
    Handles:
    1. Reverting Sale.amount_paid.
    2. Updating Sale.status back to INSTALLMENT if it was COMPLETED.
    3. Deleting associated CashTransaction.
    """
    from sales.models import InstallmentPayment

    with transaction.atomic():
        payment = InstallmentPayment.objects.select_for_update().get(id=payment_id)
        sale = payment.sale
        amount_to_revert = payment.amount

        # 1. Sync Sale Totals
        sale.amount_paid -= amount_to_revert
        sale.balance_due = max(0, sale.total_amount - sale.amount_paid)
        
        # If it was completed, move it back to installment
        if sale.status == 'COMPLETED' and sale.balance_due > 0:
            sale.status = 'INSTALLMENT'
        elif sale.amount_paid <= 0:
            sale.status = 'UNPAID'
            
        sale.save(update_fields=['amount_paid', 'balance_due', 'status'])

        # 2. Delete Cash Transaction
        if payment.cash_transaction:
            payment.cash_transaction.delete()

        # 3. Delete Payment
        payment.delete()
        return True

def create_initial_installment(sale, amount, user_id, branch_id, agency_id, account_id=None, notes=None):
    """
    Backward compatible wrapper for sale creation flow.
    """
    return process_installment_payment(
        sale_id=sale.id,
        amount=amount,
        user_id=user_id,
        branch_id=branch_id,
        agency_id=agency_id,
        account_id=account_id,
        notes=notes,
        date=sale.date
    )
