from django.utils import timezone

def sync_agency_subscription_status(agency):
    """
    Checks the current date against trial and subscription expiry dates.
    If the date has passed, it updates the subscription_status string in the database.
    Returns True if an update was made, False otherwise.
    """
    now = timezone.now()
    original_status = agency.subscription_status
    new_status = original_status

    # 1. Check Trial Expiry
    if original_status == 'trial':
        if agency.trial_end_date and agency.trial_end_date < now:
            new_status = 'expired'

    # 2. Check Active Subscription Expiry
    elif original_status == 'active':
        if agency.subscription_expiry and agency.subscription_expiry < now:
            new_status = 'expired'

    # 3. If status changed, persist to database
    if new_status != original_status:
        agency.subscription_status = new_status
        agency.save(update_fields=['subscription_status'])
        return True

    return False
