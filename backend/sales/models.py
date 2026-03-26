from django.db import models
from django.utils.text import slugify
from core.utils import gen_sg_id, gen_slc_id, gen_sa_id, gen_si_id, gen_ip_id

class SalesGoal(models.Model):
    GOAL_PERIODS = (
        ('DAILY', 'Daily'), ('WEEKLY', 'Weekly'), 
        ('MONTHLY', 'Monthly'), ('YEARLY', 'Yearly'), ('CUSTOM', 'Custom')
    )
    STATUS_CHOICES = (
        ('ACTIVE', 'Active'), ('COMPLETED', 'Completed'), ('FAILED', 'Failed')
    )

    id = models.CharField(max_length=30, primary_key=True, default=gen_sg_id)
    agency = models.ForeignKey('core_app.Agency', on_delete=models.CASCADE, related_name='sales_goals', null=True, blank=True)
    branch = models.ForeignKey('core_app.Branch', on_delete=models.CASCADE, related_name='sales_goals', null=True, blank=True)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, null=True, blank=True, related_name='sales_goals')
    
    amount_target = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    sales_count_target = models.IntegerField(default=0)
    products_sold_target = models.IntegerField(default=0)
    
    period = models.CharField(max_length=50, choices=GOAL_PERIODS, default='MONTHLY')
    period_name = models.CharField(max_length=100, null=True, blank=True) # e.g. "MONTHLY-2026-03"
    start_date = models.DateTimeField(auto_now_add=True)
    end_date = models.DateTimeField()
    
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='ACTIVE')
    
    current_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    current_sales_count = models.IntegerField(default=0)
    current_products_sold = models.IntegerField(default=0)
    
    notified_at_50 = models.BooleanField(default=False)
    notified_at_80 = models.BooleanField(default=False)
    notified_at_100 = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Sales Goals"

    def __str__(self):
        return f"{self.branch.name if self.branch else 'No Branch'} - {self.period}"


class SaleCategory(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_slc_id)
    name = models.CharField(max_length=200)
    
    agency = models.ForeignKey('core_app.Agency', on_delete=models.CASCADE, related_name='sale_categories', null=True, blank=True)
    branch = models.ForeignKey('core_app.Branch', on_delete=models.CASCADE, related_name='sale_categories', null=True, blank=True)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='sale_categories', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Sale Categories"

    def __str__(self):
        return self.name


class Sale(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'), ('PARTIAL', 'Partial'), 
        ('COMPLETED', 'Completed'), ('CANCELLED', 'Cancelled'), ('REFUNDED', 'Refunded')
    )
    PAYMENT_METHODS = (
        ('CASH', 'Cash'), ('CARD', 'Card'), ('MOBILE_MONEY', 'Mobile Money'), 
        ('BANK_TRANSFER', 'Bank Transfer'), ('CHEQUE', 'Cheque'), ('CREDIT', 'Credit')
    )

    id = models.CharField(max_length=30, primary_key=True, default=gen_sa_id)
    receipt_number = models.CharField(max_length=100, unique=True, null=True, blank=True)
    
    subtotal = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_cost = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    profit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    amount_paid = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    balance_due = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='PENDING')
    payment_method = models.CharField(max_length=50, choices=PAYMENT_METHODS, default='CASH')
    date = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(null=True, blank=True)
    
    agency = models.ForeignKey('core_app.Agency', on_delete=models.CASCADE, related_name='sales', null=True, blank=True)
    branch = models.ForeignKey('core_app.Branch', on_delete=models.CASCADE, related_name='sales', null=True, blank=True)
    customer = models.ForeignKey('customers.Customer', on_delete=models.SET_NULL, null=True, blank=True, related_name='sales')
    
    customer_name = models.CharField(max_length=200, null=True, blank=True)
    customer_phone = models.CharField(max_length=50, null=True, blank=True)
    
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='sales_created', null=True, blank=True)
    category = models.ForeignKey(SaleCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='sales')
    
    discount_reason = models.CharField(max_length=200, null=True, blank=True)
    shipping_cost = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    payment_reference = models.CharField(max_length=200, null=True, blank=True)
    cash_transaction = models.ForeignKey('finance.CashTransaction', on_delete=models.SET_NULL, null=True, blank=True, related_name='sales_records')
    
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_reason = models.TextField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Sales"

    def __str__(self):
        return self.receipt_number or self.id

class SaleItem(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_si_id)
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('inventory.Product', on_delete=models.SET_NULL, null=True, blank=True, related_name='sale_items')
    product_name = models.CharField(max_length=200)
    quantity = models.IntegerField(default=0)
    unit_price = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    subtotal = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    discount_type = models.CharField(max_length=20, default='percentage')
    discount_percentage = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    cost_price = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    agency = models.ForeignKey('core_app.Agency', on_delete=models.CASCADE, related_name='sale_items', null=True, blank=True)
    branch = models.ForeignKey('core_app.Branch', on_delete=models.CASCADE, related_name='sale_items', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Sale Items"

    def __str__(self):
        return self.product_name

class InstallmentPayment(models.Model):
    PAYMENT_STATUS = (('PENDING', 'Pending'), ('COMPLETED', 'Completed'), ('FAILED', 'Failed'), ('REFUNDED', 'Refunded'))
    PAYMENT_METHODS = (
        ('CASH', 'Cash'), ('CARD', 'Card'), ('MOBILE_MONEY', 'Mobile Money'), 
        ('BANK_TRANSFER', 'Bank Transfer'), ('CHEQUE', 'Cheque')
    )
    
    id = models.CharField(max_length=30, primary_key=True, default=gen_ip_id)
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='installments')
    amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    date = models.DateTimeField(auto_now_add=True)
    payment_method = models.CharField(max_length=50, choices=PAYMENT_METHODS)
    reference = models.CharField(max_length=200, null=True, blank=True)
    status = models.CharField(max_length=50, choices=PAYMENT_STATUS, default='COMPLETED')
    notes = models.TextField(null=True, blank=True)
    
    agency = models.ForeignKey('core_app.Agency', on_delete=models.CASCADE, related_name='installment_payments', null=True, blank=True)
    branch = models.ForeignKey('core_app.Branch', on_delete=models.CASCADE, related_name='installment_payments', null=True, blank=True)
    received_by = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='received_payments', null=True, blank=True)
    cash_account = models.ForeignKey('finance.CashAccount', on_delete=models.SET_NULL, null=True, blank=True, related_name='installment_payments')
    cash_transaction = models.ForeignKey('finance.CashTransaction', on_delete=models.SET_NULL, null=True, blank=True, related_name='installment_records')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Installment Payments"

    def __str__(self):
        return f"{self.sale.receipt_number if self.sale else 'Unknown'} - {self.amount}"
