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
from django.db.models import Sum, Q, F, DecimalField, OuterRef, Subquery, Count
from django.db.models.functions import Coalesce
import uuid
from .pesapal_utils import submit_pesapal_order, get_pesapal_transaction_status, register_pesapal_ipn
from django.conf import settings
from django.http import HttpResponse
from .logic.reports import get_account_summary, get_live_balance
from .logic.expenses import get_expense_stats
from .logic.import_export import generate_expense_template, process_expense_import
from core.utils import gen_tx_id, to_decimal

class CashAccountViewSet(viewsets.ModelViewSet):
    queryset = CashAccount.objects.all()
    serializer_class = CashAccountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # 🛡️ SECURITY: Multi-tenant isolation with legacy support
        qs = super().get_queryset().select_related('branch', 'user')
        
        user = self.request.user
        agency_id = getattr(user, 'agency_id', None)
        branch_id = self.request.query_params.get('branchId')

        if agency_id:
            if branch_id:
                # Show if (matches agency OR is orphan) AND matches branch
                qs = qs.filter(Q(agency_id=agency_id) | Q(agency_id__isnull=True), branch_id=branch_id)
            else:
                # Global view: only show agency data
                qs = qs.filter(agency_id=agency_id)
        elif branch_id:
            # Fallback for users without agency_id (if any)
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
            
        # 🚀 PERFORMANCE: Use unified modular logic
        balance = get_live_balance(account)
                
        return Response({"balance": float(balance)})

    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        branch_id = (
            self.request.query_params.get('branchId') or 
            self.request.query_params.get('branch_id') or 
            self.request.user.branch_id
        )
        start_date_str = self.request.query_params.get('date_from') or self.request.query_params.get('startDate')
        end_date_str = self.request.query_params.get('date_to') or self.request.query_params.get('endDate')

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

        # 🚀 REFACTORED: Unified logic from reports.py
        data = get_account_summary(account, start_date, end_date)
        data["date"] = start_date.date()
        
        return Response(data)

    @action(detail=False, methods=['get'])
    def profit_loss(self, request):
        branch_id = request.query_params.get('branchId')
        start_date_str = request.query_params.get('startDate')
        end_date_str = request.query_params.get('endDate')
        tax_perc = to_decimal(request.query_params.get('taxPercentage', 0))
        basis = request.query_params.get('basis', 'accrual')

        if not all([branch_id, start_date_str, end_date_str]):
            return Response({"error": "Missing parameters"}, status=400)

        try:
            start_date = parse_datetime(start_date_str) or datetime.combine(parse_date(start_date_str), datetime.min.time())
            end_date = parse_datetime(end_date_str) or datetime.combine(parse_date(end_date_str), datetime.max.time())
        except (ValueError, TypeError):
            return Response({"error": "Invalid dates"}, status=400)

        # 🚀 REFACTORED: Use definitive high-precision ProfitLossEngine
        from .logic.profit_loss_engine import ProfitLossEngine
        engine = ProfitLossEngine(branch_id, start_date, end_date)
        data = engine.get_full_report(tax_perc, basis=basis)
        
        return Response(data)


