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

    def perform_create(self, serializer):
        # 🛡️ SECURITY: Auto-assign agency from the creating user
        agency_id = getattr(self.request.user, 'agency_id', None)
        serializer.save(agency_id=agency_id)

    def get_queryset(self):
        # 🛡️ SECURITY: Strict Multi-tenant isolation
        qs = super().get_queryset().select_related('branch', 'admin', 'category')
        
        user = self.request.user
        if user.is_authenticated:
            agency_id = getattr(user, 'agency_id', None)
            if agency_id:
                qs = qs.filter(agency_id=agency_id)
        
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

    def perform_create(self, serializer):
        # 🛡️ SECURITY: Auto-assign agency from the creating user
        agency_id = getattr(self.request.user, 'agency_id', None)
        serializer.save(agency_id=agency_id)

    def get_queryset(self):
        # 🛡️ SECURITY: Strict Multi-tenant isolation
        qs = super().get_queryset().select_related('branch', 'admin', 'category')
        
        user = self.request.user
        if user.is_authenticated:
            agency_id = getattr(user, 'agency_id', None)
            if agency_id:
                qs = qs.filter(agency_id=agency_id)
        
        branch_id = self.request.query_params.get('branchId')
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
            
        return qs.order_by('name')

    def list(self, request, *args, **kwargs):
        # 🚀 PERFORMANCE: Removed heavy subqueries for total spent/orders count.
        # These are now provided on-demand in the retrieve (detail) action.
        queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)
        customers = page if page is not None else queryset
        
        serializer = self.get_serializer(customers, many=True)
        response_data = serializer.data
             
        if page is not None:
            return self.get_paginated_response(response_data)

        return Response(response_data)

    @action(detail=False, methods=['get'])
    def segment(self, request):
        """
        🎯 CUSTOMER SEGMENTATION ENGINE
        Returns specific lists of customers for targeted messaging/actions.
        """
        from messaging.logic.core.segmentation import CustomerSegmenter
        
        branch_id = request.query_params.get('branchId')
        segment_type = request.query_params.get('type', 'all')
        days = int(request.query_params.get('days', 90))

        if not branch_id:
            return Response({"error": "branchId required"}, status=400)

        if segment_type == 'unpaid':
            queryset = CustomerSegmenter.get_unpaid_customers(branch_id)
        elif segment_type == 'inactive':
            queryset = CustomerSegmenter.get_inactive_customers(branch_id, days)
        else:
            queryset = CustomerSegmenter.get_all_customers(branch_id)

        # Apply standard filters if needed (e.g., categories)
        category_id = request.query_params.get('categoryId')
        if category_id and category_id != 'all':
            queryset = queryset.filter(category_id=category_id)

        # Serialize
        page = self.paginate_queryset(queryset)
        customers = page if page is not None else queryset
        serializer = self.get_serializer(customers, many=True)
        
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        # 🚀 PERFORMANCE: Use stored totals instead of calculating on the fly
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data
        
        # We use the denormalized fields we just created
        data['lifetimeValue'] = float(instance.total_spent)
        data['orderCount'] = int(instance.order_count)
        
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
        from datetime import timedelta
        from django.db.models import Max, Q
        
        branch_id = request.query_params.get('branchId')
        days = int(request.query_params.get('days', 30))
        category_id = request.query_params.get('categoryId')
        
        if not branch_id:
            return Response({"error": "branchId required"}, status=400)
            
        cutoff_date = now() - timedelta(days=days)
        cutoff_date_only = cutoff_date.date()
        
        # 🚀 FIX: Identify active customers first (Date >= cutoff AND Status != QUOTE)
        active_customer_ids = Sale.objects.filter(
            branch_id=branch_id,
            date__gte=cutoff_date_only
        ).exclude(status='QUOTE').values_list('customer_id', flat=True).distinct()

        # Filter the main queryset to exclude these active IDs
        queryset = Customer.objects.filter(branch_id=branch_id).exclude(
            id__in=active_customer_ids
        ).annotate(
            last_purchase_date=Max('sales__date', filter=~Q(sales__status='QUOTE'))
        )
        
        if category_id and category_id != 'all':
            queryset = queryset.filter(category_id=category_id)
            
        # Serialize the results
        page = self.paginate_queryset(queryset)
        customers = page if page is not None else queryset
        
        response_data = []
        for customer in customers:
            data = self.get_serializer(customer).data
            # Use the annotated value directly
            data['lastPurchaseDate'] = customer.last_purchase_date.isoformat() if customer.last_purchase_date else None
            response_data.append(data)
                
        if page is not None:
            return self.get_paginated_response(response_data)
            
        return Response(response_data)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        branch_id = request.query_params.get('branchId')
        if not branch_id:
            return Response({"error": "branchId required"}, status=400)
            
        from .logic.summary_generator import CustomerSummaryGenerator
        generator = CustomerSummaryGenerator(branch_id)
        data = generator.get_full_summary()
        
        # Add categories for the full module summary
        from .models import CustomerCategory
        from .serializers import CustomerCategorySerializer
        cats = CustomerCategory.objects.filter(branch_id=branch_id).order_by('name')
        data['categories'] = CustomerCategorySerializer(cats, many=True).data
        
        return Response(data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        branch_id = request.query_params.get('branchId')
        if not branch_id:
            return Response({"error": "branchId required"}, status=400)
            
        from .logic.summary_generator import CustomerSummaryGenerator
        generator = CustomerSummaryGenerator(branch_id)
        data = generator.get_full_summary()
        
        # Return only the stats portion for the stats endpoint
        return Response(data['stats'])

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

    def get_queryset(self):
        # 🛡️ SECURITY: Strict Multi-tenant isolation
        agency_id = getattr(self.request.user, 'agency_id', None)
        return super().get_queryset().filter(agency_id=agency_id)

class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # 🛡️ SECURITY: Strict Multi-tenant isolation
        agency_id = getattr(self.request.user, 'agency_id', None)
        return super().get_queryset().filter(agency_id=agency_id)

class CustomerLedgerViewSet(viewsets.ModelViewSet):
    queryset = CustomerLedger.objects.all()
    serializer_class = CustomerLedgerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # 🛡️ SECURITY: Strict Multi-tenant isolation
        agency_id = getattr(self.request.user, 'agency_id', None)
        qs = super().get_queryset().select_related('customer', 'branch').filter(agency_id=agency_id)
        
        branch_id = self.request.query_params.get('branchId')
        customer_id = self.request.query_params.get('customerId')
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        if customer_id:
            qs = qs.filter(customer_id=customer_id)
        return qs.order_by('-date', '-created_at')
