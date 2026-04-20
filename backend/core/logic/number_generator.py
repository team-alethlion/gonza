import re
from django.db import transaction
from django.utils import timezone
from core_app.models import BranchCounter, Branch

class NumberingEngine:
    """
    🏗️ HIGH-PRECISION NUMBERING ENGINE
    
    Generates professional, unique, and date-resettable identifiers 
    for Sales Receipts, Returns, and Requisitions.
    
    Format: {PREFIX}-{BRANCH}-{YYMM}-{SEQUENCE}
    Example: GZ-KLA-2604-0001
    """

    @staticmethod
    def _generate_branch_code(branch_name: str) -> str:
        """
        Extracts a sharp 3-letter uppercase code from a branch name.
        Example: "Kampala Store" -> "KLA"
        """
        name = branch_name.strip().upper()
        # Remove vowels and spaces
        code_chars = re.sub(r'[AEIOU\s]', '', name)
        
        if len(code_chars) >= 3:
            return code_chars[:3]
        
        # Fallback to taking first 3 letters if not enough consonants
        return name[:3].ljust(3, 'X')

    @classmethod
    def get_next_number(cls, branch_id, type_key='sale', prefix='GZ', increment=True):
        """
        Calculates the next available number in the sequence.
        Resets the sequence automatically every month.
        """
        if not branch_id:
            return None

        with transaction.atomic():
            try:
                branch = Branch.objects.get(id=branch_id)
            except Branch.DoesNotExist:
                return None

            now = timezone.now()
            date_part = now.strftime("%y%m")
            branch_code = cls._generate_branch_code(branch.name)

            # 🛡️ CONCURRENCY: Use select_for_update to lock the counter
            counter, created = BranchCounter.objects.select_for_update().get_or_create(
                branch=branch,
                type=type_key,
                defaults={'count': 0, 'last_reset_month': now.month}
            )

            # 🚀 AUTO-RESET: Check if the month has changed since the last number was issued
            if hasattr(counter, 'last_reset_month') and counter.last_reset_month != now.month:
                counter.count = 0
                counter.last_reset_month = now.month

            next_count = counter.count + 1

            if increment:
                counter.count = next_count
                counter.save()

            return f"{prefix}-{branch_code}-{date_part}-{next_count:04d}"
