import uuid
import logging

logger = logging.getLogger(__name__)

def create_initial_installment(sale, amount, user_id, branch_id, agency_id, account_id=None, notes=None):
    """
    Modular abstraction to create the initial InstallmentPayment and its associated CashTransaction.
    Executed natively inside views.py @transaction.atomic block.
    """
    from sales.models import InstallmentPayment
    
    cash_tx = None
    if account_id:
        from finance.models import CashAccount, CashTransaction
        try:
            account = CashAccount.objects.get(id=account_id)
            description = f"Installment payment for Sale {sale.receipt_number}"
            if notes:
                # Append truncated notes if present to keep description reasonable
                description += f" - {notes[:100]}"
                
            cash_tx = CashTransaction.objects.create(
                id=f"ctx_{uuid.uuid4().hex[:12]}",
                amount=amount,
                transaction_type='cash_in',
                category='Installment payment',
                description=description,
                agency_id=agency_id,
                branch_id=branch_id,
                user_id=user_id,
                account=account,
                date=sale.date,
                reference_id=sale.id,
                reference_type='INSTALLMENT'
            )
            logger.debug(f"Created cash transaction {cash_tx.id} for installment payment on Sale {sale.id}")
        except CashAccount.DoesNotExist:
            logger.warning(f"Cash account {account_id} not found. Skipping cash transaction.")
        except Exception as e:
            logger.error(f"Error creating cash transaction for installment: {str(e)}")

    ip = InstallmentPayment.objects.create(
        id=f"ip_{uuid.uuid4().hex[:12]}",
        sale=sale,
        amount=amount,
        notes=notes,
        payment_method="CASH" if account_id else "CASH", 
        agency_id=agency_id,
        branch_id=branch_id,
        received_by_id=user_id,
        cash_account_id=account_id if cash_tx else None,
        cash_transaction=cash_tx
    )
    
    return ip
