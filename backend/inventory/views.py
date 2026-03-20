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
        branch_id = data.get('branch_id')
        user_id = data.get('user_id')
        
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
                    location_id=branch_id,
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
        
        with transaction.atomic():
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            product = serializer.save()
            
            if product.stock != old_stock and custom_reason != 'skip-history':
                change_reason = custom_reason
                if not change_reason:
                    if is_from_sale: change_reason = "Sale"
                    elif product.stock > old_stock: change_reason = "Manual stock addition"
                    else: change_reason = "Manual stock reduction"
                
                type_enum = 'SALE' if is_from_sale else ('RESTOCK' if product.stock > old_stock else 'ADJUSTMENT')
                ProductHistory.objects.create(
                    user_id=user_id,
                    location_id=product.branch_id,
                    product=product,
                    type=type_enum,
                    old_stock=old_stock,
                    new_stock=product.stock,
                    quantity_change=product.stock - old_stock,
                    reason=f"[{product.name}] | {change_reason}",
                    reference_id=request.data.get('referenceId')
                )
        return Response(serializer.data)

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
                                location_id=branch_id,
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
                                location_id=branch_id,
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
        location_id = request.query_params.get('locationId')
        start_date = request.query_params.get('startDate')
        end_date = request.query_params.get('endDate')
        
        if not all([location_id, start_date, end_date]):
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
                WHERE location_id = %s AND created_at BETWEEN %s AND %s
                GROUP BY "product_id"
            ),
            ClosingStock AS (
                SELECT DISTINCT ON ("product_id")
                    "product_id",
                    "new_stock" as "closingStock"
                FROM inventory_producthistory
                WHERE location_id = %s AND created_at <= %s
                ORDER BY "product_id", created_at DESC, id DESC
            )
            SELECT 
                p.id as "productId",
                p.name as "productName",
                p.sku as "itemNumber",
                p.image as "imageUrl",
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
            cursor.execute(query, [location_id, start_date, end_date, location_id, end_date, location_id])
            columns = [col[0] for col in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]

        formatted = []
        for row in results:
            closing_stock = float(row.get('closingStock') or 0)
            items_sold = float(row.get('itemsSold') or 0)
            stock_in = float(row.get('stockIn') or 0)
            adj_in = float(row.get('adjustmentsIn') or 0)
            adj_out = float(row.get('adjustmentsOut') or 0)
            opening_stock = closing_stock - (stock_in + adj_in) + (items_sold + adj_out)
            
            formatted.append({
                "productId": row['productId'],
                "productName": row['productName'],
                "itemNumber": row['itemNumber'] or row['productId'],
                "imageUrl": row['imageUrl'],
                "costPrice": float(row['costPrice']),
                "sellingPrice": float(row['sellingPrice']),
                "category": row['category'],
                "openingStock": opening_stock,
                "itemsSold": items_sold,
                "stockIn": stock_in,
                "transferOut": 0,
                "returnIn": 0,
                "returnOut": 0,
                "adjustmentsIn": adj_in,
                "adjustmentsOut": adj_out,
                "closingStock": closing_stock,
                "revaluation": closing_stock * float(row['costPrice'])
            })
        return Response(formatted)

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

        from sales.models import SaleItem

        # Aggregate SaleItems
        # We group by product_id and product_name (in case product was deleted)
        items = SaleItem.objects.filter(
            sale__branch_id=branch_id,
            sale__date__range=[start_date, end_date]
        ).exclude(sale__status='QUOTE')

        aggregates = items.values('product_id', 'product_name').annotate(
            totalQuantity=Sum('quantity'),
            totalAmount=Sum('total'),
            totalCost=Sum(F('cost_price') * F('quantity')),
            totalProfit=Sum(F('total') - (F('cost_price') * F('quantity'))),
            totalDiscount=Sum('discount'),
            avgPrice=Cast(Sum('total') / Sum('quantity'), DecimalField(max_digits=15, decimal_places=2)),
            avgCost=Cast(Sum(F('cost_price') * F('quantity')) / Sum('quantity'), DecimalField(max_digits=15, decimal_places=2))
        ).order_by('-totalAmount')

        formatted = []
        for row in aggregates:
            formatted.append({
                "description": row['product_name'],
                "totalQuantity": float(row['totalQuantity'] or 0),
                "averagePrice": float(row['avgPrice'] or 0),
                "totalAmount": float(row['totalAmount'] or 0),
                "totalCost": float(row['totalCost'] or 0),
                "totalProfit": float(row['totalProfit'] or 0),
                "totalDiscount": float(row['totalDiscount'] or 0),
                "averageCost": float(row['avgCost'] or 0),
                "productIds": [row['product_id']] if row['product_id'] else []
            })

        return Response(formatted)

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
                new_price = adj.get('price')
                adj_type = adj.get('type', 'ADJUSTMENT')
                reason = adj.get('reason', '')
                created_at = adj.get('createdAt')
                
                product = None
                if p_id:
                    product = Product.objects.select_for_update().filter(id=p_id, branch_id=branch_id).first()
                elif sku:
                    product = Product.objects.select_for_update().filter(sku=sku, branch_id=branch_id).first()
                
                if not product:
                    # Log error or skip
                    continue
                
                if new_price is not None:
                    product.cost_price = Decimal(str(new_price))

                old_stock = product.stock
                new_stock = old_stock + delta
                product.stock = new_stock
                product.save(update_fields=['stock', 'cost_price'])
                
                ProductHistory.objects.create(
                    id=f"hist_{uuid.uuid4().hex[:10]}",
                    user_id=user_id,
                    location_id=branch_id,
                    product=product,
                    type=adj_type,
                    old_stock=old_stock,
                    new_stock=new_stock,
                    quantity_change=delta,
                    reason=reason,
                    created_at=created_at or datetime.now(),
                    new_cost=Decimal(str(new_price)) if new_price is not None else None
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
        
        from core_app.models import BranchCounter
        
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

class ProductHistoryViewSet(viewsets.ModelViewSet):
    queryset = ProductHistory.objects.all()
    serializer_class = ProductHistorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        location_id = self.request.query_params.get('locationId')
        product_id = self.request.query_params.get('productId')
        if location_id:
            qs = qs.filter(location_id=location_id)
        if product_id:
            qs = qs.filter(product_id=product_id)
        return qs.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        data = request.data
        product_id = data.get('productId')
        location_id = data.get('locationId')
        
        with transaction.atomic():
            try:
                product = Product.objects.select_for_update().get(id=product_id)
            except Product.DoesNotExist:
                return Response({"error": "Product not found"}, status=404)
                
            current_stock = product.stock
            change = float(data.get('newQuantity', 0)) - float(data.get('previousQuantity', 0))
            actual_new_stock = current_stock + change
            
            history = ProductHistory.objects.create(
                user=request.user,
                location_id=location_id,
                product=product,
                old_stock=current_stock,
                new_stock=actual_new_stock,
                type=data.get('type') or ('RESTOCK' if change >= 0 else 'ADJUSTMENT'),
                change_reason=data.get('changeReason'),
                reference_id=data.get('referenceId'),
                created_at=data.get('createdAt') or datetime.now()
            )
            
            product.stock = actual_new_stock
            product.save(update_fields=['stock'])
            
            serializer = self.get_serializer(history)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['delete'])
    def delete_by_reference(self, request):
        ref_id = request.query_params.get('referenceId')
        loc_id = request.query_params.get('locationId')
        if not ref_id or not loc_id:
            return Response(status=400)
        self.get_queryset().filter(reference_id=ref_id, location_id=loc_id).delete()
        return Response(status=204)

    @action(detail=False, methods=['patch'])
    def update_dates_by_reference(self, request):
        ref_id = request.data.get('referenceId')
        loc_id = request.data.get('locationId')
        new_date = request.data.get('newDate')
        if not all([ref_id, loc_id, new_date]):
            return Response(status=400)
        
        self.get_queryset().filter(reference_id=ref_id, location_id=loc_id).update(created_at=new_date)
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
                if src_product:
                    old_stock = src_product.stock
                    src_product.stock -= qty
                    src_product.save(update_fields=['stock'])
                    
                    ProductHistory.objects.create(
                        id=f"hist_{uuid.uuid4().hex[:10]}",
                        user_id=user_id,
                        location_id=from_branch_id,
                        product=src_product,
                        type='TRANSFER_OUT',
                        old_stock=old_stock,
                        new_stock=src_product.stock,
                        quantity_change=-qty,
                        reason=f"Transfer to {to_branch.name} | {transfer.transfer_number}",
                        reference_id=transfer.id
                    )
                
                # Add to destination
                dest_product = Product.objects.select_for_update().filter(sku=sku, branch_id=to_branch_id).first()
                if dest_product:
                    old_stock = dest_product.stock
                    dest_product.stock += qty
                    dest_product.save(update_fields=['stock'])
                    
                    ProductHistory.objects.create(
                        id=f"hist_{uuid.uuid4().hex[:10]}",
                        user_id=user_id,
                        location_id=to_branch_id,
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

