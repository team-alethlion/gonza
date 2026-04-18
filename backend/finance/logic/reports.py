from django.db.models import Sum, Q
from django.db.models.functions import Coalesce
from decimal import Decimal

def get_account_summary(account, start_date, end_date):
    """
    Calculates account balance and period flows using SQL Coalesce.
    """
    # Opening Balance Calculation
    pre_period = account.transactions.filter(date__lt=start_date).aggregate(
        inflow=Coalesce(Sum('amount', filter=Q(transaction_type__in=['cash_in', 'transfer_in'])), Decimal('0.00')),
        outflow=Coalesce(Sum('amount', filter=Q(transaction_type__in=['cash_out', 'transfer_out'])), Decimal('0.00'))
    )
    opening_balance = account.initial_balance + pre_period['inflow'] - pre_period['outflow']

    # Period Specific Totals
    period = account.transactions.filter(date__range=[start_date, end_date]).aggregate(
        cash_in=Coalesce(Sum('amount', filter=Q(transaction_type='cash_in')), Decimal('0.00')),
        cash_out=Coalesce(Sum('amount', filter=Q(transaction_type='cash_out')), Decimal('0.00')),
        transfer_in=Coalesce(Sum('amount', filter=Q(transaction_type='transfer_in')), Decimal('0.00')),
        transfer_out=Coalesce(Sum('amount', filter=Q(transaction_type='transfer_out')), Decimal('0.00'))
    )

    closing_balance = opening_balance + period['cash_in'] + period['transfer_in'] - period['cash_out'] - period['transfer_out']

    return {
        "openingBalance": float(opening_balance),
        "cashIn": float(period['cash_in']),
        "cashOut": float(period['cash_out']),
        "transfersIn": float(period['transfer_in']),
        "transfersOut": float(period['transfer_out']),
        "closingBalance": float(closing_balance)
    }

def get_live_balance(account):
    """
    Calculates the absolute current balance of an account using SQL aggregation.
    """
    stats = account.transactions.aggregate(
        inflow=Coalesce(Sum('amount', filter=Q(transaction_type__in=['cash_in', 'transfer_in'])), Decimal('0.00')),
        outflow=Coalesce(Sum('amount', filter=Q(transaction_type__in=['cash_out', 'transfer_out'])), Decimal('0.00'))
    )
    return account.initial_balance + stats['inflow'] - stats['outflow']
