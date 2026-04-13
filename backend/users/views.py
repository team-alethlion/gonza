import uuid
from datetime import timedelta
from django.utils.timezone import now
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db import transaction
from django.contrib.auth.hashers import make_password
from django.core.mail import send_mail
from django.conf import settings

from .models import User, Role, Permission, PasswordResetToken, DeletionRequest, EmailVerification
from .serializers import UserSerializer, RoleSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    
    def get_permissions(self):
        if self.action in ['request_reset', 'reset_password', 'initiate_signup', 'verify_signup']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        branch_id = self.request.query_params.get('branchId')
        if branch_id:
            user = self.request.user
            # In Prisma, GET users for a branch, OR the branch's adminId
            from core_app.models import Branch
            try:
                branch = Branch.objects.get(id=branch_id)
                qs = qs.filter(branch_id=branch_id) | qs.filter(id=branch.admin_id)
            except Branch.DoesNotExist:
                qs = qs.filter(branch_id=branch_id)
        return qs.order_by('date_joined')

    @action(detail=False, methods=['get'])
    def me(self, request):
        # 🚀 OPTIMIZATION: One query to get everything (User + Agency + Package)
        user = User.objects.select_related('agency', 'agency__package').get(id=request.user.id)
        
        # 🛡️ SELF-HEALING: Sync agency status if it exists
        if user.agency:
            user.agency.sync_status()
            
        serializer = self.get_serializer(user)
        return Response(serializer.data)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        data = request.data
        branch_id = data.get('branchId')
        role_id = data.get('roleId')
        
        user = User.objects.create(
            email=data.get('email'),
            name=data.get('name'),
            pin=data.get('pin'),
            status=data.get('status', 'ACTIVE'),
            role_id=role_id,
            branch_id=branch_id,
            agency_id=request.user.agency_id
        )
        # Using abstract user means checking 'name' and splitting if first_name/last_name exist
        if data.get('name'):
            parts = data['name'].split(' ', 1)
            user.first_name = parts[0]
            if len(parts) > 1:
                user.last_name = parts[1]
            user.save(update_fields=['first_name', 'last_name'])

        return Response(self.get_serializer(user).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = request.data.copy()

        # Handle name splitting if provided
        if 'name' in data:
            parts = data['name'].split(' ', 1)
            instance.first_name = parts[0]
            instance.last_name = parts[1] if len(parts) > 1 else ""
            # No need to save here, serializer.save() will handle it if we pass data correctly
            # or we can just let the serializer handle existing first_name/last_name fields
        
        # Mapping frontend 'roleId' to backend 'role'
        if 'roleId' in data:
            data['role'] = data.pop('roleId')
        
        # Mapping frontend 'branchId' to backend 'branch'
        if 'branchId' in data:
            data['branch'] = data.pop('branchId')

        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            # If 'prefetch_related' has been applied to a queryset, we need to
            # forcibly invalidate the prefetch cache on the instance.
            instance._prefetched_objects_cache = {}

        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def request_deletion(self, request):
        email = request.data.get('email')
        reason = request.data.get('reason')
        try:
            user = User.objects.get(email=email)
            DeletionRequest.objects.create(user=user, reason=reason, status='pending')
            
            send_mail(
                'Data Deletion Request - Gonza Systems',
                f'A data deletion request has been received for {email}.\nReason: {reason}',
                settings.DEFAULT_FROM_EMAIL,
                [settings.DEFAULT_FROM_EMAIL], # Send to admin
                fail_silently=True,
            )
            return Response({"status": "recorded"})
        except User.DoesNotExist:
            return Response({"status": "recorded"})

    @action(detail=False, methods=['post'])
    def request_reset(self, request):
        email = request.data.get('email')
        try:
            user = User.objects.get(email=email)
            token = str(uuid.uuid4())
            expires = now() + timedelta(hours=1)
            PasswordResetToken.objects.update_or_create(
                email=email,
                defaults={'token': token, 'expires': expires}
            )
            
            send_mail(
                'Password Reset - Gonza Systems',
                f'Use this token to reset your password: {token}\nIt expires in 1 hour.',
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
            return Response({"token": token})
        except User.DoesNotExist:
            return Response({"status": "ok"})

    @action(detail=False, methods=['post'])
    def reset_password(self, request):
        token_str = request.data.get('resetToken')
        new_password = request.data.get('newPassword')
        try:
            with transaction.atomic():
                token = PasswordResetToken.objects.select_for_update().get(token=token_str)
                if now() > token.expires:
                    token.delete()
                    return Response({"error": "Reset token has expired"}, status=400)
                
                user = User.objects.get(email=token.email)
                user.password = make_password(new_password)
                user.save(update_fields=['password'])
                token.delete()
                
                return Response({"status": "resetted"})
        except PasswordResetToken.DoesNotExist:
            return Response({"error": "Invalid reset token"}, status=400)
        except User.DoesNotExist:
            return Response({"error": "User no longer exists"}, status=400)

    @action(detail=False, methods=['post'])
    def initiate_signup(self, request):
        email = request.data.get('email')
        if User.objects.filter(email=email).exists():
            return Response({"error": "User with this email already exists"}, status=400)
            
        import random
        from datetime import timedelta
        code = str(random.randint(100000, 999999))
        expires = now() + timedelta(minutes=10)
        
        EmailVerification.objects.update_or_create(
            email=email,
            defaults={'code': code, 'expires_at': expires}
        )
        
        send_mail(
            'Verification Code - Gonza Systems',
            f'Your verification code is: {code}\nIt expires in 10 minutes.',
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )
        
        return Response({"status": "sent"})

    @action(detail=False, methods=['post'])
    def verify_signup(self, request):
        data = request.data
        email = data.get('email')
        password = data.get('password')
        name = data.get('name')
        code = data.get('code')
        
        try:
            with transaction.atomic():
                verification = EmailVerification.objects.select_for_update().get(email=email)
                if verification.code != code:
                    return Response({"error": "Invalid verification code"}, status=400)
                if now() > verification.expires_at:
                    return Response({"error": "Verification code has expired"}, status=400)
                    
                import uuid
                from core_app.models import Agency, Branch
                unique_id = str(uuid.uuid4())[:6]
                
                agency = Agency.objects.create(
                    name=f"{name or 'New'} Agency ({unique_id})",
                    subscription_status="expired",
                    had_trial_before=False
                )
                
                # Split name into first and last
                name_parts = (name or "").split(' ', 1)
                first_name = name_parts[0]
                last_name = name_parts[1] if len(name_parts) > 1 else ""

                user = User.objects.create(
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    password=make_password(password),
                    agency=agency,
                    status="ACTIVE"
                )
                
                branch = Branch.objects.create(
                    name=f"Main Branch ({unique_id})",
                    location="Default Location",
                    agency=agency,
                    admin=user,
                    type='MAIN'
                )

                # 🚀 INITIALIZE: Setup roles, permissions and settings
                from core_app.logic.branches import initialize_branch
                role = initialize_branch(branch, user)
                
                # Update user with branch and role
                user.branch = branch
                user.role = role
                user.save(update_fields=['branch', 'role'])
                
                verification.delete()
                
                return Response({
                    "user": {"id": user.id, "email": user.email, "name": user.name, "role": "admin"}
                })
        except EmailVerification.DoesNotExist:
            return Response({"error": "No verification found for this email"}, status=400)

    @action(detail=True, methods=['post'])
    def update_branch(self, request, pk=None):
        user = self.get_object()
        branch_id = request.data.get('branchId')
        
        requesting_user = request.user
        if requesting_user.id != user.id and getattr(requesting_user.role, 'name', '').lower() != "superadmin":
            return Response({"error": "Unauthorized"}, status=403)
            
        user.branch_id = branch_id
        user.save(update_fields=['branch_id'])
        return Response({"status": "updated"})


class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        branch_id = self.request.query_params.get('branchId')
        if branch_id:
            qs = qs.filter(branch_id=branch_id) | qs.filter(branch__isnull=True)
        return qs

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        data = request.data
        branch_id = data.get('branchId')
        name = data.get('name')
        description = data.get('description', '')
        pin_required = data.get('pinRequired', True)
        permissions_data = data.get('permissions', [])
        
        role = Role.objects.create(
            name=name, 
            description=description, 
            branch_id=branch_id,
            pin_required=pin_required
        )
        
        for perm_name in permissions_data:
            perm, _ = Permission.objects.get_or_create(name=perm_name)
            role.permissions.add(perm)
            
        return Response(self.get_serializer(role).data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        role = self.get_object()
        data = request.data
        if 'name' in data: role.name = data['name']
        if 'description' in data: role.description = data['description']
        if 'pinRequired' in data: role.pin_required = data['pinRequired']
        
        if 'permissions' in data:
            permissions_data = data.get('permissions', [])
            role.permissions.clear()
            for perm_name in permissions_data:
                perm, _ = Permission.objects.get_or_create(name=perm_name)
                role.permissions.add(perm)
                
        role.save()
        return Response(self.get_serializer(role).data)
