from .stats import get_customer_summary_stats
from ..models import CustomerCategory, Customer
from ..serializers import CustomerCategorySerializer, CustomerSerializer

def get_customer_module_summary(branch_id):
    """
    Unified logic to fetch stats, categories, and initial data for the customers module.
    Reduces 3+ HTTP requests into 1.
    """
    if not branch_id:
        return {}

    # 1. Fetch Stats (reuse existing optimized logic)
    stats = get_customer_summary_stats(branch_id)
    
    # 2. Fetch Categories
    categories_qs = CustomerCategory.objects.filter(branch_id=branch_id).order_by('name')
    categories_data = CustomerCategorySerializer(categories_qs, many=True).data
    
    # 3. Fetch Recent/Top Customers (Optional snapshot for initial render)
    # We fetch the first 10 to populate the "Recent" view immediately
    recent_qs = Customer.objects.filter(branch_id=branch_id).order_by('-created_at')[:10]
    recent_data = CustomerSerializer(recent_qs, many=True).data

    return {
        "stats": stats,
        "categories": categories_data,
        "recentCustomers": recent_data,
        "branchId": branch_id
    }
