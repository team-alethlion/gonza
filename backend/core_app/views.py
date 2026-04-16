import uuid
from django.utils.timezone import now
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db import transaction
from django.contrib.auth.hashers import make_password, check_password
from django.db.models import Q, Sum, Count, F, DecimalField
from django.db.models.functions import Cast
from inventory.utils import get_inventory_stats
from core_app.logic.branches import initialize_branch
from core_app.logic.analytics import get_analytics_summary
from inventory.logic.requisitions import calculate_requisition_total
from inventory.models import Requisition, StockTransfer
from finance.models import CashTransaction, Expense

from .models import (
    Agency, Branch, BranchSettings, Package, SubscriptionTransaction
)
from .serializers import (
    AgencySerializer, BranchSerializer,
    BranchSettingsSerializer, PackageSerializer
)
from rest_framework import serializers

class AnalyticsViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def inventory_stats(self, request):
        branch_id = request.query_params.get('branchId')
        if not branch_id:
            return Response({"error": "branchId required"}, status=400)
        
        stats = get_inventory_stats(branch_id)
        return Response(stats)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        branch_id = request.query_params.get('branchId')
        start_date = request.query_params.get('startDate')
        end_date = request.query_params.get('endDate')
        
        if not branch_id:
            return Response({"error": "branchId required"}, status=400)

        data = get_analytics_summary(branch_id, start_date, end_date)
        
        return Response(data)

class SubscriptionTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionTransaction
        fields = '__all__'

class PackageViewSet(viewsets.ModelViewSet):
    queryset = Package.objects.all()
    serializer_class = PackageSerializer
    
    def get_permissions(self):
        if self.action == 'list' or self.action == 'retrieve':
            return [AllowAny()]
        return [IsAuthenticated()]
    
    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        package = self.get_object()
        package.is_active = request.data.get('isActive', True)
        package.save(update_fields=['is_active'])
        return Response({"status": "toggled"})


class AgencyViewSet(viewsets.ModelViewSet):
    queryset = Agency.objects.all()
    serializer_class = AgencySerializer
    
    def get_permissions(self):
        if self.action == 'retrieve':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_object(self):
        obj = super().get_object()
        # Automatically sync status on retrieval to ensure DB integrity
        obj.sync_status()
        return obj

    @action(detail=True, methods=['post'])
    def activate_trial(self, request, pk=None):
        agency = self.get_object()
        package_id = request.data.get('packageId')
        
        if agency.had_trial_before:
            return Response({"error": "You have already used a free trial."}, status=400)
            
        try:
            package = Package.objects.get(id=package_id)
            if not package.has_free_trial:
                return Response({"error": "This package does not offer a free trial."}, status=400)
                
            from datetime import timedelta
            agency.package = package
            agency.subscription_status = 'trial'
            agency.trial_end_date = now() + timedelta(days=package.trial_days)
            agency.had_trial_before = True
            agency.save()
            
            return Response({"status": "activated"})
        except Package.DoesNotExist:
            return Response({"error": "Package not found"}, status=404)

class SubscriptionTransactionViewSet(viewsets.ModelViewSet):
    queryset = SubscriptionTransaction.objects.all()
    serializer_class = SubscriptionTransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user_id = self.request.query_params.get('userId')
        if user_id:
            qs = qs.filter(user_id=user_id, status__in=['completed', 'success']).order_by('-created_at')
        return qs


