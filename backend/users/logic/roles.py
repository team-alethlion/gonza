from django.db import transaction
from users.models import Role, Permission

def get_or_create_manager_role(branch):
    """
    Ensures an agency-level 'manager' role exists with full permissions.
    """
    with transaction.atomic():
        agency = branch.agency
        role, created = Role.objects.get_or_create(
            agency=agency,
            name='manager',
            defaults={
                'description': 'Agency-wide Manager with full local access to assigned branches',
                'pin_required': True,
                'is_system_role': True
            }
        )
        
        # Managers get all permissions by default (middleware will restrict them if cross-branch)
        if created:
            all_perms = Permission.objects.all()
            role.permissions.add(*all_perms)
        
        return role

def is_protected_role(role):
    """
    Checks if a role is a system-protected role that shouldn't be deleted.
    """
    protected_names = ['admin', 'manager']
    return role.name.lower() in protected_names and role.branch_id is not None
