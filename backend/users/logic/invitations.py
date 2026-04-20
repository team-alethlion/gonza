import random
import uuid
from django.utils.timezone import now, timedelta
from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction

def generate_invitation_code():
    return str(random.randint(100000, 999999))

def create_manager_invitation(branch, email, inviter):
    """
    Creates or refreshes an invitation for a manager account.
    """
    from users.models import BranchInvitation
    
    expires_at = now() + timedelta(days=2)
    code = generate_invitation_code()
    
    # 🚀 FIX: Use update_or_create to prevent IntegrityError on re-invites
    invitation, created = BranchInvitation.objects.update_or_create(
        email=email,
        branch=branch,
        status='PENDING',
        defaults={
            'agency': branch.agency,
            'inviter': inviter,
            'code': code,
            'expires_at': expires_at
        }
    )
    
    # Send email
    subject = f"Invitation to manage {branch.name} - Gonza Systems"
    message = f"You have been invited to manage {branch.name}.\nYour verification code is: {code}\nThis code expires in 48 hours."
    
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=False
    )
    
    return invitation

def verify_and_accept_invitation(email, code, password, name):
    """
    Verifies the code and creates the manager user.
    """
    from users.models import BranchInvitation, User
    from users.logic.roles import get_or_create_manager_role
    from django.contrib.auth.hashers import make_password

    try:
        with transaction.atomic():
            invitation = BranchInvitation.objects.select_for_update().get(
                email=email, 
                code=code, 
                status='PENDING',
                expires_at__gt=now()
            )
            
            # 1. Ensure Manager Role exists
            role = get_or_create_manager_role(invitation.branch)
            
            # 2. Create User
            name_parts = (name or "").split(' ', 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ""
            
            user = User.objects.create(
                email=email,
                first_name=first_name,
                last_name=last_name,
                password=make_password(password),
                agency=invitation.agency,
                branch=invitation.branch,
                primary_branch=invitation.branch, # 🚀 NEW: Linked to assigned branch
                role=role,
                status='ACTIVE'
            )
            
            # 3. Mark invitation as accepted
            invitation.status = 'ACCEPTED'
            invitation.accepted_at = now()
            invitation.save()
            
            return user, None
    except BranchInvitation.DoesNotExist:
        return None, "Invalid or expired invitation code"