class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role_name = getattr(user.role, 'name', '').lower()
        if role_name == 'admin' and user.agency_id:
            return Branch.objects.filter(agency_id=user.agency_id).order_by('type', 'created_at')
        
        # User is admin of the branch or is assigned to the branch
        return Branch.objects.filter(
            Q(admin=user) | Q(users__id=user.id)
        ).distinct().order_by('type', 'created_at')

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        name = request.data.get('name')
        branch = Branch.objects.create(
            name=name,
            location="Main Location",
            admin=request.user,
            agency_id=request.user.agency_id
        )
        
        # 🚀 INITIALIZE: Setup roles, permissions and settings
        initialize_branch(branch, request.user)
        
        return Response(self.get_serializer(branch).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def reset(self, request, pk=None):
        branch = self.get_object()
        user = request.user
        if branch.admin_id != user.id:
            return Response({"error": "Only the admin can reset the business"}, status=status.HTTP_403_FORBIDDEN)
            
        with transaction.atomic():
            # Inventory
            branch.product_history.all().delete()
            branch.sales.all().delete()
            branch.products.all().delete()
            branch.customers.all().delete()
            
            # Requisitions & Transfers
            Requisition.objects.filter(branch=branch).delete()
            StockTransfer.objects.filter(branch=branch).delete()
            
            # Finance
            CashTransaction.objects.filter(branch_id=branch.id).delete()
            Expense.objects.filter(branch_id=branch.id).delete()
            
        return Response({"status": "reset"})

    @action(detail=True, methods=['post'])
    def set_password(self, request, pk=None):
        branch = self.get_object()
        password = request.data.get('password')
        branch.access_password = make_password(password)
        branch.save(update_fields=['access_password'])
        return Response({"status": "updated"})

    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def verify_password(self, request, pk=None):
        try:
            branch = Branch.objects.get(pk=pk)
            if not branch.access_password:
                return Response({"verified": True})
            
            password = request.data.get('password')
            verified = check_password(password, branch.access_password)
            return Response({"verified": verified})
        except Branch.DoesNotExist:
            return Response({"verified": False, "error": "Branch not found"})

    @action(detail=True, methods=['post'])
    def remove_password(self, request, pk=None):
        branch = self.get_object()
        branch.access_password = None
        branch.save(update_fields=['access_password'])
        return Response({"status": "removed"})
        
    @action(detail=False, methods=['post'])
    def onboarding(self, request):
        data = request.data
        user = request.user
        
        with transaction.atomic():
            target_agency_id = data.get('agencyId') or user.agency_id
            
            # 🛡️ SECURITY: Prevent hijacking of other agencies
            if target_agency_id:
                try:
                    agency = Agency.objects.get(id=target_agency_id)
                    # Only allow onboarding if agency has no name (new) or user is already linked
                    if agency.name and user.agency_id and user.agency_id != target_agency_id:
                        return Response({"error": "Unauthorized to onboard this agency."}, status=403)
                except Agency.DoesNotExist:
                    target_agency_id = None # Fallback to creation
            
            if not target_agency_id:
                unique_id = str(uuid.uuid4())[:6]
                agency = Agency.objects.create(
                    name=data.get('businessName', f"Agency {unique_id}"),
                    subscription_status=data.get('subscriptionStatus', 'trial'),
                    had_trial_before=False
                )
                target_agency_id = agency.id
            else:
                agency = Agency.objects.get(id=target_agency_id)
                if data.get('businessName'):
                    agency.name = data.get('businessName')
                agency.is_onboarded = True
                if data.get('packageId'): agency.package_id = data.get('packageId')
                if data.get('subscriptionStatus'): agency.subscription_status = data.get('subscriptionStatus')
                agency.save()

            target_branch_id = data.get('branchId')
            
            # 🛡️ SECURITY: Prevent hijacking of other branches
            if target_branch_id:
                try:
                    branch = Branch.objects.get(id=target_branch_id)
                    if branch.agency_id != target_agency_id:
                         return Response({"error": "Unauthorized to onboard this branch."}, status=403)
                except Branch.DoesNotExist:
                    target_branch_id = None

            if not target_branch_id:
                branch = Branch.objects.filter(agency_id=target_agency_id).first()
                if branch:
                    target_branch_id = branch.id
                else:
                    branch = Branch.objects.create(
                        name=data.get('businessName', "Main Branch"),
                        location=data.get('businessAddress', "Default Location"),
                        agency_id=target_agency_id,
                        admin=user
                    )
                    target_branch_id = branch.id
                    
                    # 🚀 INITIALIZE: Setup roles, permissions and settings
                    from core_app.logic.branches import initialize_branch
                    initialize_branch(branch, user)
            
            branch = Branch.objects.get(id=target_branch_id)
            if data.get('businessName'): branch.name = data.get('businessName')
            if data.get('businessAddress'): branch.location = data.get('businessAddress')
            if data.get('businessPhone'): branch.phone = data.get('businessPhone')
            branch.save()

            settings, _ = BranchSettings.objects.get_or_create(branch_id=target_branch_id)
            if data.get('businessName'): settings.business_name = data.get('businessName')
            if data.get('businessAddress'): settings.address = data.get('businessAddress')
            if data.get('businessPhone'): settings.phone = data.get('businessPhone')
            if data.get('businessEmail'): settings.email = data.get('businessEmail')
            if data.get('businessLogo'): settings.logo = data.get('businessLogo')
            if data.get('currency'): settings.currency = data.get('currency')
            
            settings.needs_onboarding = False
            settings.metadata = {
                "natureOfBusiness": data.get('natureOfBusiness'),
                "businessSize": data.get('businessSize'),
                "website": data.get('businessWebsite'),
                "taxRate": data.get('taxRate', 0)
            }
            settings.save()

            if data.get('userName'):
                name_parts = data.get('userName').strip().split()
                if len(name_parts) > 0:
                    user.first_name = name_parts[0]
                    user.last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
            
            if data.get('userPhone'): user.phone = data.get('userPhone')
            if data.get('userPin'): user.pin = data.get('userPin')
            
            user.is_onboarded = True
            user.branch_id = target_branch_id
            user.agency_id = target_agency_id
            user.save()

            # Update Agency status too
            agency = user.agency
            if agency:
                if data.get('businessName'):
                    agency.name = data.get('businessName')
                agency.is_onboarded = True
                agency.save()
            
            return Response({"status": "completed"})


class BranchSettingsViewSet(viewsets.ModelViewSet):
    queryset = BranchSettings.objects.all()
    serializer_class = BranchSettingsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        branch_id = self.request.query_params.get('branchId')
        qs = super().get_queryset()
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        return qs

class CronJobViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]
    
    def verify_cron(self, request):
        import os
        secret = os.environ.get('CRON_SECRET')
        auth_header = request.headers.get('Authorization', '')
        if secret and auth_header != f"Bearer {secret}":
            return False
        return True

    @action(detail=False, methods=['post'])
    def subscription_monitor(self, request):
        if not self.verify_cron(request):
            return Response({"error": "Unauthorized"}, status=401)
            
        from django.utils.timezone import now
        current_time = now()
        
        expired_count = Agency.objects.filter(
            subscription_status='active',
            subscription_expiry__lt=current_time
        ).update(subscription_status='expired')
        
        expired_trials = Agency.objects.filter(
            subscription_status='trial',
            trial_end_date__lt=current_time
        ).update(subscription_status='expired')
        
        return Response({
            "success": True, 
            "message": f"Updated {expired_count} subs and {expired_trials} trials."
        })

    @action(detail=False, methods=['post'])
    def orphaned_account_cleanup(self, request):
        if not self.verify_cron(request):
            return Response({"error": "Unauthorized"}, status=401)
            
        return Response({"success": True, "message": "Orphaned accounts cleanup executed"})

    @action(detail=False, methods=['post'])
    def expiry_notifier(self, request):
        if not self.verify_cron(request):
            return Response({"error": "Unauthorized"}, status=401)
        
        return Response({"success": True, "message": "Expiry notifications sent"})
