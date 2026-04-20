import os
import django
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from users.models import User
from messaging.views import MessageTemplateViewSet

def test_templates():
    factory = APIRequestFactory()
    # Your User
    user = User.objects.get(email='gajelad554@lxbeta.com')
    # Your Branch
    branch_id = 'br-x74tzb48dl6cwzlx6hvldn7j'
    
    print(f"TESTING TEMPLATES FOR: {user.email} (ID: {user.id})")
    print(f"BRANCH: {branch_id}")
    
    # Simulate the frontend request
    request = factory.get('/api/messaging/templates/', {
        'userId': user.id,
        'locationId': branch_id
    })
    force_authenticate(request, user=user)
    
    view = MessageTemplateViewSet.as_view({'get': 'list'})
    response = view(request)
    
    print(f"Status Code: {response.status_code}")
    print(f"Raw Response: {json.dumps(response.data, indent=2)}")

if __name__ == "__main__":
    test_templates()
