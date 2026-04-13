from django.db import transaction
from users.models import Role, Permission

def get_or_create_manager_role(branch):
    """
    Ensures a 'manager' role exists for the given branch with full permissions.
    """
    with transaction.atomic():
        role, created = Role.objects.get_or_create(
            branch=branch,
            name='manager',
            defaults={
                'description': 'Branch Manager with full local access',
                'pin_required': True,
                'is_system_role': True
            }
        )
        
        # Managers get all permissions by default (middleware will restrict them if cross-branch)
        all_perms = Permission.objects.all()
        role.permissions.add(*all_perms)
        
        return role

def is_protected_role(role):
    """
    Checks if a role is a system-protected role that shouldn't be deleted.
    """
    protected_names = ['admin', 'manager']
    return role.name.lower() in protected_names and role.branch_id is not None
