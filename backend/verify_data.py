import os
import django
import json

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from users.models import User
from core_app.models import Branch
from finance.views import CashTransactionViewSet

def verify():
    factory = APIRequestFactory()
    user = User.objects.filter(is_superuser=True).first()
    branch_id = 'br-x74tzb48dl6cwzlx6hvldn7j'
    
    print(f"VERIFYING BACKEND FOR BRANCH: {branch_id}")
    
    # Test precisely as the hook does (with specific filters)
    # The hook sends: locationId, accountId, page, pageSize, filters
    # url: finance/cash-transactions/?branchId=...&limit=...&offset=...
    
    request = factory.get('/api/finance/cash-transactions/', {
        'branchId': branch_id,
        'limit': 50,
        'offset': 0
    })
    force_authenticate(request, user=user)
    view = CashTransactionViewSet.as_view({'get': 'list'})
    response = view(request)
    
    print(f"Response Status: {response.status_code}")
    data = response.data
    results = data.get('results', [])
    print(f"Total Count in JSON: {data.get('count', 0)}")
    print(f"Items in results list: {len(results)}")
    
    if len(results) > 0:
        print("SAMPLE ITEM DESCRIPTION:", results[0].get('description'))
        print("SAMPLE ITEM BRANCH ID:", results[0].get('branch')) # Model field is branch (ForeignKey)

if __name__ == "__main__":
    verify()
