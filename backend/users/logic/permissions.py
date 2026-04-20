from users.models import User, Permission

def check_user_permission(user, module, action='view'):
    """
    Modular permission checker.
    Returns True if the user has the specific permission via their role.
    """
    if not user or not user.is_authenticated:
        return False
        
    # Superusers always have permission
    if user.is_superuser:
        return True
        
    if not user.role:
        return False
        
    # Check if the specific permission exists for this role
    # Permission naming convention: "module:action" (e.g., "inventory:view_cost_price")
    perm_name = f"{module.lower()}:{action.lower()}"
    
    return user.role.permissions.filter(name=perm_name).exists()

def get_user_permissions_map(user):
    """
    Returns a dictionary of all permissions assigned to the user's role.
    Format: { "module": ["action1", "action2"] }
    """
    if not user or not user.role:
        return {}
        
    permissions = user.role.permissions.all()
    perm_map = {}
    
    for perm in permissions:
        if ':' in perm.name:
            module, action = perm.name.split(':', 1)
            if module not in perm_map:
                perm_map[module] = []
            perm_map[module].append(action)
            
    return perm_map
