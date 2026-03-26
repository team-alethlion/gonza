from django.db import transaction
from django.utils import timezone
from core_app.models import BranchCounter, Branch

def generate_receipt_number(branch_id):
    """
    Generates a unique, sequential receipt number for a specific branch.
    Format: RCP-BRANCH_NAME-YYYY-XXXX
    """
    if not branch_id:
        return None

    with transaction.atomic():
        branch = Branch.objects.get(id=branch_id)
        # Use short name if possible, otherwise first 3 letters
        branch_code = branch.name[:3].upper().replace(" ", "")
        
        year = timezone.now().year
        
        # Use select_for_update to handle concurrency safely
        counter, created = BranchCounter.objects.select_for_update().get_or_create(
            branch=branch,
            type='sale',
            defaults={'count': 0}
        )
        
        counter.count += 1
        counter.save()
        
        # Format: RCP-BRA-2026-00001
        receipt_number = f"RCP-{branch_code}-{year}-{counter.count:05d}"
        
        return receipt_number
