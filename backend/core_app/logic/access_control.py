def is_guest_session(user, target_branch_id):
    """
    Determines if the current session should be 'Viewer Only'.
    Returns True if the user is a manager visiting a branch that isn't their primary.
    """
    if not user.is_authenticated:
        return True
        
    # Superadmin and Agency Admins (Owners) are never guests in their own agency branches
    if user.is_superuser:
        return False
        
    role_name = getattr(user.role, 'name', '').lower()
    if role_name == 'admin':
        return False
        
    # If the user has a primary_branch and it's different from the target, they are a guest
    primary_branch_id = getattr(user, 'primary_branch_id', None)
    if primary_branch_id and str(primary_branch_id) != str(target_branch_id):
        return True
        
    return False

def check_mutation_allowed(user, target_branch_id):
    """
    Logic to prevent POST/PATCH/DELETE for guest sessions.
    """
    if is_guest_session(user, target_branch_id):
        return False, "You are in Viewer Mode for this branch. Modifications are not allowed."
    return True, ""
