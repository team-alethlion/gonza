from django.contrib.auth.signals import user_logged_in
from django.dispatch import receiver
from .logic.user_tracking import update_user_last_login

@receiver(user_logged_in)
def user_logged_in_handler(sender, request, user, **kwargs):
    """
    Called when a user logs in.
    """
    update_user_last_login(user)
