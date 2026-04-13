from django.db import transaction
from users.models import Role, Permission
from core_app.models import BranchSettings

def initialize_branch(branch, admin_user):
    """
    Sets up a new branch with essential data:
    1. Creates an 'admin' role.
    2. Assigns ALL existing permissions to that role.
    3. Initializes default BranchSettings.
    """
    with transaction.atomic():
        # 1. Create the branch-specific admin role
        # We use get_or_create to be idempotent
        role, created = Role.objects.get_or_create(
            branch=branch,
            name='admin',
            defaults={
                'description': 'Branch Administrator',
                'pin_required': True
            }
        )

        # 2. Assign ALL existing permissions to this role
        all_perms = Permission.objects.all()
        role.permissions.add(*all_perms)

        # 3. Initialize default settings
        BranchSettings.objects.get_or_create(
            branch=branch,
            defaults={
                'business_name': branch.name,
                'currency': 'UGX'
            }
        )

        return role
