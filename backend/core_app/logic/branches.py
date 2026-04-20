from django.db import transaction
from users.models import Role, Permission
from core_app.models import BranchSettings

def initialize_branch(branch, admin_user):
    """
    Sets up a new branch with essential data:
    1. Ensures Agency-level 'admin' and 'manager' roles exist.
    2. Initializes default BranchSettings.
    """
    with transaction.atomic():
        agency = branch.agency
        
        # 1. Ensure the Agency-scoped admin role exists
        role, created = Role.objects.get_or_create(
            agency=agency,
            name='admin',
            defaults={
                'description': 'Agency Administrator with full access to all branches',
                'pin_required': False, # Admin bypass
                'is_system_role': True
            }
        )

        # 2. Assign ALL existing permissions to this role if it was just created
        if created:
            all_perms = Permission.objects.all()
            role.permissions.add(*all_perms)

        # 🚀 REUSABLE MANAGER ROLE: Setup at the agency level
        from users.logic.roles import get_or_create_manager_role
        get_or_create_manager_role(branch) # This needs update too to use agency

        # 3. Initialize default settings
        BranchSettings.objects.get_or_create(
            branch=branch,
            defaults={
                'business_name': branch.name,
                'currency': 'UGX'
            }
        )

        return role
