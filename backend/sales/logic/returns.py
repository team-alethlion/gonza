from django.db.models import Sum
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from sales.models import Sale, SaleItem, SalesReturn, SalesReturnItem
from inventory.models import Product, ProductHistory
from finance.models import CashTransaction, CashAccount
from core.utils import to_decimal
from ..utils import generate_return_number

def process_sales_return(sale_id, user_id, items_data, refund_amount=0, cash_account_id=None, reason=None):
    """
    🛡️ ATOMIC RETURN PROCESSOR
    Handles the entire lifecycle of a sales return:
    1. Validates return quantities.
    2. Creates SalesReturn and SalesReturnItems.
    3. Adjusts inventory (optional per item).
    4. Records refund CashTransaction (optional).
    5. Updates Sale status.
    """
    with transaction.atomic():
        # select_for_update prevents race conditions on stock/counts
        sale = Sale.objects.select_for_update().get(id=sale_id)
        branch_id = sale.branch_id
        agency_id = sale.agency_id
        
        # 1. Create SalesReturn Header
        sales_return = SalesReturn.objects.create(
            sale=sale,
            return_number=generate_return_number(branch_id),
            total_refund_amount=to_decimal(refund_amount),
            reason=reason,
            status='COMPLETED',
            date=timezone.now(),
            agency_id=agency_id,
            branch_id=branch_id,
            user_id=user_id,
            cash_account_id=cash_account_id
        )

        # Calculate total original items for final state check
        total_original_qty = sale.items.aggregate(total=Sum('quantity'))['total'] or 0

        # 2. Process Return Items
        for item_data in items_data:
            sale_item_id = item_data.get('sale_item_id')
            qty_to_return = int(item_data.get('quantity', 0))
            restock = item_data.get('restock_inventory', True)
            
            if qty_to_return <= 0:
                continue
                
            # Lock the sale item to prevent concurrent return issues
            sale_item = SaleItem.objects.select_for_update().get(id=sale_item_id, sale=sale)
            
            # Validation: cannot return more than remaining
            remaining_qty = sale_item.quantity - sale_item.quantity_returned
            if qty_to_return > remaining_qty:
                raise ValueError(f"Cannot return {qty_to_return} items for {sale_item.product_name}. Only {remaining_qty} remaining.")
            
            # Create Return Item Record
            SalesReturnItem.objects.create(
                sales_return=sales_return,
                sale_item=sale_item,
                product=sale_item.product,
                quantity=qty_to_return,
                refund_amount=to_decimal(item_data.get('refund_amount', 0)),
                restock_inventory=restock
            )
            
            # Update SaleItem's return count
            sale_item.quantity_returned += qty_to_return
            sale_item.save()
            
            # 3. Inventory Adjustment
            if restock and sale_item.product:
                product = sale_item.product
                # Set signal context for rich history log
                product._history_user_id = user_id
                product._history_type = 'RETURN_IN'
                product._history_reason = f"Return from Sale #{sale.receipt_number} | Return #{sales_return.return_number}"
                product._history_reference_id = sales_return.id
                product._history_reference_type = 'RETURN'
                
                product.stock += qty_to_return
                product.save()

        # 4. Financial Refund (Cash Out)
        if refund_amount > 0 and cash_account_id:
            account = CashAccount.objects.get(id=cash_account_id)
            cash_tx = CashTransaction.objects.create(
                account=account,
                branch_id=branch_id,
                agency_id=agency_id,
                user_id=user_id,
                amount=to_decimal(refund_amount),
                transaction_type='cash_out',
                category='Sales Return',
                description=f"Refund for Return #{sales_return.return_number} (Sale #{sale.receipt_number})",
                reference_id=sales_return.id,
                reference_type='RETURN',
                date=timezone.now()
            )
            sales_return.cash_transaction = cash_tx
            sales_return.save()

        # 5. Final Sale State Update
        # Check if 100% of items from this sale have now been returned
        total_currently_returned = sale.items.aggregate(total=Sum('quantity_returned'))['total'] or 0
        if total_currently_returned >= total_original_qty:
            sale.status = 'REFUNDED'
            sale.save()
            
        return sales_return
