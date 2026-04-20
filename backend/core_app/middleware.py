from django.http import JsonResponse
from core_app.logic.access_control import is_guest_session

class SentinelAccessMiddleware:
    """
    Middleware to enforce 'Viewer Only' mode for managers visiting other branches.
    Blocks POST, PUT, PATCH, DELETE if the session is identified as a Guest Session.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.user.is_authenticated:
            return self.get_response(request)

        # 1. Identify the branch being accessed
        # We check common places where branchId is provided
        target_branch_id = (
            request.headers.get('X-Branch-Id') or 
            request.GET.get('branchId') or 
            request.POST.get('branchId')
        )

        # 2. Check if this is a Guest Session (Manager in non-primary branch)
        if target_branch_id and is_guest_session(request.user, target_branch_id):
            # 3. Block mutations for Guests
            if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
                # EXCEPTIONS: Allow some basic operations if needed (e.g., changing password for oneself)
                # But for now, we follow the strict mandate of "Viewer Only"
                if not self._is_whitelisted_path(request.path):
                    return JsonResponse({
                        "error": "Access Denied: You are in Viewer Mode for this branch. Modifications are restricted."
                    }, status=403)

        return self.get_response(request)

    def _is_whitelisted_path(self, path):
        # Add paths that should be modifiable even in guest mode
        whitelist = [
            '/api/users/users/me/',
            '/api/users/users/reset_password/',
        ]
        return any(path.startswith(p) for p in whitelist)
