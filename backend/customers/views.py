from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.db.models import Sum, Count, Q
from django.db.models.functions import Coalesce
from django.utils.timezone import now

from .models import CustomerCategory, Customer, FavoriteCustomer, Ticket
from .filters import CustomerFilter
from .serializers import (
    CustomerCategorySerializer, CustomerSerializer,
    FavoriteCustomerSerializer, TicketSerializer
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
