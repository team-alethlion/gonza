from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.db.models import Sum
from datetime import datetime, date
from decimal import Decimal

from .models import SalesGoal, SaleCategory, Sale, SaleItem, InstallmentPayment
from .filters import SaleFilter
from .serializers import (
    SalesGoalSerializer, SaleCategorySerializer,
    SaleSerializer, SaleItemSerializer, InstallmentPaymentSerializer
)
from inventory.models import Product, ProductHistory
from finance.models import Expense
from core_app.pdf_utils import ReceiptGenerator, SalesReportGenerator, ProfitLossGenerator, generate_pdf_response
from django.db.models.functions import Cast
from django.db.models import Count, F, DecimalField
import io

from decimal import Decimal, InvalidOperation

def to_decimal(val):
    try:
        if val is None or str(val).lower() == 'none' or str(val).strip() == '':
            return Decimal('0.0')
        return Decimal(str(val))
    except (TypeError, ValueError, InvalidOperation):
        return Decimal('0.0')

class SalesGoalViewSet(viewsets.ModelViewSet):
    queryset = SalesGoal.objects.all()
    serializer_class = SalesGoalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        branch_id = self.request.query_params.get('branchId')
        period = self.request.query_params.get('period')
        period_name = self.request.query_params.get('period_name')
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        if period:
            qs = qs.filter(period=period)
        if period_name:
            qs = qs.filter(period_name=period_name)
        return qs.order_by('-start_date')

    def perform_create(self, serializer):
        branch_id = self.request.data.get('branch')
        start_date = self.request.data.get('start_date')
        end_date = self.request.data.get('end_date')
        
        # Calculate current progress for this period
        current_progress = 0
        if branch_id and start_date and end_date:
            current_progress = Sale.objects.filter(
                branch_id=branch_id,
                date__range=[start_date, end_date]
            ).exclude(status='QUOTE').aggregate(total=Sum('total_amount'))['total'] or 0
            
        serializer.save(current_amount=current_progress)

class SaleCategoryViewSet(viewsets.ModelViewSet):
    queryset = SaleCategory.objects.all()
    serializer_class = SaleCategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        branch_id = self.request.query_params.get('branchId')
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        return qs.order_by('-created_at')

