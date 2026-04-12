import os
import django
import sys
from decimal import Decimal

# Setup Django environment
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from inventory.models import Product, ProductHistory
from django.db import transaction

def patch_history(dry_run=True):
    print(f"{'--- DRY RUN ---' if dry_run else '--- LIVE PATCH ---'}")
    
    products = Product.objects.all()
    total_repaired = 0
    total_chains_synced = 0

    for product in products:
        # Get history in chronological order
        history = list(ProductHistory.objects.filter(product=product).order_by('created_at', 'id'))
        
        if not history:
            continue

        last_new_stock = None
        product_repaired = False

        for i, entry in enumerate(history):
            updated = False
            
            # 1. Fix "Zero-Quantity Drift" (Calculated Delta)
            # If quantity_change is 0 but stocks are different, fix it
            if entry.quantity_change == 0 and entry.old_stock != entry.new_stock:
                correct_delta = entry.new_stock - entry.old_stock
                if not dry_run:
                    entry.quantity_change = correct_delta
                updated = True
                total_repaired += 1

            # 2. Fix Chain Integrity (Link old_stock to previous new_stock)
            # This handles cases where history records were missing entirely
            if last_new_stock is not None and entry.old_stock != last_new_stock:
                if not dry_run:
                    entry.old_stock = last_new_stock
                    # After fixing old_stock, we MUST recalculate quantity_change
                    entry.quantity_change = entry.new_stock - entry.old_stock
                updated = True
                total_chains_synced += 1

            if updated and not dry_run:
                entry.save()
                product_repaired = True
            
            last_new_stock = entry.new_stock

        if product_repaired:
            print(f"Fixed history chain for product: {product.name} ({product.id})")

    print("\nPatch Summary:")
    print(f"- Records with zero-drift repaired: {total_repaired}")
    print(f"- History chains synchronized: {total_chains_synced}")
    print(f"- Total products affected: {Product.objects.filter(id__in=[p.id for p in products]).count()}")

if __name__ == "__main__":
    # Default to dry run for safety
    is_dry = "--live" not in sys.argv
    
    with transaction.atomic():
        patch_history(dry_run=is_dry)
        
        if is_dry:
            print("\nSafe Mode: No changes were saved to the database.")
            print("Run with '--live' to apply changes.")
        else:
            print("\nLive Mode: Changes have been committed.")
