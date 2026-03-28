from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db import transaction
from django.db.models import Sum
from datetime import datetime
from decimal import Decimal

from .models import (
    CashAccount, CashTransaction, ExpenseCategory, Expense, Transaction,
    CarriageInward
)
from .filters import ExpenseFilter, CashTransactionFilter
from .serializers import (
    CashAccountSerializer, CashTransactionSerializer, 
    ExpenseCategorySerializer, ExpenseSerializer, TransactionSerializer,
    CarriageInwardSerializer
)
from sales.models import Sale, SaleItem
from inventory.models import ProductHistory
from django.utils.dateparse import parse_datetime, parse_date
from django.db.models import Sum, Q, F, DecimalField, OuterRef, Subquery
from django.db.models.functions import Coalesce
import uuid
from .pesapal_utils import submit_pesapal_order, get_pesapal_transaction_status
from django.conf import settings

def to_decimal(val):
    try:
        return Decimal(str(val))
    except (TypeError, ValueError):
        return Decimal('0.0')

class CashAccountViewSet(viewsets.ModelViewSet):
    queryset = CashAccount.objects.all()
    serializer_class = CashAccountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        branch_id = self.request.query_params.get('branchId')
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        return qs.order_by('-is_default', 'name')

    @action(detail=True, methods=['delete'])
    def delete_with_transactions(self, request, pk=None):
        branch_id = request.query_params.get('branchId')
        delete_transactions = request.data.get('deleteTransactions', False)
        
        try:
            account = self.get_queryset().get(pk=pk, branch_id=branch_id)
        except CashAccount.DoesNotExist:
            return Response({"error": "Account not found"}, status=404)
            
        with transaction.atomic():
            if delete_transactions:
                account.transactions.all().delete()
                account.expenses.all().update(cash_account=None, cash_transaction=None)
            else:
                account.transactions.all().update(account=None)
                account.expenses.all().update(cash_account=None, cash_transaction=None)
                
            account.delete()
            
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'])
    def balance(self, request, pk=None):
        branch_id = request.query_params.get('branchId')
        try:
            account = self.get_queryset().get(pk=pk, branch_id=branch_id)
        except CashAccount.DoesNotExist:
            return Response({"error": "Account not found"}, status=404)
            
        aggregates = account.transactions.values('transaction_type').annotate(total=Sum('amount'))
        balance = account.initial_balance
        
        for agg in aggregates:
            total = agg['total'] or Decimal('0')
            ttype = agg['transaction_type']
            if ttype in ['cash_in', 'transfer_in']:
                balance += total
            elif ttype in ['cash_out', 'transfer_out']:
                balance -= total
                
        return Response({"balance": balance})

    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        branch_id = request.query_params.get('branchId')
        start_date_str = request.query_params.get('startDate')
        end_date_str = request.query_params.get('endDate')

        if not all([start_date_str, end_date_str]):
            return Response({"error": "Missing dates"}, status=400)

        try:
            start_date = parse_datetime(start_date_str) or datetime.combine(parse_date(start_date_str), datetime.min.time())
            end_date = parse_datetime(end_date_str) or datetime.combine(parse_date(end_date_str), datetime.max.time())
        except (ValueError, TypeError):
            return Response({"error": "Invalid dates"}, status=400)

        try:
            account = self.get_queryset().get(pk=pk, branch_id=branch_id)
        except CashAccount.DoesNotExist:
            return Response({"error": "Account not found"}, status=404)

        # Opening Balance: initial_balance + Sum(transactions < start_date)
        pre_aggregates = account.transactions.filter(date__lt=start_date).values('transaction_type').annotate(total=Sum('amount'))
        opening_balance = account.initial_balance
        for agg in pre_aggregates:
            total = agg['total'] or Decimal('0')
            if agg['transaction_type'] in ['cash_in', 'transfer_in']:
                opening_balance += total
            else:
                opening_balance -= total

        # Period aggregates
        period_txs = account.transactions.filter(date__range=[start_date, end_date])
        period_aggregates = period_txs.values('transaction_type').annotate(total=Sum('amount'))
        
        cash_in = Decimal('0')
        cash_out = Decimal('0')
        transfers_in = Decimal('0')
        transfers_out = Decimal('0')

        for agg in period_aggregates:
            total = agg['total'] or Decimal('0')
            ttype = agg['transaction_type']
            if ttype == 'cash_in': cash_in += total
            elif ttype == 'cash_out': cash_out += total
            elif ttype == 'transfer_in': transfers_in += total
            elif ttype == 'transfer_out': transfers_out += total

        closing_balance = opening_balance + cash_in + transfers_in - cash_out - transfers_out

        return Response({
            "date": start_date.date(),
            "openingBalance": opening_balance,
            "cashIn": cash_in,
            "cashOut": cash_out,
            "transfersIn": transfers_in,
            "transfersOut": transfers_out,
            "closingBalance": closing_balance
        })

    @action(detail=False, methods=['get'])
    def profit_loss(self, request):
        branch_id = request.query_params.get('branchId')
        start_date_str = request.query_params.get('startDate')
        end_date_str = request.query_params.get('endDate')
        tax_perc = to_decimal(request.query_params.get('taxPercentage', 0))

        if not all([branch_id, start_date_str, end_date_str]):
            return Response({"error": "Missing parameters"}, status=400)

        try:
            start_date = parse_datetime(start_date_str) or datetime.combine(parse_date(start_date_str), datetime.min.time())
            end_date = parse_datetime(end_date_str) or datetime.combine(parse_date(end_date_str), datetime.max.time())
        except (ValueError, TypeError):
            return Response({"error": "Invalid dates"}, status=400)

        # 1. Sales metrics
        sales_qs = Sale.objects.filter(branch_id=branch_id, date__range=[start_date, end_date]).exclude(status='QUOTE')
        sales_totals = sales_qs.aggregate(
            totalSales=Sum('total_amount'),
            taxAmount=Sum('tax_amount'),
            discountAmount=Sum('discount_amount')
        )
        total_sales = to_decimal(sales_totals['totalSales'])
        
        # 2. COGS (SaleItem cost price * quantity)
        sale_items = SaleItem.objects.filter(sale__in=sales_qs)
        total_cost_sales = to_decimal(sale_items.aggregate(cost=Sum(F('cost_price') * F('quantity')))['cost'])

        # 3. Expenses
        expenses_qs = Expense.objects.filter(branch_id=branch_id, date__range=[start_date, end_date])
        total_expenses = to_decimal(expenses_qs.aggregate(total=Sum('amount'))['total'])
        expenses_by_cat = expenses_qs.values('category').annotate(amount=Sum('amount')).order_by('-amount')
        expenses_dict = {e['category']: float(e['amount']) for e in expenses_by_cat}

        # 4. Carriage Inwards
        carriage_qs = CarriageInward.objects.filter(branch_id=branch_id, date__range=[start_date, end_date])
        total_carriage = to_decimal(carriage_qs.aggregate(total=Sum('amount'))['total'])

        # 5. Inventory Metrics (Opening/Closing Stock) - using raw SQL or complex aggregation for accuracy
        # For simplicity in this first iteration, we'll use a slightly simplified model or reuse the logic from summary_report
        # Let's use the logic from ProductHistory
        
        from inventory.views import ProductViewSet # Reusing logic might be tricky without refactoring
        
        # For a truly comprehensive P&L, we would iterate over all products or use a single optimized query
        # Let's calculate Stock Returns (Return In)
        returns_in_qs = ProductHistory.objects.filter(branch_id=branch_id, created_at__range=[start_date, end_date], type='RETURN_IN')
        # We need the selling price of return ins... this is complex because return in might not have it.
        # Sale returns in the React hook used `item.returnIn * item.sellingPrice`.
        # In Django, we'll sum up the value of RETURN_IN entries. 
        # Use the actual price recorded in the history entry at the time of return
        total_sales_returns = to_decimal(returns_in_qs.aggregate(val=Sum(F('quantity_change') * F('new_price')))['val'])

        net_sales = total_sales - total_sales_returns
        total_cogs = total_cost_sales + total_carriage
        gross_profit = net_sales - total_cogs
        net_profit_loss = gross_profit - total_expenses
        
        tax_amount = (net_profit_loss * tax_perc / Decimal('100')) if net_profit_loss > 0 else Decimal('0')
        final_profit = net_profit_loss - tax_amount

        return Response({
            "sales": total_sales,
            "salesReturns": total_sales_returns,
            "netSales": net_sales,
            "carriageInwards": total_carriage,
            "totalCostSales": total_cost_sales,
            "totalCOGS": total_cogs,
            "grossProfit": gross_profit,
            "expensesByCategory": expenses_dict,
            "totalExpenses": total_expenses,
            "netProfitLoss": net_profit_loss,
            "taxPercentage": tax_perc,
            "taxAmount": tax_amount,
            "finalProfitAfterTax": final_profit
        })


