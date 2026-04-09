from decimal import Decimal, InvalidOperation
from django.utils import timezone

def to_decimal(val):
    try:
        if val is None or str(val).lower() == 'none' or str(val).strip() == '':
            return Decimal('0.0')
        return Decimal(str(val))
    except (TypeError, ValueError, InvalidOperation):
        return Decimal('0.0')

def calculate_sale_financials(items, tax_rate, shipping_cost=0):
    """
    Centralized logic for sale financial calculations.
    Can be used by both Create and Update processes to ensure consistency.
    """
    subtotal = Decimal('0.00')
    total_cost = Decimal('0.00')
    total_discount = Decimal('0.00')
    shipping = to_decimal(shipping_cost)

    for item in items:
        qty = to_decimal(item.get('quantity', 0))
        price = to_decimal(item.get('price', 0) or item.get('unit_price', 0))
        cost = to_decimal(item.get('cost', 0) or item.get('cost_price', 0))
        
        item_sub = price * qty
        
        discount_type = item.get('discountType') or item.get('discount_type', 'percentage')
        if discount_type == 'amount':
            discount_amt = to_decimal(item.get('discountAmount', 0) or item.get('discount', 0))
        else:
            perc = to_decimal(item.get('discountPercentage', 0) or item.get('discount_percentage', 0))
            discount_amt = (item_sub * perc) / Decimal('100')
            
        subtotal += (item_sub - discount_amt)
        total_discount += discount_amt
        total_cost += cost * qty

    tax_amt = subtotal * (to_decimal(tax_rate) / Decimal('100'))
    total_amount = subtotal + tax_amt + shipping
    
    # Profit = Net Revenue (excluding tax) - Total Cost
    profit = subtotal - total_cost

    return {
        'subtotal': subtotal,
        'tax_amount': tax_amt,
        'discount_amount': total_discount,
        'total_amount': total_amount,
        'total_cost': total_cost,
        'profit': profit,
        'shipping_cost': shipping
    }

def resolve_payment_logic(status, total_amount, amount_paid_input=0):
    """
    🚀 INTELLIGENT FINANCIAL RESOLUTION:
    Determines correct amount_paid and balance_due based on status and user input.
    Provides automatic state correction to prevent data loss.
    """
    total = to_decimal(total_amount)
    paid_input = to_decimal(amount_paid_input)
    
    amount_paid = Decimal('0.00')
    balance_due = total
    resolved_status = status

    # 1. Force FULL payment logic
    if status in ['COMPLETED', 'Paid']:
        amount_paid = total
        balance_due = Decimal('0.00')
    
    # 2. Handle Quote logic (Always 0 paid, no debt created)
    elif status in ['QUOTE', 'Quote']:
      amount_paid = Decimal('0.00')
      balance_due = Decimal('0.00') # 🚀 REFINEMENT: Quotes should not carry balance due in ledgers
    
    # 3. Handle Partial/Installment/Unpaid logic
    else:
        # If the user provided a payment, trust it (up to the total)
        if paid_input > 0:
            amount_paid = min(paid_input, total)
            balance_due = total - amount_paid
            
            # Auto-promote to COMPLETED if they accidentally left status as INSTALLMENT but paid in full
            if balance_due <= 0:
                resolved_status = 'COMPLETED'
            # Ensure it's marked as INSTALLMENT if there's a partial payment
            elif status in ['UNPAID', 'NOT PAID']:
                resolved_status = 'INSTALLMENT'
        else:
            # No payment provided
            amount_paid = Decimal('0.00')
            balance_due = total
            resolved_status = 'UNPAID' if status in ['UNPAID', 'NOT PAID'] else status
        
    return {
        'amount_paid': amount_paid,
        'balance_due': balance_due,
        'status': resolved_status
    }
