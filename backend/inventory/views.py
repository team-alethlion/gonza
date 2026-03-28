from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction, connection
from django.utils.dateparse import parse_datetime, parse_date
from datetime import datetime
from django.db.models import Sum, Count, F, Q, IntegerField, DecimalField
from django.db.models.functions import Coalesce, Cast
import csv
import io
from decimal import Decimal
import uuid
from core_app.models import Agency
from core_app.pdf_utils import StockSummaryGenerator, generate_pdf_response
import io

from .models import (
    Supplier, Category, Product, StockAudit, StockAuditItem,
    ProductHistory, StockTransfer, StockTransferItem,
    Requisition, RequisitionItem
)
from .serializers import (
    SupplierSerializer, CategorySerializer, ProductSerializer,
    StockAuditSerializer, ProductHistorySerializer, StockTransferSerializer,
    RequisitionSerializer
)
from core_app.models import BranchCounter
from .filters import ProductFilter

class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated]

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = ProductFilter
    search_fields = ['name', 'sku', 'barcode', 'description']
    
    def get_queryset(self):
        # We don't always need to filter by branch here if the filterset handles it,
        # but for security/correctness we still baseline it.
        # However, the filterset 'branch_id' field will handle the query_param.
        return super().get_queryset()

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        branch_id = data.get('branch_id') or data.get('branch')
        user_id = data.get('user_id') or data.get('user') or request.user.id
        
        # 🛡️ SAFETY: Ensure agency is assigned from branch if missing
        if not data.get('agency'):
            from core_app.models import Branch
            try:
                branch = Branch.objects.get(id=branch_id)
                data['agency'] = branch.agency_id
            except:
                pass

        # 🛡️ SAFETY: Ensure user is assigned
        if not data.get('user'):
            data['user'] = user_id
        
        with transaction.atomic():
            if branch_id:
                counter, _ = BranchCounter.objects.get_or_create(branch_id=branch_id, type='product', defaults={'count': 0})
                counter.count += 1
                counter.save()
                data['sku'] = f"PROD-{str(counter.count).zfill(4)}"
            
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            product = serializer.save()
            
            if product.stock > 0 and user_id and branch_id:
                ProductHistory.objects.create(
                    user_id=user_id,
                    branch_id=branch_id,
                    product=product,
                    type='CREATED',
                    old_stock=0,
                    new_stock=product.stock,
                    quantity_change=product.stock,
                    reason=f"[{product.name}] | Initial stock",
                )
                
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        return self._do_update(request, partial=False, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        return self._do_update(request, partial=True, *args, **kwargs)

    def _do_update(self, request, partial, *args, **kwargs):
        kwargs['partial'] = partial
        instance = self.get_object()
        old_stock = instance.stock
        user_id = request.data.get('user_id') or request.user.id
        custom_reason = request.data.get('customChangeReason')
        is_from_sale = request.data.get('isFromSale')
        
        # 🚀 SUPPORT ABSOLUTE STOCK SETTING
        absolute_stock = request.data.get('absoluteStock')
        
        with transaction.atomic():
            data = request.data.copy()
            if absolute_stock is not None:
                # If absolute stock is provided, ensure the serializer sets the stock correctly
                data['stock'] = absolute_stock

            serializer = self.get_serializer(instance, data=data, partial=partial)
            serializer.is_valid(raise_exception=True)
            product = serializer.save()
            
            if product.stock != old_stock and custom_reason != 'skip-history':
                change_reason = custom_reason
                if not change_reason:
                    if is_from_sale: change_reason = "Sale"
                    elif absolute_stock is not None: change_reason = "Opening Stock Adjustment" # 🛡️ Accurate Reason
                    elif product.stock > old_stock: change_reason = "Manual stock addition"
                    else: change_reason = "Manual stock reduction"
                
        # Determine type - use ADJUSTMENT for absolute setting
                type_enum = 'SALE' if is_from_sale else ('RESTOCK' if product.stock > old_stock else 'ADJUSTMENT')
                if absolute_stock is not None: type_enum = 'ADJUSTMENT'

                # 🛡️ DATA INTEGRITY: Prevent backdating before product creation
                from django.utils import timezone
                final_created_at = None
                created_at_raw = request.data.get('adjustmentDate') or request.data.get('createdAt')
                
                if created_at_raw:
                    parsed_dt = parse_datetime(created_at_raw) if isinstance(created_at_raw, str) else created_at_raw
                    if parsed_dt:
                        if parsed_dt < product.created_at:
                            from datetime import timedelta
                            final_created_at = product.created_at + timedelta(seconds=1)
                        else:
                            final_created_at = parsed_dt
                
                if final_created_at is None:
                    final_created_at = timezone.now()

                ProductHistory.objects.create(
                    user_id=user_id,
                    branch_id=product.branch_id,
                    product=product,
                    type=type_enum,
                    old_stock=old_stock,
                    new_stock=product.stock,
                    quantity_change=product.stock - old_stock,
                    reason=f"[{product.name}] | {change_reason}",
                    reference_id=request.data.get('referenceId'),
                    created_at=final_created_at
                )
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def delta(self, request):
        branch_id = self.request.query_params.get('branch_id')
        since = self.request.query_params.get('since', '0')
        
        from django.utils import timezone
        server_now = int(timezone.now().timestamp() * 1000)
        
        qs = self.get_queryset()
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
            
        if since and since != '0':
            try:
                # Convert since (milliseconds) to datetime
                from django.utils import timezone
                since_dt = timezone.datetime.fromtimestamp(int(since) / 1000.0, tz=timezone.get_current_timezone())
                qs = qs.filter(updated_at__gt=since_dt)
            except (ValueError, TypeError):
                pass
                
        serializer = self.get_serializer(qs, many=True)
        return Response({
            "products": serializer.data,
            "server_time": server_now
        })

    @action(detail=False, methods=['get'])
    def lookup(self, request):
        code = request.query_params.get('code', '').lower()
        branch_id = request.query_params.get('branchId')
        product = self.get_queryset().filter(
            Q(branch_id=branch_id) & (Q(barcode__icontains=code) | Q(sku__icontains=code))
        ).first()
        if product:
            return Response(self.get_serializer(product).data)
        return Response({"error": "Not found"}, status=404)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        branch_id = request.query_params.get('branchId')
        qs = self.get_queryset().filter(branch_id=branch_id)
        
        stats = qs.aggregate(
            costValue=Coalesce(Sum(F('stock') * F('cost_price'), output_field=DecimalField()), 0.0),
            stockValue=Coalesce(Sum(F('stock') * F('selling_price'), output_field=DecimalField()), 0.0),
            outOfStock=Count('id', filter=Q(stock__lte=0)),
            lowStock=Count('id', filter=Q(stock__gt=0, stock__lte=F('min_stock')))
        )
        return Response(stats)

    @action(detail=False, methods=['post'])
    def bulk_upload(self, request):
        branch_id = request.data.get('branch_id')
        user_id = request.data.get('user_id')
        csv_file = request.FILES.get('file')

        if not all([branch_id, user_id, csv_file]):
            return Response({"error": "Missing branch_id, user_id, or file"}, status=400)

        from core_app.models import Branch
        try:
            branch = Branch.objects.get(id=branch_id)
            agency = branch.agency
        except Branch.DoesNotExist:
            return Response({"error": "Branch not found"}, status=404)

        results = {"successCount": 0, "errors": []}
        
        try:
            decoded_file = csv_file.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
            
            with transaction.atomic():
                for row_idx, row in enumerate(reader, start=2):
                    try:
                        sku = row.get('Item Number') or row.get('SKU')
                        name = row.get('Product Name') or row.get('Name')
                        
                        if not sku and not name:
                            continue

                        product = None
                        if sku:
                            product = Product.objects.filter(branch_id=branch_id, sku=sku).first()
                        
                        if not product and name:
                            product = Product.objects.filter(branch_id=branch_id, name=name).first()

                        old_stock = 0
                        is_new = False

                        if product:
                            old_stock = product.stock
                        else:
                            is_new = True
                            pid = f"prod_{uuid.uuid4().hex[:8]}"
                            
                            counter, _ = BranchCounter.objects.get_or_create(branch_id=branch_id, type='product', defaults={'count': 0})
                            counter.count += 1
                            counter.save()
                            new_sku = sku or f"PROD-{str(counter.count).zfill(4)}"
                            
                            product = Product(
                                id=pid,
                                branch_id=branch_id,
                                user_id=user_id,
                                agency=agency,
                                sku=new_sku,
                                name=name or "Unnamed Product"
                            )

                        # Update fields from CSV
                        if 'Description' in row: product.description = row['Description']
                        
                        # Handle potential empty strings for numeric fields
                        def to_decimal(val, default=0):
                            if not val or val.strip() == '': return Decimal(str(default))
                            try: return Decimal(val.replace(',', ''))
                            except: return Decimal(str(default))

                        def to_int(val, default=0):
                            if not val or val.strip() == '': return default
                            try: return int(float(val.replace(',', '')))
                            except: return default

                        if 'Cost Price' in row: product.cost_price = to_decimal(row['Cost Price'])
                        if 'Selling Price' in row: product.selling_price = to_decimal(row['Selling Price'])
                        if 'Minimum Stock Level' in row: product.min_stock = to_int(row['Minimum Stock Level'])
                        if 'Manufacturer Barcode' in row: product.manufacturer_barcode = row['Manufacturer Barcode']
                        if 'Barcode' in row: product.barcode = row['Barcode']
                        
                        # Supplier handling
                        supplier_name = row.get('Supplier')
                        if supplier_name and supplier_name.strip():
                            supplier, _ = Supplier.objects.get_or_create(
                                name=supplier_name.strip(), 
                                agency=agency,
                                defaults={'id': f"sup_{uuid.uuid4().hex[:8]}"}
                            )
                            product.supplier = supplier

                        # Category handling
                        category_name = row.get('Category')
                        if category_name and category_name.strip():
                            category, _ = Category.objects.get_or_create(
                                name=category_name.strip(),
                                branch=branch,
                                defaults={'id': f"cat_{uuid.uuid4().hex[:8]}", 'user_id': user_id, 'agency': agency}
                            )
                            product.category = category

                        # Stock handling
                        stock_val = row.get('Quantity') or row.get('Initial Stock') or row.get('Stock')
                        if stock_val is not None:
                            product.stock = to_int(stock_val, product.stock)

                        product.save()

                        # History logging
                        hist_id = f"hist_{uuid.uuid4().hex[:10]}"
                        if is_new:
                            ProductHistory.objects.create(
                                id=hist_id,
                                user_id=user_id,
                                branch_id=branch_id,
                                product=product,
                                type='CREATED',
                                old_stock=0,
                                new_stock=product.stock,
                                quantity_change=product.stock,
                                reason=f"Bulk Upload | Created",
                            )
                        elif product.stock != old_stock:
                            ProductHistory.objects.create(
                                id=hist_id,
                                user_id=user_id,
                                branch_id=branch_id,
                                product=product,
                                type='ADJUSTMENT',
                                old_stock=old_stock,
                                new_stock=product.stock,
                                quantity_change=product.stock - old_stock,
                                reason=f"Bulk Upload | Updated",
                            )

                        results["successCount"] += 1

                    except Exception as e:
                        results["errors"].append({"row": row_idx, "message": str(e)})

            return Response(results)
        except Exception as e:
            return Response({"error": f"Failed to process CSV: {str(e)}"}, status=500)

    @action(detail=False, methods=['get'])
    def summary_report(self, request):
        branch_id = request.query_params.get('locationId')
        start_date = request.query_params.get('startDate')
        end_date = request.query_params.get('endDate')
        
        if not all([branch_id, start_date, end_date]):
            return Response({"error": "Missing parameters"}, status=400)
            
        try:
            start_date = parse_datetime(start_date) or parse_date(start_date)
            end_date = parse_datetime(end_date) or parse_date(end_date)
            if not start_date or not end_date:
                raise ValueError()
        except Exception:
            return Response({"error": "Invalid dates"}, status=400)

        query = """
            WITH ProductMetrics AS (
                SELECT 
                    "product_id",
                    SUM(CASE WHEN "type" = 'SALE' THEN ABS("new_stock" - "old_stock") ELSE 0 END) as "itemsSold",
                    SUM(CASE WHEN "type" IN ('STOCK_IN', 'RESTOCK') THEN ("new_stock" - "old_stock") ELSE 0 END) as "stockIn",
                    SUM(CASE WHEN ("new_stock" - "old_stock") > 0 AND "type" NOT IN ('STOCK_IN', 'RESTOCK', 'SALE') THEN ("new_stock" - "old_stock") ELSE 0 END) as "adjustmentsIn",
                    SUM(CASE WHEN ("new_stock" - "old_stock") < 0 AND "type" NOT IN ('STOCK_IN', 'RESTOCK', 'SALE') THEN ABS("new_stock" - "old_stock") ELSE 0 END) as "adjustmentsOut"
                FROM inventory_producthistory
                WHERE branch_id = %s AND created_at BETWEEN %s AND %s
                GROUP BY "product_id"
            ),
            LastHistoryID AS (
                SELECT "product_id", MAX(id) as max_id
                FROM inventory_producthistory
                WHERE branch_id = %s AND created_at <= %s
                GROUP BY "product_id"
            ),
            ClosingStock AS (
                SELECT h."product_id", h."new_stock" as "closingStock"
                FROM inventory_producthistory h
                JOIN LastHistoryID lh ON h.id = lh.max_id
            )
            SELECT 
                p.id as "productId",
                p.name as "productName",
                p.sku as "itemNumber",
                p.image_url as "imageUrl",
                p.cost_price as "costPrice",
                p.selling_price as "sellingPrice",
                c.name as "category",
                COALESCE(cs."closingStock", 0) as "closingStock",
                COALESCE(pm."itemsSold", 0) as "itemsSold",
                COALESCE(pm."stockIn", 0) as "stockIn",
                COALESCE(pm."adjustmentsIn", 0) as "adjustmentsIn",
                COALESCE(pm."adjustmentsOut", 0) as "adjustmentsOut"
            FROM inventory_product p
            LEFT JOIN inventory_category c ON p.category_id = c.id
            LEFT JOIN ProductMetrics pm ON p.id = pm."product_id"
            LEFT JOIN ClosingStock cs ON p.id = cs."product_id"
            WHERE p.branch_id = %s
        """
        
        with connection.cursor() as cursor:
            # Note: MaxHistoryID needs branch_id and end_date too
            cursor.execute(query, [branch_id, start_date, end_date, branch_id, end_date, branch_id])
            columns = [col[0] for col in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]

        formatted = []
        summary = {
            "totalOpeningStock": 0,
            "totalStockIn": 0,
            "totalItemsSold": 0,
            "totalAdjustmentsIn": 0,
            "totalAdjustmentsOut": 0,
            "totalClosingStock": 0,
            "totalRevaluation": 0
        }

        for row in results:
            def safe_float(v):
                try: return float(v or 0)
                except: return 0.0

            closing_stock = safe_float(row.get('closingStock'))
            items_sold = safe_float(row.get('itemsSold'))
            stock_in = safe_float(row.get('stockIn'))
            adj_in = safe_float(row.get('adjustmentsIn'))
            adj_out = safe_float(row.get('adjustmentsOut'))
            cost_price = safe_float(row.get('costPrice'))
            
            opening_stock = closing_stock - (stock_in + adj_in) + (items_sold + adj_out)
            revaluation = closing_stock * cost_price

            formatted.append({
                "productId": row.get('productId'),
                "productName": row.get('productName'),
                "itemNumber": row.get('itemNumber') or row.get('productId'),
                "imageUrl": row.get('imageUrl'),
                "costPrice": cost_price,
                "sellingPrice": safe_float(row.get('sellingPrice')),
                "category": row.get('category'),
                "openingStock": opening_stock,
                "itemsSold": items_sold,
                "stockIn": stock_in,
                "transferOut": 0,
                "returnIn": 0,
                "returnOut": 0,
                "adjustmentsIn": adj_in,
                "adjustmentsOut": adj_out,
                "closingStock": closing_stock,
                "revaluation": revaluation
            })

            summary["totalOpeningStock"] += opening_stock
            summary["totalStockIn"] += stock_in
            summary["totalItemsSold"] += items_sold
            summary["totalAdjustmentsIn"] += adj_in
            summary["totalAdjustmentsOut"] += adj_out
            summary["totalClosingStock"] += closing_stock
            summary["totalRevaluation"] += revaluation

        return Response({
            "items": formatted,
            "summary": summary
        })
    @action(detail=False, methods=['get'])
    def sold_items(self, request):
        branch_id = request.query_params.get('branchId')
        start_date_str = request.query_params.get('startDate')
        end_date_str = request.query_params.get('endDate')

        if not all([branch_id, start_date_str, end_date_str]):
            return Response({"error": "Missing parameters"}, status=400)

        try:
            start_date = parse_datetime(start_date_str) or datetime.combine(parse_date(start_date_str), datetime.min.time())
            end_date = parse_datetime(end_date_str) or datetime.combine(parse_date(end_date_str), datetime.max.time())
        except (ValueError, TypeError):
            return Response({"error": "Invalid dates"}, status=400)

        from sales.models import Sale, SaleItem
        from django.db.models import Sum, F, DecimalField
        from django.db.models.functions import Cast

        from django.db.models import Case, When, Value, DecimalField, ExpressionWrapper

        # 1. Get the SOURCE OF TRUTH from the Sale table (matching Sales Overview)
        sales_qs = Sale.objects.filter(
            branch_id=branch_id,
            date__range=[start_date, end_date]
        ).exclude(status='QUOTE')

        sales_totals = sales_qs.aggregate(
            total=Sum('total_amount'),
            discount=Sum('discount_amount'),
            profit=Sum('profit')
        )

        total_sales = float(sales_totals['total'] or 0)
        total_discount = float(sales_totals['discount'] or 0)
        total_profit = float(sales_totals['profit'] or 0)

        # 2. Attribute Sale-level discount and profit pro-rata with remainder handling
        # This ensures the sum of items EXACTLY matches the Sale totals
        product_data = {}

        # Prefetch items to avoid N+1
        sales_with_items = sales_qs.prefetch_related('items')

        for sale in sales_with_items:
            items = list(sale.items.all())
            if not items:
                continue

            sale_subtotal = sale.subtotal or Decimal('0')
            sale_discount = sale.discount_amount or Decimal('0')
            sale_profit = sale.profit or Decimal('0')

            remaining_discount = sale_discount
            remaining_profit = sale_profit

            for i, item in enumerate(items):
                is_last = (i == len(items) - 1)
                
                # Calculate weights and attributed values
                if is_last:
                    attributed_discount = remaining_discount
                    attributed_profit = remaining_profit
                else:
                    if sale_subtotal > 0:
                        weight = item.subtotal / sale_subtotal
                        attributed_discount = (weight * sale_discount).quantize(Decimal('0.01'))
                        attributed_profit = (weight * sale_profit).quantize(Decimal('0.01'))
                    else:
                        # If subtotal is 0 but there's discount/profit (edge case), distribute evenly
                        attributed_discount = (sale_discount / len(items)).quantize(Decimal('0.01'))
                        attributed_profit = (sale_profit / len(items)).quantize(Decimal('0.01'))
                    
                    remaining_discount -= attributed_discount
                    remaining_profit -= attributed_profit

                attributed_total = item.subtotal - attributed_discount
                cost_value = item.cost_price * item.quantity

                # Aggregate by Product
                p_id = item.product_id or "unknown"
                if p_id not in product_data:
                    product_data[p_id] = {
                        "description": item.product_name,
                        "totalQuantity": Decimal('0'),
                        "totalAmount": Decimal('0'),
                        "totalCost": Decimal('0'),
                        "totalProfit": Decimal('0'),
                        "totalDiscount": Decimal('0'),
                        "productIds": [item.product_id] if item.product_id else []
                    }
                
                pd = product_data[p_id]
                pd["totalQuantity"] += item.quantity
                pd["totalAmount"] += attributed_total
                pd["totalCost"] += cost_value
                pd["totalProfit"] += attributed_profit
                pd["totalDiscount"] += attributed_discount

        # 3. Format results for Response
        formatted = []
        for p_id, pd in product_data.items():
            qty = float(pd["totalQuantity"])
            total_amt = float(pd["totalAmount"])
            total_cost = float(pd["totalCost"])
            
            formatted.append({
                "description": pd["description"],
                "totalQuantity": qty,
                "averagePrice": round(total_amt / qty, 2) if qty > 0 else 0,
                "totalAmount": total_amt,
                "totalCost": total_cost,
                "totalProfit": float(pd["totalProfit"]),
                "totalDiscount": float(pd["totalDiscount"]),
                "averageCost": round(total_cost / qty, 2) if qty > 0 else 0,
                "productIds": pd["productIds"]
            })

        # Sort by totalAmount descending
        formatted.sort(key=lambda x: x["totalAmount"], reverse=True)

        summary = {
            "totalQuantity": sum(float(pd["totalQuantity"]) for pd in product_data.values()),
            "totalAmount": total_sales,
            "totalCost": sum(float(pd["totalCost"]) for pd in product_data.values()),
            "totalProfit": total_profit,
            "totalDiscount": total_discount
        }

        return Response({
            "items": formatted,
            "summary": summary
        })

    @action(detail=False, methods=['post'])
    def bulk_adjust(self, request):
        branch_id = request.data.get('branchId')
        user_id = request.data.get('userId') or request.user.id
        adjustments = request.data.get('adjustments', [])
        
        if not branch_id or not adjustments:
            return Response({"error": "branchId and adjustments are required"}, status=400)
            
        with transaction.atomic():
            for adj in adjustments:
                p_id = adj.get('productId')
                # Optional: handle if productId is not provided but SKU is
                sku = adj.get('sku')
                
                delta = Decimal(str(adj.get('quantity', 0)))
                absolute_qty = adj.get('absoluteQuantity') # 🚀 SUPPORT ABSOLUTE SETTING
                new_price = adj.get('price')
                adj_type = adj.get('type', 'ADJUSTMENT')
                reason = adj.get('reason', '')
                created_at_raw = adj.get('createdAt')
                
                # 🛡️ DATA INTEGRITY: Prevent backdating before product creation
                final_created_at = None
                if created_at_raw:
                    parsed_dt = parse_datetime(created_at_raw) if isinstance(created_at_raw, str) else created_at_raw
                    if parsed_dt:
                        # Ensure it's not before product creation
                        if parsed_dt < product.created_at:
                            # Clamp to product creation + 1 second to maintain order
                            from datetime import timedelta
                            final_created_at = product.created_at + timedelta(seconds=1)
                        else:
                            final_created_at = parsed_dt
                
                if not product:
                    # Log error or skip
                    continue

                # 🛡️ DATA INTEGRITY: Prevent backdating before product creation
                from django.utils import timezone
                final_created_at = None
                if created_at_raw:
                    parsed_dt = parse_datetime(created_at_raw) if isinstance(created_at_raw, str) else created_at_raw
                    if parsed_dt:
                        # Ensure it's not before product creation
                        if parsed_dt < product.created_at:
                            # Clamp to product creation + 1 second to maintain order
                            from datetime import timedelta
                            final_created_at = product.created_at + timedelta(seconds=1)
                        else:
                            final_created_at = parsed_dt
                
                if final_created_at is None:
                    final_created_at = timezone.now()

                if new_price is not None:
                    product.cost_price = Decimal(str(new_price))

                old_stock = product.stock

                # 🛡️ DATA INTEGRITY: Calculate delta on server if absolute quantity is requested
                if absolute_qty is not None:
                    absolute_qty_dec = Decimal(str(absolute_qty))
                    delta = absolute_qty_dec - old_stock
                    new_stock = absolute_qty_dec
                else:
                    new_stock = old_stock + delta

                product.stock = new_stock
                product.save()                
                ProductHistory.objects.create(
                    id=f"hist_{uuid.uuid4().hex[:10]}",
                    user_id=user_id,
                    branch_id=branch_id,
                    product=product,
                    type=adj_type,
                    old_stock=old_stock,
                    new_stock=new_stock,
                    quantity_change=delta,
                    reason=reason,
                    created_at=final_created_at,
                    old_cost=product.cost_price,
                    new_cost=Decimal(str(new_price)) if new_price is not None else product.cost_price,
                    old_price=product.selling_price,
                    new_price=product.selling_price
                )
        return Response({"status": "success"})

    @action(detail=False, methods=['get'])
    def stock_summary_pdf(self, request):
        branch_id = request.query_params.get('branchId')
        if not branch_id:
            return Response({"error": "branchId required"}, status=400)
            
        products = self.get_queryset().filter(branch_id=branch_id).order_by('name')
        if not products.exists():
            return Response({"error": "No products found for this branch"}, status=404)
            
        branch_name = products.first().branch.name
        buffer = io.BytesIO()
        report = StockSummaryGenerator(buffer, title="Stock Summary Report")
        elements = report.generate(products, branch_name)
        
        return generate_pdf_response(elements, "Stock_Summary", buffer)



class StockAuditViewSet(viewsets.ModelViewSet):
    queryset = StockAudit.objects.all()
    serializer_class = StockAuditSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        data = request.data
        items_data = data.pop('items', [])
        branch_id = data.get('branch')

        from core_app.models import Branch

        with transaction.atomic():
            if not data.get('audit_number'):
                counter, _ = BranchCounter.objects.get_or_create(branch_id=branch_id, type='audit', defaults={'count': 0})
                counter.count += 1
                counter.save()
                data['audit_number'] = f"AUD-{str(counter.count).zfill(4)}"

            if not data.get('id'):
                data['id'] = f"aud_{uuid.uuid4().hex[:8]}"

            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            audit = serializer.save()

            for item in items_data:
                item_id = f"aitm_{uuid.uuid4().hex[:8]}"
                StockAuditItem.objects.create(
                    id=item_id,
                    audit=audit,
                    product_id=item.get('productId'),
                    product_name=item.get('productName'),
                    sku=item.get('sku'),
                    expected_qty=item.get('expected_qty', 0),
                    counted_qty=item.get('counted_qty', 0),
                    variance=item.get('variance', 0),
                    status=item.get('status', 'Pending')
                )

        return Response(self.get_serializer(audit).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def save_draft(self, request):
        data = request.data
        items_data = data.pop('items', [])
        branch_id = data.get('branch')
        user_id = data.get('user')

        if not branch_id:
            return Response({"error": "branch required"}, status=400)

        with transaction.atomic():
            # Find existing draft for this branch
            audit = StockAudit.objects.filter(branch_id=branch_id, status='Draft').first()

            if not audit:
                audit_id = f"aud_drft_{uuid.uuid4().hex[:6]}"
                audit = StockAudit.objects.create(
                    id=audit_id,
                    branch_id=branch_id,
                    user_id=user_id,
                    status='Draft',
                    audit_number='DRAFT'
                )

            # Clear existing items and replace with new ones
            audit.items.all().delete()

            for item in items_data:
                StockAuditItem.objects.create(
                    id=f"aitm_{uuid.uuid4().hex[:8]}",
                    audit=audit,
                    product_id=item.get('productId'),
                    product_name=item.get('productName'),
                    sku=item.get('sku'),
                    expected_qty=item.get('expected_qty', 0),
                    counted_qty=item.get('counted_qty', 0),
                    variance=item.get('variance', 0),
                    status=item.get('status', 'Pending')
                )

            # Update audit timestamp
            audit.save()

        return Response({"status": "draft saved", "id": audit.id})

    @action(detail=False, methods=['get'])
    def get_draft(self, request):
        branch_id = request.query_params.get('branchId')
        if not branch_id:
            return Response({"error": "branchId required"}, status=400)

        audit = StockAudit.objects.filter(branch_id=branch_id, status='Draft').first()
        if not audit:
            return Response({"status": "no draft found"}, status=404)

        serializer = self.get_serializer(audit)
        return Response(serializer.data)
class ProductHistoryViewSet(viewsets.ModelViewSet):
    queryset = ProductHistory.objects.all()
    serializer_class = ProductHistorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        branch_id = self.request.query_params.get('locationId')
        product_id = self.request.query_params.get('productId')
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        if product_id:
            qs = qs.filter(product_id=product_id)
        return qs.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        data = request.data
        product_id = data.get('productId')
        branch_id = data.get('locationId')
        
        with transaction.atomic():
            try:
                product = Product.objects.select_for_update().get(id=product_id)
            except Product.DoesNotExist:
                return Response({"error": "Product not found"}, status=404)
                
            current_stock = product.stock
            change = float(data.get('newQuantity', 0)) - float(data.get('previousQuantity', 0))
            actual_new_stock = current_stock + change
            
            from django.utils import timezone
            history = ProductHistory.objects.create(
                user=request.user,
                branch_id=branch_id,
                product=product,
                old_stock=current_stock,
                new_stock=actual_new_stock,
                type=data.get('type') or ('RESTOCK' if change >= 0 else 'ADJUSTMENT'),
                change_reason=data.get('changeReason'),
                reference_id=data.get('referenceId'),
                created_at=data.get('createdAt') or timezone.now(),
                old_cost=product.cost_price,
                new_cost=product.cost_price,
                old_price=product.selling_price,
                new_price=product.selling_price
            )
            
            product.stock = actual_new_stock
            product.save()
            
            serializer = self.get_serializer(history)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['delete'])
    def delete_by_reference(self, request):
        ref_id = request.query_params.get('referenceId')
        loc_id = request.query_params.get('locationId')
        if not ref_id or not loc_id:
            return Response(status=400)
        self.get_queryset().filter(reference_id=ref_id, branch_id=loc_id).delete()
        return Response(status=204)

    @action(detail=False, methods=['patch'])
    def update_dates_by_reference(self, request):
        ref_id = request.data.get('referenceId')
        loc_id = request.data.get('locationId')
        new_date = request.data.get('newDate')
        if not all([ref_id, loc_id, new_date]):
            return Response(status=400)
        
        self.get_queryset().filter(reference_id=ref_id, branch_id=loc_id).update(created_at=new_date)
        return Response(status=200)

    @action(detail=False, methods=['patch'])
    def update_dates(self, request):
        entry_ids = request.data.get('entryIds', [])
        new_date = request.data.get('newDate')
        if not entry_ids or not new_date:
            return Response(status=400)
        
        self.get_queryset().filter(id__in=entry_ids).update(created_at=new_date)
        return Response(status=200)

class StockTransferViewSet(viewsets.ModelViewSet):
    queryset = StockTransfer.objects.all()
    serializer_class = StockTransferSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        data = request.data
        items_data = data.pop('items', [])
        from_branch_id = data.get('from_branch')
        to_branch_id = data.get('to_branch')
        user_id = data.get('user') or request.user.id
        
        from core_app.models import BranchCounter, Branch
        
        with transaction.atomic():
            if not data.get('transfer_number'):
                # Use source branch for counter
                counter, _ = BranchCounter.objects.get_or_create(branch_id=from_branch_id, type='transfer', defaults={'count': 0})
                counter.count += 1
                counter.save()
                data['transfer_number'] = f"TRSF-{str(counter.count).zfill(4)}"
            
            if not data.get('id'):
                data['id'] = f"trsf_{uuid.uuid4().hex[:8]}"

            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            transfer = serializer.save()
            
            from_branch = transfer.from_branch
            to_branch = transfer.to_branch

            for item in items_data:
                sku = item.get('sku')
                qty = int(item.get('quantity', 0))

                # Deduct from source
                src_product = Product.objects.select_for_update().filter(sku=sku, branch_id=from_branch_id).first()

                # 🛡️ DATA INTEGRITY: Strict stock check on server (with override)
                allow_negative = data.get('allow_negative', False)

                if not src_product:
                    raise serializers.ValidationError({"error": f"Product with SKU {sku} not found in source branch."})

                if src_product.stock < qty and not allow_negative:
                    raise serializers.ValidationError({
                        "error": f"Insufficient stock for {src_product.name}. Requested: {qty}, Available: {src_product.stock}. Provide 'allow_negative' to override."
                    })
                # Add to destination
                dest_product = Product.objects.select_for_update().filter(sku=sku, branch_id=to_branch_id).first()
                # 🛡️ DATA LOSS PROTECTION: Create the product in destination branch if it doesn't exist
                if src_product and not dest_product:
                    # Handle category (it's branch-specific)
                    new_category = None
                    if src_product.category:
                        new_category, _ = Category.objects.get_or_create(
                            name=src_product.category.name,
                            branch_id=to_branch_id,
                            defaults={
                                'agency_id': src_product.agency_id,
                                'user_id': user_id
                            }
                        )
                    
                    dest_product = Product.objects.create(
                        branch_id=to_branch_id,
                        user_id=user_id,
                        agency_id=src_product.agency_id,
                        name=src_product.name,
                        description=src_product.description,
                        sku=src_product.sku,
                        barcode=src_product.barcode,
                        manufacturer_barcode=src_product.manufacturer_barcode,
                        image_url=src_product.image_url,
                        cost_price=src_product.cost_price,
                        selling_price=src_product.selling_price,
                        min_stock=src_product.min_stock,
                        category=new_category,
                        supplier=src_product.supplier,
                        stock=0
                    )

                if src_product:
                    old_stock = src_product.stock
                    src_product.stock -= qty
                    src_product.save()
                    
                    ProductHistory.objects.create(
                        id=f"hist_{uuid.uuid4().hex[:10]}",
                        user_id=user_id,
                        branch_id=from_branch_id,
                        product=src_product,
                        type='TRANSFER_OUT',
                        old_stock=old_stock,
                        new_stock=src_product.stock,
                        quantity_change=-qty,
                        reason=f"Transfer to {to_branch.name} | {transfer.transfer_number}",
                        reference_id=transfer.id
                    )
                
                if dest_product:
                    old_stock = dest_product.stock
                    dest_product.stock += qty
                    dest_product.save()
                    
                    ProductHistory.objects.create(
                        id=f"hist_{uuid.uuid4().hex[:10]}",
                        user_id=user_id,
                        branch_id=to_branch_id,
                        product=dest_product,
                        type='TRANSFER_IN',
                        old_stock=old_stock,
                        new_stock=dest_product.stock,
                        quantity_change=qty,
                        reason=f"Transfer from {from_branch.name} | {transfer.transfer_number}",
                        reference_id=transfer.id
                    )
                
                StockTransferItem.objects.create(
                    id=f"titem_{uuid.uuid4().hex[:10]}",
                    transfer=transfer,
                    product_id=src_product.id if src_product else (dest_product.id if dest_product else 'unknown'),
                    product_name=src_product.name if src_product else (dest_product.name if dest_product else sku),
                    sku=sku,
                    quantity=qty
                )
                
        return Response(self.get_serializer(transfer).data, status=status.HTTP_201_CREATED)

class RequisitionViewSet(viewsets.ModelViewSet):
    queryset = Requisition.objects.all()
    serializer_class = RequisitionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        branch_id = self.request.query_params.get('branchId')
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        return qs.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        data = request.data
        items_data = data.pop('items', [])
        
        with transaction.atomic():
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            requisition = serializer.save(status='PENDING')
            
            for item in items_data:
                RequisitionItem.objects.create(
                    requisition=requisition,
                    product_name=item.get('productName'),
                    sku=item.get('sku'),
                    quantity=item.get('quantity')
                )
                
        return Response(self.get_serializer(requisition).data, status=status.HTTP_201_CREATED)

