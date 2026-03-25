import os
import django
import sys

# Since this script is now inside the 'backend' folder, the base directory is its own location.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from users.models import User, Role
from django.contrib.auth import get_user_model

def seed_admin():
    email = 'admin@gonza.com'
    password = 'admin123'
    
    # 1. Ensure a Superadmin role exists
    role, created = Role.objects.get_or_create(
        name='Superadmin',
        defaults={'description': 'System-wide super administrator'}
    )
    
    # 2. Create or Update the superuser
    User = get_user_model()
    user = User.objects.filter(email=email).first()
    
    if not user:
        user = User.objects.create_superuser(
            email=email,
            password=password,
            first_name='System',
            last_name='Admin',
            role=role,
            status='ACTIVE',
            is_onboarded=True
        )
        print(f"Successfully created superuser: {email}")
    else:
        # Force update password and staff status
        user.set_password(password)
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.role = role
        user.status = 'ACTIVE'
        user.is_onboarded = True
        user.save()
        print(f"Successfully updated existing superuser: {email}")

if __name__ == "__main__":
    seed_admin()
