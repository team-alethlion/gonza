from django.utils import timezone
from django.core.cache import cache

def update_user_last_seen(user):
    """
    Updates the user's last_seen timestamp in the database,
    using cache to throttle the updates.
    """
    if not user.is_authenticated:
        return

    user_id = user.id
    cache_key = f"user_last_seen_{user_id}"
    
    # Check if we have updated recently (e.g., within the last 5 minutes)
    if not cache.get(cache_key):
        user.last_seen = timezone.now()
        user.save(update_fields=['last_seen'])
        # Set cache to prevent another update for 5 minutes
        cache.set(cache_key, True, 300)

def update_user_last_login(user):
    """
    Updates the user's last_login timestamp.
    """
    user.last_login = timezone.now()
    user.save(update_fields=['last_login'])
