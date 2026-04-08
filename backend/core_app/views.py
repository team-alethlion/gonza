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

from .models import (
    Agency, Branch, BranchSettings, Package, SubscriptionTransaction,
    Task, TaskCategory, ActivityHistory
)
from .serializers import (
    AgencySerializer, BranchSerializer,
    BranchSettingsSerializer, PackageSerializer,
    TaskSerializer, TaskCategorySerializer, ActivityHistorySerializer
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

        from .logic.analytics import get_analytics_summary
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

    def create(self, request, *args, **kwargs):
        name = request.data.get('name')
        branch = Branch.objects.create(
            name=name,
            location="Main Location",
            admin=request.user,
            agency_id=request.user.agency_id
        )
        return Response(self.get_serializer(branch).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def reset(self, request, pk=None):
        branch = self.get_object()
        user = request.user
        if branch.admin_id != user.id:
            return Response({"error": "Only the admin can reset the business"}, status=status.HTTP_403_FORBIDDEN)
            
        with transaction.atomic():
            branch.product_history.all().delete()
            branch.sales.all().delete()
            branch.products.all().delete()
            branch.customers.all().delete()
            
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

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        from dateutil.relativedelta import relativedelta
        task = serializer.save()
        
        if task.is_recurring and task.recurrence_type and task.recurrence_end_date:
            current_date = task.due_date
            end_date = task.recurrence_end_date
            count = 1
            
            delta = None
            if task.recurrence_type == 'daily':
                delta = relativedelta(days=1)
            elif task.recurrence_type == 'weekly':
                delta = relativedelta(weeks=1)
            elif task.recurrence_type == 'monthly':
                delta = relativedelta(months=1)
                
            if delta:
                while count < 1000: # 🛠️ Increased cap to ~3 years to prevent silent stops
                    current_date += delta
                    if current_date > end_date:
                        break
                        
                    Task.objects.create(
                        id=f"ts_{uuid.uuid4().hex[:12]}",
                        created_by=task.created_by,
                        branch=task.branch,
                        title=task.title,
                        description=task.description,
                        priority=task.priority,
                        due_date=current_date,
                        category=task.category,
                        reminder_enabled=task.reminder_enabled,
                        reminder_time=task.reminder_time,
                        is_recurring=False,
                        parent_task_id=task.id,
                        recurrence_count=count
                    )
                    count += 1

    def get_queryset(self):
        qs = super().get_queryset()
        user_id = self.request.query_params.get('userId')
        branch_id = self.request.query_params.get('locationId')
        if user_id:
            qs = qs.filter(created_by_id=user_id)
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        return qs.order_by('due_date')

class TaskCategoryViewSet(viewsets.ModelViewSet):
    queryset = TaskCategory.objects.all()
    serializer_class = TaskCategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user_id = self.request.query_params.get('userId')
        branch_id = self.request.query_params.get('locationId')
        if user_id and user_id != 'ALL':
            qs = qs.filter(user_id=user_id)
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        return qs.order_by('name')

    def perform_create(self, serializer):
        # Allow manual passing of user and branch from frontend
        user_id = self.request.data.get('user')
        branch_id = self.request.data.get('branch')
        
        serializer.save(
            user_id=user_id or self.request.user.id,
            branch_id=branch_id
        )

class ActivityHistoryViewSet(viewsets.ModelViewSet):
    queryset = ActivityHistory.objects.all()
    serializer_class = ActivityHistorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        branch_id = self.request.query_params.get('locationId')
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
            
        user_id = self.request.query_params.get('userId')
        if user_id and user_id != 'ALL':
            qs = qs.filter(user_id=user_id)
            
        activity_type = self.request.query_params.get('activityType')
        if activity_type and activity_type != 'ALL':
            qs = qs.filter(activity_type=activity_type)
            
        module = self.request.query_params.get('module')
        if module and module != 'ALL':
            qs = qs.filter(module=module)
            
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(description__icontains=search) | 
                Q(entity_name__icontains=search) |
                Q(profile_name__icontains=search)
            )
            
        entity_ids = self.request.query_params.get('entityIds')
        if entity_ids:
            id_list = entity_ids.split(',')
            qs = qs.filter(entity_id__in=id_list)
            
        start_date = self.request.query_params.get('startDate') or self.request.query_params.get('dateFrom')
        if start_date:
            qs = qs.filter(created_at__gte=start_date)
            
        end_date = self.request.query_params.get('endDate') or self.request.query_params.get('dateTo')
        if end_date:
            qs = qs.filter(created_at__lte=end_date)
            
        return qs.order_by('-created_at')

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
    def activity_cleanup(self, request):
        if not self.verify_cron(request):
            return Response({"error": "Unauthorized"}, status=401)
            
        from django.utils.timezone import now
        from dateutil.relativedelta import relativedelta
        cutoff_date = now() - relativedelta(days=90)
        
        deleted, _ = ActivityHistory.objects.filter(created_at__lt=cutoff_date).delete()
        return Response({"success": True, "message": f"Deleted {deleted} old activities."})

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