class CashTransactionViewSet(viewsets.ModelViewSet):
    queryset = CashTransaction.objects.all()
    serializer_class = CashTransactionSerializer
    permission_classes = [IsAuthenticated]

    serializer_class = CashTransactionSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = CashTransactionFilter
    search_fields = ['description', 'person_in_charge']

    def get_queryset(self):
        return super().get_queryset()

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        data = request.data
        is_bulk = isinstance(data, list)
        
        if is_bulk:
            created = []
            for item in data:
                ttype = item.get('transactionType')
                amount = to_decimal(item.get('amount', 0))
                date_val = item.get('date') or datetime.now()
                
                if ttype == 'transfer' and item.get('toAccountId'):
                    tx_out = CashTransaction.objects.create(
                        user_id=item.get('userId') or request.user.id,
                        branch_id=item.get('locationId'),
                        account_id=item.get('accountId'),
                        amount=amount,
                        transaction_type='transfer_out',
                        description=item.get('description', ''),
                        date=date_val,
                        category=item.get('category', 'Transfer')
                    )
                    tx_in = CashTransaction.objects.create(
                        user_id=item.get('userId') or request.user.id,
                        branch_id=item.get('locationId'),
                        account_id=item.get('toAccountId'),
                        amount=amount,
                        transaction_type='transfer_in',
                        description=item.get('description', ''),
                        date=date_val,
                        category=item.get('category', 'Transfer')
                    )
                    created.extend([tx_out, tx_in])
                else:
                    tx = CashTransaction.objects.create(
                        user_id=item.get('userId') or request.user.id,
                        branch_id=item.get('locationId'),
                        account_id=item.get('accountId'),
                        amount=amount,
                        transaction_type=ttype,
                        category=item.get('category'),
                        description=item.get('description'),
                        person_in_charge=item.get('personInCharge'),
                        tags=item.get('tags', []),
                        date=date_val,
                        payment_method=item.get('paymentMethod'),
                        receipt_image=item.get('receiptImage')
                    )
                    created.append(tx)
            return Response(self.get_serializer(created, many=True).data, status=status.HTTP_201_CREATED)
        else:
            ttype = data.get('transactionType')
            amount = to_decimal(data.get('amount', 0))
            date_val = data.get('date') or datetime.now()
            
            if ttype == 'transfer' and data.get('toAccountId'):
                tx_out = CashTransaction.objects.create(
                    user_id=data.get('userId') or request.user.id,
                    branch_id=data.get('locationId'),
                    account_id=data.get('accountId'),
                    amount=amount,
                    transaction_type='transfer_out',
                    description=data.get('description', ''),
                    date=date_val,
                    category=data.get('category', 'Transfer')
                )
                tx_in = CashTransaction.objects.create(
                    user_id=data.get('userId') or request.user.id,
                    branch_id=data.get('locationId'),
                    account_id=data.get('toAccountId'),
                    amount=amount,
                    transaction_type='transfer_in',
                    description=data.get('description', ''),
                    date=date_val,
                    category=data.get('category', 'Transfer')
                )
                return Response(self.get_serializer([tx_out, tx_in], many=True).data, status=status.HTTP_201_CREATED)
            else:
                serializer = self.get_serializer(data=data)
                serializer.is_valid(raise_exception=True)
                self.perform_create(serializer)
                return Response(serializer.data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # Unlink from related installments
        instance.installment_records.all().update(cash_transaction=None)
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    queryset = ExpenseCategory.objects.all()
    serializer_class = ExpenseCategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        branch_id = self.request.query_params.get('branchId')
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        return qs.order_by('-is_default', 'name')

    @action(detail=False, methods=['post'])
    def create_defaults(self, request):
        branch_id = request.data.get('locationId')
        names = request.data.get('names', [])
        user_id = request.data.get('userId') or request.user.id
        
        for name in names:
            ExpenseCategory.objects.get_or_create(
                branch_id=branch_id,
                name=name,
                defaults={'user_id': user_id, 'is_default': True}
            )
        return Response({"status": "created"})

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]

    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = ExpenseFilter
    search_fields = ['description']

    def get_queryset(self):
        return super().get_queryset()

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        data = request.data
        link_to_cash = data.pop('linkToCash', False)
        cash_account_id = data.get('cashAccountId')
        date_val = data.get('date') or datetime.now()
        amount = to_decimal(data.get('amount', 0))
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        expense = serializer.save(date=date_val, amount=amount)
        
        if link_to_cash and cash_account_id:
            cash_tx = CashTransaction.objects.create(
                user_id=expense.user_id,
                branch_id=expense.branch_id,
                account_id=cash_account_id,
                amount=amount,
                transaction_type='cash_out',
                category=expense.category or 'Expense',
                description=f"Expense: {expense.description}",
                person_in_charge=expense.person_in_charge,
                date=expense.date,
                payment_method=expense.payment_method,
                receipt_image=expense.receipt_image,
                reference_id=expense.id,
                reference_type='EXPENSE'
            )
            expense.cash_transaction = cash_tx
            expense.save(update_fields=['cash_transaction'])
            
        return Response(self.get_serializer(expense).data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        expense = self.get_object()
        data = request.data
        link_to_cash = data.pop('linkToCash', False)
        cash_account_id = data.get('cashAccountId')
        
        serializer = self.get_serializer(expense, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        expense = serializer.save()
        
        was_linked = expense.cash_transaction_id is not None
        should_link = link_to_cash and bool(cash_account_id)
        
        if should_link and not was_linked:
            cash_tx = CashTransaction.objects.create(
                user_id=expense.user_id,
                branch_id=expense.branch_id,
                account_id=cash_account_id,
                amount=expense.amount,
                transaction_type='cash_out',
                category=expense.category or 'Expense',
                description=f"Expense: {expense.description}",
                person_in_charge=expense.person_in_charge,
                date=expense.date,
                payment_method=expense.payment_method,
                receipt_image=expense.receipt_image,
                reference_id=expense.id,
                reference_type='EXPENSE'
            )
            expense.cash_transaction = cash_tx
            expense.save(update_fields=['cash_transaction'])
            
        elif should_link and was_linked:
            cash_tx = expense.cash_transaction
            cash_tx.account_id = cash_account_id
            cash_tx.amount = expense.amount
            cash_tx.category = expense.category or 'Expense'
            cash_tx.description = f"Expense: {expense.description}"
            cash_tx.person_in_charge = expense.person_in_charge
            cash_tx.date = expense.date
            cash_tx.payment_method = expense.payment_method
            cash_tx.receipt_image = expense.receipt_image
            # Ensure reference is set if it was missing
            cash_tx.reference_id = expense.id
            cash_tx.reference_type = 'EXPENSE'
            cash_tx.save()
            
        elif not should_link and was_linked:
            expense.cash_transaction.delete()
            expense.cash_transaction = None
            expense.save(update_fields=['cash_transaction'])
            
        return Response(self.get_serializer(expense).data)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        expense = self.get_object()
        if expense.cash_transaction:
            expense.cash_transaction.delete()
        expense.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def initiate_payment(self, request):
        try:
            user = request.user
            amount = to_decimal(request.data.get('amount'))
            description = request.data.get('description', 'Payment')
            ttype = request.data.get('type', 'topup')
            agency_id = request.data.get('agency_id')
            package_id = request.data.get('package_id')
            billing_cycle = request.data.get('billing_cycle')
            
            # Use current branch/location if possible, or just link via user
            branch_id = request.data.get('branch_id')

            reference = f"TX-{uuid.uuid4().hex[:10].upper()}"
            
            with transaction.atomic():
                tx = Transaction.objects.create(
                    id=f"tx_{uuid.uuid4().hex[:12]}",
                    user=user,
                    amount=amount,
                    type=ttype,
                    agency_id=agency_id,
                    package_id=package_id,
                    billing_cycle=billing_cycle,
                    description=description,
                    pesapal_merchant_reference=reference,
                    status='pending'
                )
                
                # Fetch callback URL from settings or build it
                base_callback = getattr(settings, 'PESAPAL_CALLBACK_URL', None)
                if not base_callback:
                    # Fallback if not configured
                    return Response({"error": "PESAPAL_CALLBACK_URL not configured"}, status=500)
                
                callback_url = f"{base_callback}{'&' if '?' in base_callback else '?'}purchase_id={reference}"

                # PesaPal params
                pesapal_params = {
                    'reference': reference,
                    'amount': amount,
                    'description': description,
                    'email': user.email if user.email else "customer@example.com",
                    'phone_number': user.phone if hasattr(user, 'phone') and user.phone else "0700000000",
                    'first_name': user.first_name if user.first_name else user.username,
                    'last_name': user.last_name if user.last_name else "User",
                    'callback_url': callback_url
                }

                result = submit_pesapal_order(pesapal_params)
                
                # Update tx with order_tracking_id
                tx.pesapal_order_tracking_id = result.get('order_tracking_id')
                tx.save(update_fields=['pesapal_order_tracking_id'])

                return Response({
                    "success": true,
                    "order_tracking_id": tx.pesapal_order_tracking_id,
                    "merchant_reference": reference,
                    "redirect_url": result.get('redirect_url')
                })

        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=False, methods=['get', 'post'], permission_classes=[AllowAny])
    def ipn(self, request):
        # Pesapal IPN listener
        tracking_id = request.query_params.get('OrderTrackingId') or request.data.get('OrderTrackingId')
        notification_type = request.query_params.get('OrderNotificationType') or request.data.get('OrderNotificationType')
        
        if not tracking_id:
            return Response({"error": "Missing OrderTrackingId"}, status=400)
            
        try:
            tx = Transaction.objects.filter(pesapal_order_tracking_id=tracking_id).first()
            if not tx:
                return Response({"error": "Transaction not found"}, status=404)
                
            # Fetch status from PesaPal
            status_data = get_pesapal_transaction_status(tracking_id)
            status_code = status_data.get('status_code')
            
            # Update status
            # 1 = Completed, 0 = Failed, 2 = Pending
            if str(status_code) == '1':
                # Call existing logic to process success
                # Since we are in the same viewset, we can call the detail action or helper
                # Let's call a private method to keep it DRY
                return self._finalize_success(tx, status_data.get('amount'))
            elif str(status_code) == '0':
                tx.status = 'failed'
                tx.save(update_fields=['status', 'updated_at'])
                return Response({"status": "failed"})
            
            return Response({"status": "pending"})

        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=False, methods=['get'])
    def verify(self, request):
        tracking_id = request.query_params.get('OrderTrackingId')
        if not tracking_id:
            return Response({"error": "Missing OrderTrackingId"}, status=400)
            
        try:
            tx = Transaction.objects.filter(pesapal_order_tracking_id=tracking_id).first()
            if not tx:
                return Response({"error": "Transaction not found"}, status=404)
                
            if tx.status == 'completed':
                return Response({"status": "completed", "success": True})
                
            # Fetch status from PesaPal
            status_data = get_pesapal_transaction_status(tracking_id)
            status_code = status_data.get('status_code')
            
            if str(status_code) == '1':
                return self._finalize_success(tx, status_data.get('amount'))
            elif str(status_code) == '0':
                tx.status = 'failed'
                tx.save(update_fields=['status', 'updated_at'])
                return Response({"status": "failed", "success": False})
            
            return Response({"status": "pending", "success": False})

        except Exception as e:
            return Response({"error": str(e)}, status=500)

    def _finalize_success(self, tx, paid_amount):
        try:
            with transaction.atomic():
                if tx.status == 'completed':
                    return Response({"success": True, "message": "Already processed"})

                expected_amount = tx.amount
                paid_dec = to_decimal(paid_amount)

                # Tolerance for decimal differences
                if abs(paid_dec - expected_amount) > Decimal('1.0'):
                    tx.status = 'failed'
                    tx.description = f"Amount mismatch: Expected {expected_amount}, Paid {paid_dec}"
                    tx.save(update_fields=['status', 'description', 'updated_at'])
                    return Response({"success": False, "error": "Amount mismatch"}, status=400)

                tx.status = 'completed'
                tx.save(update_fields=['status', 'updated_at'])

                if tx.type == 'subscription' and tx.agency_id:
                    from core_app.models import Agency
                    from django.utils.timezone import now
                    from dateutil.relativedelta import relativedelta
                    
                    try:
                        agency = Agency.objects.get(id=tx.agency_id)
                        current_time = now()
                        new_expiry = current_time

                        if agency.subscription_expiry and agency.subscription_expiry > current_time:
                            new_expiry = agency.subscription_expiry

                        if tx.billing_cycle and tx.billing_cycle.lower() == 'yearly':
                            new_expiry += relativedelta(years=1)
                        else:
                            new_expiry += relativedelta(months=1)

                        agency.subscription_status = 'active'
                        agency.subscription_expiry = new_expiry
                        if tx.package_id:
                            agency.package_id = tx.package_id
                        agency.save()

                    except Agency.DoesNotExist:
                        pass

                return Response({"success": True, "status": "completed"})
        except Exception as e:
            return Response({"error": str(e)}, status=500)


class CarriageInwardViewSet(viewsets.ModelViewSet):
    queryset = CarriageInward.objects.all()
    serializer_class = CarriageInwardSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        instance = serializer.save()
        if instance.cash_account:
            from .models import CashTransaction
            cash_tx = CashTransaction.objects.create(
                user=instance.user,
                branch=instance.branch,
                account=instance.cash_account,
                amount=instance.amount,
                transaction_type='cash_out',
                category='Inventory',
                description=f"Carriage Inward: {instance.supplier_name} - {instance.details}",
                date=instance.date,
                reference_id=instance.id,
                reference_type='CARRIAGE_INWARD'
            )
            instance.cash_transaction = cash_tx
            instance.save(update_fields=['cash_transaction'])

    def get_queryset(self):
        qs = super().get_queryset()
        branch_id = self.request.query_params.get('branchId')
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        return qs.order_by('-date', '-created_at')