class CashTransactionViewSet(viewsets.ModelViewSet):
    queryset = CashTransaction.objects.all()
    serializer_class = CashTransactionSerializer
    permission_classes = [IsAuthenticated]

    serializer_class = CashTransactionSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = CashTransactionFilter
    search_fields = ['description', 'person_in_charge']

    def get_queryset(self):
        # 🛡️ SECURITY: Multi-tenant isolation with legacy support
        qs = super().get_queryset().select_related('branch', 'user')
        
        user = self.request.user
        agency_id = getattr(user, 'agency_id', None)
        branch_id = self.request.query_params.get('branchId') or self.request.query_params.get('branch_id')

        if agency_id:
            if branch_id:
                # Show if (matches agency OR is orphan) AND matches branch
                qs = qs.filter(Q(agency_id=agency_id) | Q(agency_id__isnull=True), branch_id=branch_id)
            else:
                # Global view: only show agency data
                qs = qs.filter(agency_id=agency_id)
        elif branch_id:
            # Fallback for users without agency_id (if any)
            qs = qs.filter(branch_id=branch_id)
            
        return qs

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        data = request.data
        is_bulk = isinstance(data, list)
        items = data if is_bulk else [data]
        created_transactions = []

        for item in items:
            ttype = item.get('transactionType')
            amount = to_decimal(item.get('amount', 0))
            date_val = item.get('date') or datetime.now()
            
            # Common fields for both regular and transfer transactions
            common_data = {
                'user_id': item.get('userId') or request.user.id,
                'branch_id': item.get('locationId'),
                'description': item.get('description', ''),
                'date': date_val,
                'category': item.get('category', 'General')
            }

            if ttype == 'transfer' and item.get('toAccountId'):
                # 🚀 REFACTORED: Use Model Manager for atomic transfer
                tx_out, tx_in = CashTransaction.objects.create_transfer(
                    from_account_id=item.get('accountId'),
                    to_account_id=item.get('toAccountId'),
                    amount=amount,
                    **common_data
                )
                created_transactions.extend([tx_out, tx_in])
            else:
                # Regular transaction
                tx = CashTransaction.objects.create(
                    account_id=item.get('accountId'),
                    amount=amount,
                    transaction_type=ttype,
                    person_in_charge=item.get('personInCharge'),
                    tags=item.get('tags', []),
                    payment_method=item.get('paymentMethod'),
                    receipt_image=item.get('receiptImage'),
                    **common_data
                )
                created_transactions.append(tx)

        serializer = self.get_serializer(created_transactions, many=True)
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
        # 🛡️ SECURITY: Multi-tenant isolation with legacy support
        qs = super().get_queryset().select_related('branch', 'user')
        
        user = self.request.user
        agency_id = getattr(user, 'agency_id', None)
        branch_id = self.request.query_params.get('branchId')

        if agency_id:
            if branch_id:
                # Show if (matches agency OR is orphan) AND matches branch
                qs = qs.filter(Q(agency_id=agency_id) | Q(agency_id__isnull=True), branch_id=branch_id)
            else:
                # Global view: only show agency data
                qs = qs.filter(agency_id=agency_id)
        elif branch_id:
            # Fallback for users without agency_id (if any)
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
        # 🛡️ SECURITY: Multi-tenant isolation with legacy support
        qs = super().get_queryset().select_related('branch', 'user')
        
        user = self.request.user
        agency_id = getattr(user, 'agency_id', None)
        branch_id = self.request.query_params.get('branchId')

        if agency_id:
            if branch_id:
                # Show if (matches agency OR is orphan) AND matches branch
                qs = qs.filter(Q(agency_id=agency_id) | Q(agency_id__isnull=True), branch_id=branch_id)
            else:
                # Global view: only show agency data
                qs = qs.filter(agency_id=agency_id)
        elif branch_id:
            # Fallback for users without agency_id (if any)
            qs = qs.filter(branch_id=branch_id)
            
        return qs.order_by('-date', '-created_at')

    @action(detail=False, methods=['get'])
    def download_template(self, request):
        branch_id = request.query_params.get('branchId') or request.user.branch_id
        content = generate_expense_template(branch_id)
        response = HttpResponse(
            content,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename=expense_template.xlsx'
        return response

    @action(detail=False, methods=['post'])
    def import_data(self, request):
        branch_id = request.query_params.get('branchId') or request.user.branch_id
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            results = process_expense_import(file_obj, request.user, branch_id)
            return Response(results)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    @transaction.atomic
    def bulk_create(self, request):
        data = request.data
        if not isinstance(data, list):
            return Response({"error": "Expected a list of expenses"}, status=status.HTTP_400_BAD_REQUEST)
        
        created_expenses = []
        for item in data:
            link_to_cash = item.pop('linkToCash', False)
            cash_account_id = item.get('cashAccountId')
            date_val = item.get('date') or datetime.now()
            amount = to_decimal(item.get('amount', 0))
            
            serializer = self.get_serializer(data=item)
            serializer.is_valid(raise_exception=True)
            
            # 🛡️ SECURITY: Explicitly assign branch, agency, and user
            expense = serializer.save(
                date=date_val, 
                amount=amount,
                branch_id=item.get('branchId') or request.user.branch_id,
                agency_id=request.user.agency_id,
                user_id=request.user.id
            )
            
            if link_to_cash and cash_account_id:
                cash_tx = CashTransaction.objects.create(
                    user_id=expense.user_id,
                    branch_id=expense.branch_id,
                    account_id=cash_account_id,
                    amount=amount,
                    transaction_type='cash_out',
                    category=expense.category or 'Expense',
                    description=f"Expense: {expense.description}",
                    date=expense.date,
                    payment_method=expense.payment_method,
                    receipt_image=expense.receipt_image,
                    reference_id=expense.id,
                    reference_type='EXPENSE'
                )
                expense.cash_transaction = cash_tx
                expense.save(update_fields=['cash_transaction'])
            created_expenses.append(expense)
            
        return Response(self.get_serializer(created_expenses, many=True).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        queryset = self.get_queryset()
        
        start_date = request.query_params.get('startDate') or request.query_params.get('dateFrom')
        end_date = request.query_params.get('endDate') or request.query_params.get('dateTo')
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        # 🚀 REFACTORED: Use modular logic
        data = get_expense_stats(queryset, request.user)
        return Response(data)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        data = request.data
        link_to_cash = data.pop('linkToCash', False)
        cash_account_id = data.get('cashAccountId')
        date_val = data.get('date') or datetime.now()
        amount = to_decimal(data.get('amount', 0))
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        # 🛡️ SECURITY: Explicitly assign branch, agency, and user
        expense = serializer.save(
            date=date_val, 
            amount=amount,
            branch_id=data.get('branchId') or request.user.branch_id,
            agency_id=request.user.agency_id,
            user_id=request.user.id
        )
        
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
    def register_ipn(self, request):
        """
        🚀 IPN REGISTRATION UTILITY
        Calls Pesapal's API to register the IPN listener and persists the ID.
        """
        try:
            result = register_pesapal_ipn()
            ipn_id = result.get('ipn_id')
            
            if ipn_id:
                from core_app.models import SystemConfig
                SystemConfig.objects.update_or_create(
                    key='PESAPAL_IPN_ID',
                    defaults={'value': {'id': ipn_id}}
                )
                
            return Response(result)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=False, methods=['post'])
    def initiate_payment(self, request):
        try:
            user = request.user
            
            amount = to_decimal(request.data.get('amount'))
            description = request.data.get('description', 'Payment')
            ttype = request.data.get('type', 'topup')
            
            # 🛡️ FIX: Ensure empty strings from frontend don't cause FK failures
            agency_id = request.data.get('agency_id') or None
            package_id = request.data.get('package_id') or None
            billing_cycle = request.data.get('billing_cycle')
            credits_amount = int(request.data.get('credits_amount', 0))
            
            # Use current branch/location if possible, or just link via user
            branch_id = request.data.get('branch_id')

            reference = f"TX-{gen_tx_id().split('-')[-1].upper()}"
            
            with transaction.atomic():
                tx = Transaction.objects.create(
                    id=gen_tx_id(),
                    user=user,
                    amount=amount,
                    type=ttype,
                    agency_id=agency_id,
                    package_id=package_id,
                    billing_cycle=billing_cycle,
                    credits_amount=credits_amount,
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
                    "success": True,

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
            
            # Pesapal V3 Status Codes: 1 = Completed, 2 = Failed, 0 = Invalid, 3 = Reversed
            if str(status_code) == '1':
                return self._finalize_success(tx, status_data.get('amount'))
            elif str(status_code) in ['0', '2']:
                tx.status = 'failed'
                tx.save(update_fields=['status', 'updated_at'])
                return Response({
                    "status": "failed", 
                    "success": False, 
                    "status_code": status_code
                })
            
            return Response({
                "status": "pending", 
                "success": False, 
                "status_code": status_code
            })

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
            elif str(status_code) in ['0', '2']:
                tx.status = 'failed'
                tx.save(update_fields=['status', 'updated_at'])
                return Response({
                    "status": "failed", 
                    "success": False, 
                    "status_code": status_code
                })
            
            return Response({
                "status": "pending", 
                "success": False, 
                "status_code": status_code
            })

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

                if tx.type == 'topup' and tx.credits_amount > 0:
                    # 🚀 TOP-UP LOGIC: Increment user credits
                    user = tx.user
                    user.credits = F('credits') + tx.credits_amount
                    user.save(update_fields=['credits'])
                    return Response({
                        "success": True,

                        "status": "completed", 
                        "is_subscription": False, 
                        "value_added": tx.credits_amount
                    })

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

                        days_added = 0
                        if tx.billing_cycle and tx.billing_cycle.lower() == 'yearly':
                            new_expiry += relativedelta(years=1)
                            days_added = 365
                        else:
                            new_expiry += relativedelta(months=1)
                            days_added = 30

                        agency.subscription_status = 'active'
                        agency.subscription_expiry = new_expiry
                        if tx.package_id:
                            agency.package_id = tx.package_id
                        agency.save()
                        
                        return Response({
                            "success": True,

                            "status": "completed", 
                            "is_subscription": True, 
                            "value_added": days_added
                        })

                    except Agency.DoesNotExist:
                        pass

                return Response({"success": True, "status": "completed", "is_subscription": False, "value_added": 0})
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
        # 🛡️ SECURITY: Multi-tenant isolation with legacy support
        qs = super().get_queryset().select_related('branch', 'user')
        
        user = self.request.user
        agency_id = getattr(user, 'agency_id', None)
        branch_id = self.request.query_params.get('branchId')

        if agency_id:
            if branch_id:
                # Show if (matches agency OR is orphan) AND matches branch
                qs = qs.filter(Q(agency_id=agency_id) | Q(agency_id__isnull=True), branch_id=branch_id)
            else:
                # Global view: only show agency data
                qs = qs.filter(agency_id=agency_id)
        elif branch_id:
            # Fallback for users without agency_id (if any)
            qs = qs.filter(branch_id=branch_id)
            
        return qs.order_by('-date', '-created_at')