class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.all().prefetch_related('items', 'installments')
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = SaleFilter
    search_fields = ['receipt_number', 'customer_name', 'notes']

    def get_queryset(self):
        qs = super().get_queryset().filter(is_deleted=False)
        branch_id = self.request.query_params.get('branchId')
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        return qs.order_by('-created_at')

    def calculate_financials(self, items, tax_rate):
        subtotal = Decimal('0')
        total_cost = Decimal('0')
        total_discount = Decimal('0')

        for item in items:
            qty = to_decimal(item.get('quantity', 0))
            price = to_decimal(item.get('price', 0))
            cost = to_decimal(item.get('cost', 0))
            item_sub = price * qty
            
            discount_type = item.get('discountType')
            if discount_type == 'amount':
                discount_amt = to_decimal(item.get('discountAmount', 0))
            else:
                perc = to_decimal(item.get('discountPercentage', 0))
                discount_amt = (item_sub * perc) / Decimal('100')
                
            subtotal += (item_sub - discount_amt)
            total_discount += discount_amt
            total_cost += cost * qty

        tax_amt = subtotal * (to_decimal(tax_rate) / Decimal('100'))
        total = subtotal + tax_amt
        # Corrected Profit Calculation: (Net Revenue - Total Cost)
        # Tax is a liability, not part of business profit.
        profit = subtotal - total_cost

        return {
            'subtotal': subtotal,
            'total': total,
            'totalCost': total_cost,
            'profit': profit,
            'discount': total_discount,
            'taxAmount': tax_amt
        }

    def _process_inventory(self, items, branch_id, user_id, receipt_number, date_obj):
        if not date_obj:
            date_obj = datetime.now()
            
        for item in items:
            product_id = item.get('productId')
            if not product_id:
                continue
                
            try:
                product = Product.objects.select_for_update().get(id=product_id)
            except Product.DoesNotExist:
                continue
                
            qty_sold = to_decimal(item.get('quantity', 0))
            old_stock = product.stock
            new_stock = old_stock - qty_sold
            
            product.stock = new_stock
            product.save(update_fields=['stock'])
            
            ProductHistory.objects.create(
                user_id=user_id,
                branch_id=branch_id,
                product=product,
                old_stock=old_stock,
                new_stock=new_stock,
                type='SALE',
                change_reason='SALE',
                reason=f"Sale #{receipt_number}",
                reference_id=receipt_number,
                reference_type='SALE',
                created_at=date_obj
            )

    def _create_sale_from_data(self, data, user_id):
        raw_items = data.get('items', [])
        tax_rate = to_decimal(data.get('taxRate', 0))
        branch_id = data.get('branchId')
        status_val = data.get('paymentStatus', 'PENDING')
        
        financials = self.calculate_financials(raw_items, tax_rate)
        
        import uuid
        receipt_number = data.get('receiptNumber')
        
        # Check for receipt number collision and handle it gracefully
        if receipt_number and Sale.objects.filter(receipt_number=receipt_number).exists():
            receipt_number = f"{receipt_number}-{uuid.uuid4().hex[:4].upper()}"

        sale = Sale.objects.create(
            id=f"sl_{uuid.uuid4().hex[:12]}",
            user_id=user_id,
            branch_id=branch_id,
            agency_id=data.get('agencyId'),
            receipt_number=receipt_number,
            customer_name=data.get('customerName', 'Valued Customer'),
            customer_phone=data.get('customerContact'),
            customer_address=data.get('customerAddress'),
            customer_id=data.get('customerId'),
            category_id=data.get('categoryId'),
            status=status_val,
            amount_paid=to_decimal(data.get('amountPaid', 0)),
            balance_due=to_decimal(data.get('amountDue', 0)),
            notes=data.get('notes'),
            shipping_cost=to_decimal(data.get('shippingCost', 0)),
            discount_reason=data.get('discountReason'),
            payment_reference=data.get('paymentReference'),
            cash_transaction_id=data.get('cashTransactionId'),
            tax_amount=financials['taxAmount'],
            subtotal=financials['subtotal'],
            discount_amount=financials['discount'],
            total_amount=financials['total'] + to_decimal(data.get('shippingCost', 0)),
            total_cost=financials['totalCost'],
            profit=financials['profit'],
        )
        
        for item in raw_items:
            qty = to_decimal(item.get('quantity', 0))
            price = to_decimal(item.get('price', 0))
            item_sub = price * qty
            
            discount_type = item.get('discountType', 'percentage')
            if discount_type == 'amount':
                discount_amt = to_decimal(item.get('discountAmount', 0))
                discount_perc = Decimal('0')
            else:
                discount_perc = to_decimal(item.get('discountPercentage', 0))
                discount_amt = (item_sub * discount_perc) / Decimal('100')
                
            SaleItem.objects.create(
                id=f"si_{uuid.uuid4().hex[:12]}",
                sale=sale,
                agency_id=sale.agency_id,
                branch_id=sale.branch_id,
                product_id=item.get('productId'),
                product_name=item.get('productName') or item.get('description') or 'Unknown Product',
                quantity=qty,
                unit_price=price,
                subtotal=item_sub,
                discount=discount_amt,
                discount_type=discount_type,
                discount_percentage=discount_perc,
                total=item_sub - discount_amt,
                cost_price=to_decimal(item.get('cost', 0))
            )
            
        if status_val != 'QUOTE':
            # Ensure we have a valid date even before commit
            processed_date = getattr(sale, 'date', None) or datetime.now()
            self._process_inventory(raw_items, branch_id, user_id, sale.receipt_number, processed_date)
            
        return sale

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        user_id = request.data.get('userId') or request.user.id
        sale = self._create_sale_from_data(request.data, user_id)
        return Response(SaleSerializer(sale).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def bulk_sync(self, request):
        sales_data = request.data
        if not isinstance(sales_data, list):
            return Response({"error": "Expected a list of sales"}, status=400)
            
        processed = []
        errors = []
        
        for s in sales_data:
            try:
                with transaction.atomic():
                    user_id = s.get('userId') or request.user.id
                    sale = self._create_sale_from_data(s, user_id)
                    processed.append({
                        'localId': s.get('localId'),
                        'serverId': sale.id,
                        'receiptNumber': sale.receipt_number
                    })
            except Exception as e:
                errors.append({'localId': s.get('localId'), 'error': str(e)})
                    
        return Response({'processed': processed, 'errors': errors})

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        sale = self.get_object()
        data = request.data
        items = data.pop('items', [])
        tax_rate = to_decimal(data.get('taxRate', sale.tax_amount / max(sale.subtotal, Decimal('1')) * 100))
        branch_id = sale.branch_id
        user_id = data.get('userId') or request.user.id
        new_status = data.get('paymentStatus', sale.status)
        old_status = sale.status
        
        financials = self.calculate_financials(items, tax_rate)
        
        if old_status != 'QUOTE' or new_status != 'QUOTE':
            old_items = list(sale.items.all())
            
            if old_status != 'QUOTE':
                # Restore old inventory
                for item in old_items:
                    if item.product_id:
                        try:
                            prod = Product.objects.select_for_update().get(id=item.product_id)
                            prod.stock += item.quantity
                            prod.save(update_fields=['stock'])
                        except Product.DoesNotExist:
                            pass
            
            if new_status != 'QUOTE':
                self._process_inventory(items, branch_id, user_id, sale.receipt_number, datetime.now())
        
        sale.items.all().delete()
        for item in items:
            qty = to_decimal(item.get('quantity', 0))
            price = to_decimal(item.get('price', 0))
            item_sub = price * qty

            discount_type = item.get('discountType', 'percentage')
            if discount_type == 'amount':
                discount_amt = to_decimal(item.get('discountAmount', 0))
                discount_perc = Decimal('0')
            else:
                discount_perc = to_decimal(item.get('discountPercentage', 0))
                discount_amt = (item_sub * discount_perc) / Decimal('100')

            import uuid
            SaleItem.objects.create(
                id=f"si_{uuid.uuid4().hex[:12]}",
                sale=sale,
                agency_id=sale.agency_id,
                branch_id=sale.branch_id,
                product_id=item.get('productId'),
                product_name=item.get('productName') or item.get('description') or 'Unknown Product',
                quantity=qty,
                unit_price=price,
                subtotal=item_sub,
                discount=discount_amt,
                discount_type=discount_type,
                discount_percentage=discount_perc,
                total=item_sub - discount_amt,
                cost_price=to_decimal(item.get('cost', 0))
            )

        sale.status = new_status
        sale.amount_paid = to_decimal(data.get('amountPaid', sale.amount_paid))
        sale.balance_due = to_decimal(data.get('amountDue', sale.balance_due))
        if 'customerContact' in data: sale.customer_phone = data['customerContact']
        if 'customerAddress' in data: sale.customer_address = data['customerAddress']
        if 'customerName' in data: sale.customer_name = data['customerName']
        if 'customerId' in data: sale.customer_id = data['customerId']
        if 'categoryId' in data: sale.category_id = data['categoryId']
        if 'shippingCost' in data: sale.shipping_cost = to_decimal(data['shippingCost'])
        if 'discountReason' in data: sale.discount_reason = data['discountReason']
        if 'paymentReference' in data: sale.payment_reference = data['paymentReference']
        if 'cashTransactionId' in data: sale.cash_transaction_id = data['cashTransactionId']
        
        sale.subtotal = financials['subtotal']
        sale.total_amount = financials['total'] + sale.shipping_cost
        sale.discount_amount = financials['discount']
        sale.tax_amount = financials['taxAmount']
        sale.save()

        return Response(SaleSerializer(sale).data)

    @action(detail=True, methods=['get'])
    def receipt_pdf(self, request, pk=None):
        sale = self.get_object()
        buffer = io.BytesIO()
        report = ReceiptGenerator(buffer, title="Official Receipt")
        elements = report.generate(sale)
        return generate_pdf_response(elements, f"Receipt_{sale.receipt_number}", buffer)

    @action(detail=False, methods=['get'])
    def sales_report_pdf(self, request):
        branch_id = request.query_params.get('branchId')
        start_date = request.query_params.get('startDate')
        end_date = request.query_params.get('endDate')
        
        queryset = self.get_queryset()
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
        if start_date:
            queryset = queryset.filter(date__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__date__lte=end_date)
            
        queryset = queryset.order_by('-date')
        
        if not queryset.exists():
            return Response({"error": "No sales found for the given criteria"}, status=404)
            
        period_label = f"{start_date or 'All'} to {end_date or 'Now'}"
        buffer = io.BytesIO()
        report = SalesReportGenerator(buffer, title="Sales Report")
        elements = report.generate(queryset, period_label)
        
        return generate_pdf_response(elements, "Sales_Report", buffer)

    @action(detail=False, methods=['get'])
    def profit_loss_pdf(self, request):
        branch_id = request.query_params.get('branchId')
        start_date = request.query_params.get('startDate')
        end_date = request.query_params.get('endDate')
        
        if not branch_id:
            return Response({"error": "branchId required"}, status=400)
            
        sales = self.get_queryset().filter(branch_id=branch_id)
        expenses = Expense.objects.filter(branch_id=branch_id)
        
        if start_date:
            sales = sales.filter(date__date__gte=start_date)
            expenses = expenses.filter(date__date__gte=start_date)
        if end_date:
            sales = sales.filter(date__date__lte=end_date)
            expenses = expenses.filter(date__date__lte=end_date)
            
        total_sales = sales.aggregate(total=Sum('total_amount'))['total'] or Decimal('0')
        total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        from core_app.models import Agency
        agency = Agency.objects.filter(branches__id=branch_id).first()
        
        data = {
            'agency': agency,
            'total_sales': total_sales,
            'total_expenses': total_expenses
        }
        
        period_label = f"{start_date or 'All'} to {end_date or 'Now'}"
        buffer = io.BytesIO()
        report = ProfitLossGenerator(buffer, title="Profit & Loss Report")
        elements = report.generate(data, period_label)
        
        return generate_pdf_response(elements, "Profit_Loss_Report", buffer)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        sale = self.get_object()
        user_id = request.user.id
        # Extract deletedReason from query parameters or body
        deleted_reason = request.query_params.get('deletedReason') or request.data.get('deletedReason')

        from .logic.deletion import process_sale_deletion
        success, message = process_sale_deletion(sale.id, user_id, deleted_reason=deleted_reason)

        if success:
            return Response(status=status.HTTP_204_NO_CONTENT)
        else:
            return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)
    @action(detail=False, methods=['get'])
    def category_summary(self, request):
        branch_id = request.query_params.get('branchId')
        start_date = request.query_params.get('startDate')
        end_date = request.query_params.get('endDate')
        
        if not branch_id:
            return Response({"error": "branchId required"}, status=400)
            
        # 1. Base Queryset for Sales
        sales_qs = self.get_queryset().filter(branch_id=branch_id).exclude(status='QUOTE')
        if start_date:
            sales_qs = sales_qs.filter(date__gte=start_date)
        if end_date:
            sales_qs = sales_qs.filter(date__lte=end_date)
            
        # 2. Get Aggregated Stats for existing sales
        stats = sales_qs.values('category_id').annotate(
            revenue=Sum('total_amount'),
            profit=Sum('profit'),
            transactions=Count('id')
        )
        
        stats_map = {item['category_id']: item for item in stats}
        
        # 3. Get ALL defined categories for this branch
        all_categories = SaleCategory.objects.filter(branch_id=branch_id)
        
        results = []
        # Add all defined categories (even if 0 sales)
        for cat in all_categories:
            cat_stats = stats_map.get(cat.id, {
                'revenue': 0,
                'profit': 0,
                'transactions': 0
            })
            results.append({
                "id": cat.id,
                "name": cat.name,
                "revenue": float(cat_stats['revenue'] or 0),
                "profit": float(cat_stats['profit'] or 0),
                "transactions": cat_stats['transactions']
            })
            
        # 4. Handle Uncategorized Sales (where category_id is None)
        if None in stats_map:
            uncat = stats_map[None]
            results.append({
                "id": "uncategorized",
                "name": "Uncategorized",
                "revenue": float(uncat['revenue'] or 0),
                "profit": float(uncat['profit'] or 0),
                "transactions": uncat['transactions']
            })
            
        # Sort by revenue descending
        results.sort(key=lambda x: x['revenue'], reverse=True)
        
        return Response(results)

    @action(detail=False, methods=['get'])
    def next_receipt_number(self, request):
        branch_id = request.query_params.get('branchId')
        if not branch_id:
            return Response({"error": "branchId required"}, status=400)
            
        last_sale = Sale.objects.filter(branch_id=branch_id).order_by('-receipt_number').first()
        
        if last_sale and last_sale.receipt_number:
            try:
                # Try to extract the number from strings like "PAY-000001" or just "000001"
                import re
                nums = re.findall(r'\d+', last_sale.receipt_number)
                if nums:
                    last_num = int(nums[-1])
                    next_num = str(last_num + 1).zfill(6)
                else:
                    next_num = "000001"
            except (ValueError, TypeError):
                next_num = "000001"
        else:
            next_num = "000001"
            
        return Response({"next_number": next_num})

    @action(detail=False, methods=['get'])
    def period_aggregate(self, request):
        branch_id = request.query_params.get('branchId')
        start = request.query_params.get('startDate')
        end = request.query_params.get('endDate')
        
        qs = self.get_queryset().filter(branch_id=branch_id, date__range=[start, end]).exclude(status='QUOTE')
        total = qs.aggregate(t=Sum('total_amount'))['t'] or 0
        return Response({"total": total})

    @action(detail=False, methods=['get'])
    def top_customers(self, request):
        branch_id = request.query_params.get('branchId')
        if not branch_id:
            return Response({"error": "branchId required"}, status=400)
            
        # Group by customer_name and aggregate
        # We also want to include customer_id if available (using Min/Max is a trick to get non-grouped field)
        from django.db.models import Max, F
        
        qs = self.get_queryset().filter(branch_id=branch_id).exclude(status='QUOTE')
        
        # Group by customer ID or name if no ID
        stats = qs.values('customer_id', 'customer_name').annotate(
            totalPurchases=Sum('total_amount'),
            orderCount=Count('id')
        ).order_by('-totalPurchases')
        
        # Format for frontend
        results = [
            {
                "id": item['customer_id'],
                "name": item['customer_name'] or "Walking Customer",
                "totalPurchases": float(item['totalPurchases']),
                "orderCount": item['orderCount']
            }
            for item in stats
        ]
        
        return Response(results)


