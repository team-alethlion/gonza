from .logic.user_tracking import update_user_last_seen

class UserActivityMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            # Delegate to the tracking module
            update_user_last_seen(request.user)
            
        response = self.get_response(request)
        return response
