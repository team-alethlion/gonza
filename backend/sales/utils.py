from django.db import transaction
from django.utils import timezone
from core_app.models import BranchCounter, Branch

def get_next_receipt_number(branch_id, increment=False):
    """
    Generates a professional, industry-standard receipt number.
    Format: GZ-{BRANCH}-{YYMM}-{SEQUENCE}
    Example: GZ-KLA-2603-0042
    
    If increment=True, it updates the database counter.
    If increment=False, it previews the next number.
    """
    if not branch_id:
        return None

    # Use atomic transaction and selection locking for consistency
    with transaction.atomic():
        try:
            branch = Branch.objects.get(id=branch_id)
        except Branch.DoesNotExist:
            return None

        # 1. Branch Identifier: Clean first 3 letters of branch name
        # e.g., "Kampala Store" -> "KLA"
        branch_name = branch.name.strip().upper()
        # Remove vowels to get a sharper code if length > 3, else take first 3
        if len(branch_name) > 3:
            import re
            code_chars = re.sub(r'[AEIOU\s]', '', branch_name)
            if len(code_chars) < 3:
                branch_code = branch_name[:3]
            else:
                branch_code = code_chars[:3]
        else:
            branch_code = branch_name.ljust(3, 'X')
            
        # 2. Date Components: Compact Year and Month (e.g., 2603 for March 2026)
        now = timezone.now()
        date_part = now.strftime("%y%m")
        
        # 3. Sequence: Use select_for_update to handle concurrency safely
        counter, created = BranchCounter.objects.select_for_update().get_or_create(
            branch=branch,
            type='sale',
            defaults={'count': 0}
        )
        
        # Increment the counter if requested
        next_count = counter.count + 1
        
        if increment:
            counter.count = next_count
            counter.save()
        
        # 4. Final Assembly: Brand Prefix (GZ) + Branch + Date + Padded Sequence
        # Using 4-digit padding for a clean look (0001 to 9999)
        receipt_number = f"GZ-{branch_code}-{date_part}-{next_count:04d}"
        
        return receipt_number

def generate_receipt_number(branch_id):
    """
    Backward compatible wrapper that increments the counter.
    """
    return get_next_receipt_number(branch_id, increment=True)
