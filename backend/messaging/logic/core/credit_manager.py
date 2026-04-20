import logging
from django.db import transaction, models
from django.db.models import F
from users.models import User

logger = logging.getLogger(__name__)

class CreditManager:
    """
    🛡️ CREDIT MANAGER
    Handles atomic deduction and refunding of SMS credits.
    """

    @staticmethod
    def can_afford(user_id, credits_needed):
        """
        Check if a user has enough credits.
        """
        try:
            user = User.objects.get(id=user_id)
            return user.credits >= credits_needed
        except User.DoesNotExist:
            return False

    @staticmethod
    def deduct(user_id, credits_to_deduct, reason=None):
        """
        Atomically deduct credits from a user.
        Returns True if successful, False otherwise.
        """
        if credits_to_deduct <= 0:
            return True

        try:
            with transaction.atomic():
                # Lock the user record to prevent race conditions
                user = User.objects.select_for_update().get(id=user_id)
                
                if user.credits < credits_to_deduct:
                    logger.warning(f"[CreditManager] ❌ User {user_id} insufficient credits. Need {credits_to_deduct}, has {user.credits}")
                    return False
                
                user.credits = F('credits') - credits_to_deduct
                user.save(update_fields=['credits'])
                
                logger.info(f"[CreditManager] 📉 Deducted {credits_to_deduct} credits from User {user_id}. Reason: {reason or 'Not specified'}")
                return True
        except User.DoesNotExist:
            logger.error(f"[CreditManager] ❌ User {user_id} not found for credit deduction.")
            return False
        except Exception as e:
            logger.error(f"[CreditManager] ❌ Critical error during credit deduction for User {user_id}: {str(e)}")
            return False

    @staticmethod
    def refund(user_id, credits_to_refund, reason=None):
        """
        Atomically refund credits to a user.
        Typically used when a message fails definitively.
        """
        if credits_to_refund <= 0:
            return True

        try:
            with transaction.atomic():
                # Lock the user record
                user = User.objects.select_for_update().get(id=user_id)
                
                user.credits = F('credits') + credits_to_refund
                user.save(update_fields=['credits'])
                
                logger.info(f"[CreditManager] 📈 Refunded {credits_to_refund} credits to User {user_id}. Reason: {reason or 'Not specified'}")
                return True
        except User.DoesNotExist:
            logger.error(f"[CreditManager] ❌ User {user_id} not found for credit refund.")
            return False
        except Exception as e:
            logger.error(f"[CreditManager] ❌ Critical error during credit refund for User {user_id}: {str(e)}")
            return False