class SaleItemViewSet(viewsets.ModelViewSet):
    queryset = SaleItem.objects.all()
    serializer_class = SaleItemSerializer
    permission_classes = [IsAuthenticated]

class InstallmentPaymentViewSet(viewsets.ModelViewSet):
    queryset = InstallmentPayment.objects.all()
    serializer_class = InstallmentPaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        sale_id = self.request.query_params.get('saleId')
        branch_id = self.request.query_params.get('branchId')
        if sale_id: qs = qs.filter(sale_id=sale_id)
        if branch_id: qs = qs.filter(branch_id=branch_id)
        return qs.order_by('-date')

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        data = request.data
        sale_id = data.get('saleId')
        branch_id = data.get('locationId')
        account_id = data.get('accountId')
        amount = to_decimal(data.get('amount', 0))
        date_val = data.get('paymentDate') or data.get('date') or datetime.now()
        
        if not sale_id:
            return Response({"error": "saleId is required"}, status=400)
            
        try:
            sale = Sale.objects.select_for_update().get(id=sale_id)
        except Sale.DoesNotExist:
            return Response({"error": "Sale not found"}, status=404)

        if amount <= 0:
            return Response({"error": "Payment amount must be greater than zero"}, status=400)

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        payment = serializer.save(
            branch_id=branch_id, 
            agency_id=sale.agency_id,
            amount=amount, 
            date=date_val
        )
        
        # Update sale totals
        sale.amount_paid += amount
        sale.balance_due = max(0, sale.total_amount - sale.amount_paid)
        if sale.balance_due == 0:
            sale.status = 'COMPLETED'
        sale.save(update_fields=['amount_paid', 'balance_due', 'status'])
        
        if account_id and branch_id and not payment.cash_transaction_id:
            from finance.models import CashTransaction
            desc = f"Installment payment for {sale.customer.name if sale.customer else sale.customer_name} - Receipt #{sale.receipt_number}"
            cash_tx = CashTransaction.objects.create(
                user_id=payment.received_by_id or request.user.id,
                branch_id=branch_id,
                account_id=account_id,
                amount=amount,
                transaction_type='cash_in',
                category='Installment payment',
                description=desc,
                date=date_val
            )
            payment.cash_transaction = cash_tx
            payment.save(update_fields=['cash_transaction'])
            
        return Response(self.get_serializer(payment).data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        payment = self.get_object()
        serializer = self.get_serializer(payment, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        payment = serializer.save()
        
        if payment.cash_transaction_id:
            payment.cash_transaction.amount = payment.amount
            if 'paymentDate' in request.data or 'date' in request.data:
                payment.cash_transaction.date = payment.date
            payment.cash_transaction.save(update_fields=['amount', 'date'])
            
        return Response(self.get_serializer(payment).data)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        payment = self.get_object()
        if payment.cash_transaction_id:
            payment.cash_transaction.delete()
        payment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def link_cash(self, request, pk=None):
        payment = self.get_object()
        account_id = request.data.get('accountId')
        branch_id = request.data.get('locationId')
        
        if payment.cash_transaction_id:
            return Response({"error": "Already linked"}, status=400)
            
        from finance.models import CashTransaction
        sale = payment.sale
        desc = f"Installment payment for {sale.customer.name if sale.customer else sale.customer_name} - Receipt #{sale.receipt_number}"
        cash_tx = CashTransaction.objects.create(
            user_id=request.user.id,
            branch_id=branch_id,
            account_id=account_id,
            amount=payment.amount,
            transaction_type='cash_in',
            category='Installment payment',
            description=desc,
            date=payment.date
        )
        payment.cash_transaction = cash_tx
        payment.save(update_fields=['cash_transaction'])
        return Response({"status": "linked"})

    @action(detail=True, methods=['post'])
    def unlink_cash(self, request, pk=None):
        payment = self.get_object()
        if payment.cash_transaction_id:
            payment.cash_transaction.delete()
            payment.cash_transaction = None
            payment.save(update_fields=['cash_transaction'])
        return Response({"status": "unlinked"})
