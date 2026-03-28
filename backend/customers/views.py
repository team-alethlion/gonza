from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.db.models import Sum, Count, Q
from django.db.models.functions import Coalesce
from django.utils.timezone import now

from .models import CustomerCategory, Customer, FavoriteCustomer, Ticket, CustomerLedger
from .filters import CustomerFilter
from .serializers import (
    CustomerCategorySerializer, CustomerSerializer,
    FavoriteCustomerSerializer, TicketSerializer,
    CustomerLedgerSerializer
)

class CustomerCategoryViewSet(viewsets.ModelViewSet):
    queryset = CustomerCategory.objects.all()
    serializer_class = CustomerCategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        branch_id = self.request.query_params.get('branchId')
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        return qs.order_by('name')


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = CustomerFilter
    search_fields = ['name', 'phone', 'email', 'address']

    def get_queryset(self):
        qs = super().get_queryset()
        branch_id = self.request.query_params.get('branchId')
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        return qs.order_by('name')

    def list(self, request, *args, **kwargs):
        from django.db.models import Sum, Count, Q, OuterRef, Subquery, FloatField
        from django.db.models.functions import Coalesce
        from sales.models import Sale

        # Create a subquery for total sales amount
        sales_subquery = Sale.objects.filter(
            Q(customer_id=OuterRef('pk')) | Q(customer_name__iexact=OuterRef('name')),
            branch_id=OuterRef('branch_id')
        ).exclude(status='QUOTE')

        total_spent_subquery = sales_subquery.values('branch_id').annotate(
            total=Sum('total_amount')
        ).values('total')

        order_count_subquery = sales_subquery.values('branch_id').annotate(
            count=Count('id')
        ).values('count')

        queryset = self.filter_queryset(self.get_queryset()).annotate(
            total_spent=Coalesce(Subquery(total_spent_subquery), 0.0, output_field=FloatField()),
            orders_count=Coalesce(Subquery(order_count_subquery), 0, output_field=FloatField())
        )

        page = self.paginate_queryset(queryset)
        customers = page if page is not None else queryset
        
        response_data = []
        for customer in customers:
             serializer = self.get_serializer(customer)
             data = serializer.data
             data['lifetimeValue'] = float(customer.total_spent)
             data['orderCount'] = int(customer.orders_count)
             response_data.append(data)
             
        if page is not None:
            return self.get_paginated_response(response_data)

        return Response(response_data)

    def retrieve(self, request, *args, **kwargs):
        from django.db.models import Sum, Count, Q, FloatField
        from django.db.models.functions import Coalesce
        from sales.models import Sale

        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data
        
        sales = Sale.objects.filter(
            Q(customer_id=instance.id) | Q(customer_name__iexact=instance.name),
            branch_id=instance.branch_id
        ).exclude(status='QUOTE')
        
        agg = sales.aggregate(
            total_spent=Coalesce(Sum('total_amount'), 0.0, output_field=FloatField()),
            order_count=Count('id')
        )
        
        data['lifetimeValue'] = float(agg['total_spent'])
        data['orderCount'] = int(agg['order_count'])
        return Response(data)

    @action(detail=False, methods=['get'])
    def top(self, request):
        from sales.models import Sale
        from django.db.models import Sum, Count, Q
        
        branch_id = request.query_params.get('branchId')
        start_date = request.query_params.get('startDate')
        end_date = request.query_params.get('endDate')
        category_id = request.query_params.get('categoryId')
        
        # Base query: non-quote sales for this branch
        sales_qs = Sale.objects.filter(branch_id=branch_id).exclude(status='QUOTE')
        
        if start_date:
            sales_qs = sales_qs.filter(date__gte=start_date)
        if end_date:
            sales_qs = sales_qs.filter(date__lte=end_date)
            
        # If category is filtered, we need to join with Customer table
        if category_id and category_id != 'all':
            sales_qs = sales_qs.filter(
                Q(customer__category_id=category_id) | 
                Q(customer_id__isnull=True) # Guest sales usually don't have category anyway
            )

        # Aggregate by customer_id (first) and customer_name
        # This groups guest sales by name and registered sales by ID
        stats = sales_qs.values('customer_id', 'customer_name').annotate(
            total_purchases=Sum('total_amount'),
            order_count=Count('id')
        ).order_by('-total_purchases')
        
        # We only want the top ones (e.g., 100)
        top_stats = stats[:100]
        
        response_data = []
        for item in top_stats:
            response_data.append({
                "id": item['customer_id'],
                "name": item['customer_name'],
                "totalPurchases": float(item['total_purchases'] or 0),
                "orderCount": item['order_count']
            })
            
        return Response(response_data)

    @action(detail=False, methods=['get'])
    def inactive(self, request):
        from sales.models import Sale
        from django.db.models import Max, Q
        from datetime import timedelta
        
        branch_id = request.query_params.get('branchId')
        days = int(request.query_params.get('days', 30))
        category_id = request.query_params.get('categoryId')
        
        if not branch_id:
            return Response({"error": "branchId required"}, status=400)
            
        cutoff_date = now() - timedelta(days=days)
        
        # We only track inactivity for REGISTERED customers
        customers_qs = Customer.objects.filter(branch_id=branch_id)
        
        if category_id and category_id != 'all':
            customers_qs = customers_qs.filter(category_id=category_id)
            
        # Get the last sale date for each customer
        last_sales = Sale.objects.filter(
            branch_id=branch_id
        ).exclude(status='QUOTE').values('customer_id').annotate(
            last_purchase=Max('date')
        )
        
        # Map customer_id -> last_purchase_date
        last_sale_map = {item['customer_id']: item['last_purchase'] for item in last_sales if item['customer_id']}
        
        inactive_customers = []
        for customer in customers_qs:
            last_date = last_sale_map.get(customer.id)
            
            # Inactive if: Never purchased OR last purchase was before cutoff
            is_inactive = False
            if not last_date:
                is_inactive = True
            else:
                # Sale.date is usually a DateField, compare with cutoff_date.date()
                if last_date < cutoff_date.date():
                    is_inactive = True
            
            if is_inactive:
                serializer = self.get_serializer(customer)
                data = serializer.data
                data['lastPurchaseDate'] = last_date.isoformat() if last_date else None
                inactive_customers.append(data)
                
        return Response(inactive_customers)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        branch_id = request.query_params.get('branchId')
        qs = self.get_queryset()
        
        today = now()
        start_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        this_month_count = qs.filter(created_at__gte=start_of_month).count()
        with_birthdays = qs.exclude(birthday__isnull=True).count()
        
        return Response({
            "thisMonth": this_month_count,
            "withBirthdays": with_birthdays
        })

    @action(detail=False, methods=['post'])
    def merge(self, request):
        branch_id = request.data.get('branchId')
        primary_id = request.data.get('primaryCustomerId')
        duplicate_ids = request.data.get('duplicateIds', [])
        
        if not primary_id or not duplicate_ids:
            return Response({"error": "Invalid selection"}, status=400)
            
        try:
            primary = Customer.objects.get(id=primary_id, branch_id=branch_id)
            duplicates = list(Customer.objects.filter(id__in=duplicate_ids, branch_id=branch_id))
            if len(duplicates) != len(duplicate_ids):
                return Response({"error": "Some duplicate customers not found in this branch"}, status=400)
                
            from sales.models import Sale
            with transaction.atomic():
                Sale.objects.filter(customer_id__in=duplicate_ids, branch_id=branch_id).update(customer=primary)
                Customer.objects.filter(id__in=duplicate_ids, branch_id=branch_id).delete()
                
            return Response({"status": "merged"})
        except Customer.DoesNotExist:
            return Response({"error": "Primary customer not found"}, status=404)

    @action(detail=False, methods=['get'])
    def duplicates(self, request):
        branch_id = request.query_params.get('branchId')
        if not branch_id:
            return Response({"error": "branchId required"}, status=400)

        # 🚀 PERFORMANCE: Scan entire branch database for duplicates
        # We check Phone, Email, and Name (normalized)
        from django.db.models import Count
        from django.db.models.functions import Lower, Replace
        from django.db import models

        # 1. Find duplicate phone numbers
        phone_dupes = Customer.objects.filter(branch_id=branch_id).exclude(phone__isnull=True).exclude(phone='').values('phone').annotate(count=Count('id')).filter(count__gt=1)
        
        # 2. Find duplicate emails
        email_dupes = Customer.objects.filter(branch_id=branch_id).exclude(email__isnull=True).exclude(email='').values('email').annotate(count=Count('id')).filter(count__gt=1)
        
        # 3. Find duplicate names (normalized: lowercase and no spaces)
        name_dupes = Customer.objects.filter(branch_id=branch_id).annotate(
            norm_name=Replace(Lower('name'), models.Value(' '), models.Value(''))
        ).values('norm_name').annotate(count=Count('id')).filter(count__gt=1)

        # Collect all duplicate IDs
        duplicate_groups = []
        seen_ids = set()

        # Helper to group by a field
        def add_groups(queryset, field_name):
            for item in queryset:
                val = item[field_name]
                group_qs = Customer.objects.filter(branch_id=branch_id, **{field_name: val})
                ids = list(group_qs.values_list('id', flat=True))
                if any(id in seen_ids for id in ids): continue # Avoid overlap
                
                group_data = self.get_serializer(group_qs, many=True).data
                duplicate_groups.append(group_data)
                seen_ids.update(ids)

        add_groups(phone_dupes, 'phone')
        add_groups(email_dupes, 'email')
        
        # For names, it's slightly different due to normalization
        for item in name_dupes:
            val = item['norm_name']
            group_qs = Customer.objects.filter(branch_id=branch_id).annotate(
                norm_name=Replace(Lower('name'), models.Value(' '), models.Value(''))
            ).filter(norm_name=val)
            
            ids = list(group_qs.values_list('id', flat=True))
            if any(id in seen_ids for id in ids): continue
            
            group_data = self.get_serializer(group_qs, many=True).data
            duplicate_groups.append(group_data)
            seen_ids.update(ids)

        return Response(duplicate_groups)

    @action(detail=False, methods=['get'])
    def lifetime_stats(self, request):
        branch_id = request.query_params.get('branchId')
        customer_name = request.query_params.get('customerName')
        
        if not branch_id or not customer_name:
            return Response({"error": "Missing parameters"}, status=400)
            
        from sales.models import Sale
        sales = Sale.objects.filter(
            customer_name__iexact=customer_name,
            branch_id=branch_id
        ).exclude(status='QUOTE')
        
        agg = sales.aggregate(
            total_spent=Coalesce(Sum('total_amount'), 0.0),
            order_count=Count('id')
        )
        
        return Response({
            "total": float(agg['total_spent']),
            "count": agg['order_count']
        })

class FavoriteCustomerViewSet(viewsets.ModelViewSet):
    queryset = FavoriteCustomer.objects.all()
    serializer_class = FavoriteCustomerSerializer
    permission_classes = [IsAuthenticated]

class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]

class CustomerLedgerViewSet(viewsets.ModelViewSet):
    queryset = CustomerLedger.objects.all()
    serializer_class = CustomerLedgerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        branch_id = self.request.query_params.get('branchId')
        customer_id = self.request.query_params.get('customerId')
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        if customer_id:
            qs = qs.filter(customer_id=customer_id)
        return qs.order_by('-date', '-created_at')
