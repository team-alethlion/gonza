from django.db import models
from django.utils.text import slugify
from core.utils import gen_su_id, gen_ca_id, gen_pr_id, gen_au_id, gen_ai_id, gen_ph_id, gen_tr_id, gen_ti_id, gen_re_id, gen_ri_id

class Supplier(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_su_id)
    name = models.CharField(max_length=200)
    contact_name = models.CharField(max_length=200, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    
    agency = models.ForeignKey('core_app.Agency', on_delete=models.CASCADE, related_name='suppliers', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('agency', 'name')
        verbose_name_plural = "Suppliers"

    def __str__(self):
        return self.name

class Category(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_ca_id)
    name = models.CharField(max_length=200)
    description = models.TextField(null=True, blank=True)

    agency = models.ForeignKey('core_app.Agency', on_delete=models.CASCADE, related_name='categories', null=True, blank=True)
    branch = models.ForeignKey('core_app.Branch', on_delete=models.CASCADE, related_name='categories', null=True, blank=True)
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='categories')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('branch', 'name')
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name

class Product(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_pr_id)
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=250, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    
    selling_price = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    cost_price = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    overhead_cost = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    initial_stock = models.IntegerField(default=0)
    min_stock = models.IntegerField(default=0)
    stock = models.IntegerField(default=0)
    
    # 🛡️ SIGNAL CONTEXT: Non-DB attributes to pass info to post_save signal
    _history_user_id = None
    _history_type = None
    _history_reason = None
    _history_reference_id = None
    _history_reference_type = None
    _history_created_at = None
    _original_stock = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._original_stock = self.stock
    
    barcode = models.CharField(max_length=100, null=True, blank=True)
    sku = models.CharField(max_length=100, null=True, blank=True)
    image_url = models.URLField(max_length=500, null=True, blank=True)
    manufacturer_barcode = models.CharField(max_length=100, null=True, blank=True)
    tags = models.JSONField(default=list, blank=True)
    
    agency = models.ForeignKey('core_app.Agency', on_delete=models.CASCADE, related_name='products', null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    branch = models.ForeignKey('core_app.Branch', on_delete=models.CASCADE, related_name='products', null=True, blank=True)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='products', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = (
            ('branch', 'sku'),
            ('branch', 'barcode'),
            ('branch', 'slug'),
        )
        verbose_name_plural = "Products"

    def save(self, *args, **kwargs):
        if not self.slug and self.name:
            self.slug = slugify(self.name)
        
        # 🛡️ DATA INTEGRITY: Ensure empty strings are saved as NULL (None)
        # This prevents "unique_together" constraint violations for multiple products
        # with empty barcodes or SKUs within the same branch.
        if self.barcode == "":
            self.barcode = None
        if self.sku == "":
            self.sku = None
        if self.manufacturer_barcode == "":
            self.manufacturer_barcode = None
            
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class StockAudit(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_au_id)
    audit_number = models.CharField(max_length=100, unique=True, null=True)
    status = models.CharField(max_length=50, default="In Progress")
    date_started = models.DateTimeField(auto_now_add=True)
    date_completed = models.DateTimeField(null=True, blank=True)
    
    total_variance = models.IntegerField(default=0)
    performed_by = models.CharField(max_length=200, null=True, blank=True)
    
    agency = models.ForeignKey('core_app.Agency', on_delete=models.CASCADE, related_name='stock_audits', null=True, blank=True)
    branch = models.ForeignKey('core_app.Branch', on_delete=models.CASCADE, related_name='stock_audits', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Stock Audits"

class StockAuditItem(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_ai_id)
    audit = models.ForeignKey(StockAudit, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stock_audit_items')
    
    product_name = models.CharField(max_length=200)
    sku = models.CharField(max_length=100, null=True, blank=True)
    
    expected_qty = models.IntegerField(default=0)
    counted_qty = models.IntegerField(default=0)
    variance = models.IntegerField(default=0)
    status = models.CharField(max_length=50, default="Pending") # "Matched", "Missing", "Surplus", "Pending"
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Stock Audit Items"

class ProductHistory(models.Model):
    HISTORY_TYPES = (
        ('SALE', 'Sale'), ('RETURN_IN', 'Return In'), ('RESTOCK', 'Restock'),
        ('ADJUSTMENT', 'Adjustment'), ('PRICE_CHANGE', 'Price Change'), 
        ('COST_CHANGE', 'Cost Change'), ('CREATED', 'Created'), 
        ('STOCK_TAKE', 'Stock Take'), ('TRANSFER_IN', 'Transfer In'),
        ('TRANSFER_OUT', 'Transfer Out'), ('RETURN_OUT', 'Return Out')
    )

    id = models.CharField(max_length=30, primary_key=True, default=gen_ph_id)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='history')
    type = models.CharField(max_length=50, choices=HISTORY_TYPES)
    quantity_change = models.IntegerField(default=0)
    old_stock = models.IntegerField(default=0)
    new_stock = models.IntegerField(default=0)
    new_quantity = models.IntegerField(null=True, blank=True)
    change_reason = models.TextField(null=True, blank=True)
    
    agency = models.ForeignKey('core_app.Agency', on_delete=models.CASCADE, related_name='product_histories', null=True, blank=True)
    branch = models.ForeignKey('core_app.Branch', on_delete=models.CASCADE, related_name='product_histories', null=True, blank=True)
    
    old_price = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    new_price = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    old_cost = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    new_cost = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    reference_id = models.CharField(max_length=100, null=True, blank=True)
    reference_type = models.CharField(max_length=100, null=True, blank=True)
    reason = models.TextField(null=True, blank=True)
    
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='product_history', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Product Histories"

class StockTransfer(models.Model):
    TRANSFER_STATUS = (
        ('PENDING', 'Pending'), ('COMPLETED', 'Completed'), ('CANCELLED', 'Cancelled')
    )

    id = models.CharField(max_length=30, primary_key=True, default=gen_tr_id)
    transfer_number = models.CharField(max_length=100, unique=True)
    date = models.DateTimeField(auto_now_add=True)
    
    agency = models.ForeignKey('core_app.Agency', on_delete=models.CASCADE, related_name='stock_transfers', null=True, blank=True)
    from_branch = models.ForeignKey('core_app.Branch', on_delete=models.CASCADE, related_name='from_transfers', null=True, blank=True)
    to_branch = models.ForeignKey('core_app.Branch', on_delete=models.CASCADE, related_name='to_transfers', null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=TRANSFER_STATUS, default='PENDING')
    transfer_cost = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    notes = models.TextField(null=True, blank=True)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='stock_transfers', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Stock Transfers"

class StockTransferItem(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_ti_id)
    transfer = models.ForeignKey(StockTransfer, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='transfer_items', null=True, blank=True)
    product_name = models.CharField(max_length=200)
    sku = models.CharField(max_length=100, null=True, blank=True)
    quantity = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Stock Transfer Items"

class Requisition(models.Model):
    REQ_STATUS = (('PENDING', 'Pending'), ('APPROVED', 'Approved'), ('REJECTED', 'Rejected'), ('FULFILLED', 'Fulfilled'), ('CANCELLED', 'Cancelled'))
    id = models.CharField(max_length=30, primary_key=True, default=gen_re_id)
    requisition_number = models.CharField(max_length=100)
    date = models.DateTimeField(auto_now_add=True)
    title = models.CharField(max_length=200, null=True, blank=True)
    
    agency = models.ForeignKey('core_app.Agency', on_delete=models.CASCADE, related_name='requisitions', null=True, blank=True)
    branch = models.ForeignKey('core_app.Branch', on_delete=models.CASCADE, related_name='requisitions', null=True, blank=True)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='requisitions', null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=REQ_STATUS, default='PENDING')
    priority = models.CharField(max_length=20, default='NORMAL')
    notes = models.TextField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('branch', 'requisition_number')
        verbose_name_plural = "Requisitions"

class RequisitionItem(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_ri_id)
    requisition = models.ForeignKey(Requisition, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='requisition_items', null=True, blank=True)
    product_name = models.CharField(max_length=200)
    sku = models.CharField(max_length=100, null=True, blank=True)
    quantity = models.IntegerField(default=0)
    urgent_item = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Requisition Items"
