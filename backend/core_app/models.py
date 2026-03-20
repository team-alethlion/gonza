from django.db import models
from core.utils import gen_pa_id, gen_ag_id, gen_br_id, gen_bc_id, gen_bs_id, gen_sc_id, gen_st_id, gen_tc_id, gen_ta_id, gen_ah_id

class Package(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_pa_id)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(null=True, blank=True)
    
    monthly_price = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    yearly_price = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    max_users = models.IntegerField(default=5)
    unlimited_users = models.BooleanField(default=False)
    
    max_sales_per_month = models.IntegerField(default=100)
    unlimited_sales = models.BooleanField(default=False)
    
    max_products = models.IntegerField(default=50)
    unlimited_products = models.BooleanField(default=False)
    
    max_locations = models.IntegerField(default=1)
    unlimited_locations = models.BooleanField(default=False)
    
    max_customers = models.IntegerField(default=100)
    unlimited_customers = models.BooleanField(default=False)

    has_free_trial = models.BooleanField(default=False)
    trial_days = models.IntegerField(default=14)
    features = models.JSONField(null=True, blank=True, default=dict)
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Packages"

    def __str__(self):
        return self.name

class Agency(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_ag_id)
    name = models.CharField(max_length=200)
    subscription_status = models.CharField(max_length=20, default='expired')
    had_trial_before = models.BooleanField(default=False)
    trial_end_date = models.DateTimeField(null=True, blank=True)
    subscription_expiry = models.DateTimeField(null=True, blank=True)
    is_unlimited_usage = models.BooleanField(default=False)
    is_onboarded = models.BooleanField(default=False)

    package = models.ForeignKey(Package, on_delete=models.SET_NULL, null=True, blank=True, related_name='agencies')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Agencies"

    def __str__(self):
        return self.name


class Branch(models.Model):
    BRANCH_TYPES = [
        ('MAIN', 'Main'),
        ('SUB', 'Sub'),
    ]

    id = models.CharField(max_length=30, primary_key=True, default=gen_br_id)
    name = models.CharField(max_length=200)
    location = models.CharField(max_length=200, default='Default Location')
    phone = models.CharField(max_length=20, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    type = models.CharField(max_length=10, choices=BRANCH_TYPES, default='SUB')
    access_password = models.CharField(max_length=255, null=True, blank=True)

    agency = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name='branches', null=True, blank=True)
    admin = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='admin_branches', null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('agency', 'name')
        verbose_name_plural = "Branches"

    def __str__(self):
        return f"{self.name} ({self.agency.name if self.agency else 'No Agency'})"

class BranchCounter(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_bc_id)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='counters')
    type = models.CharField(max_length=50) # e.g. 'product', 'sale', 'expense'
    count = models.IntegerField(default=0)
    
    class Meta:
        unique_together = ('branch', 'type')
        verbose_name_plural = "Branch Counters"

class BranchSettings(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_bs_id)
    branch = models.OneToOneField(Branch, on_delete=models.CASCADE, related_name='settings')

    logo = models.URLField(max_length=500, null=True, blank=True)
    signature_image = models.URLField(max_length=500, null=True, blank=True)
    enable_signature = models.BooleanField(default=False)

    business_name = models.CharField(max_length=200, null=True, blank=True)
    address = models.CharField(max_length=200, null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    website = models.URLField(null=True, blank=True)

    currency = models.CharField(max_length=10, default='UGX')
    needs_onboarding = models.BooleanField(default=True)
    metadata = models.JSONField(null=True, blank=True, default=dict)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Branch Settings"

    def __str__(self):
        return f"Settings for {self.branch.name}"

class SystemConfig(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_sc_id)
    key = models.CharField(max_length=100, unique=True)
    value = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name_plural = "System Configs"

    def __str__(self):
        return self.key

class SubscriptionTransaction(models.Model):
    id = models.CharField(max_length=100, primary_key=True, default=gen_st_id)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='subscription_transactions', null=True, blank=True)
    agency = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name='subscription_transactions', null=True, blank=True)
    package = models.ForeignKey(Package, on_delete=models.SET_NULL, null=True, blank=True)
    
    amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    type = models.CharField(max_length=50, default='subscription')
    billing_cycle = models.CharField(max_length=50, default='monthly') 
    status = models.CharField(max_length=50, default='pending')
    
    pesapal_merchant_reference = models.CharField(max_length=100, null=True, blank=True)
    pesapal_order_tracking_id = models.CharField(max_length=100, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Subscription Transactions"

class TaskCategory(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_tc_id)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='task_categories')
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='task_categories')
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('branch', 'name')
        verbose_name_plural = "Task Categories"

class Task(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_ta_id)
    created_by = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='tasks_created')
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=200)
    description = models.TextField(null=True, blank=True)
    priority = models.CharField(max_length=50, default='medium')
    due_date = models.DateTimeField()
    category = models.CharField(max_length=100, null=True, blank=True)
    
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    reminder_enabled = models.BooleanField(default=False)
    reminder_time = models.CharField(max_length=50, null=True, blank=True)
    
    is_recurring = models.BooleanField(default=False)
    recurrence_type = models.CharField(max_length=50, null=True, blank=True)
    recurrence_end_date = models.DateTimeField(null=True, blank=True)
    parent_task_id = models.CharField(max_length=30, null=True, blank=True)
    recurrence_count = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Tasks"

class ActivityHistory(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_ah_id)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='activity_logs')
    agency = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name='activity_logs', null=True, blank=True)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='activity_logs', null=True, blank=True)
    
    activity_type = models.CharField(max_length=100)
    module = models.CharField(max_length=100)
    
    entity_type = models.CharField(max_length=100)
    entity_id = models.CharField(max_length=100, null=True, blank=True)
    entity_name = models.CharField(max_length=200)
    description = models.TextField()
    
    metadata = models.JSONField(null=True, blank=True, default=dict)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Activity Histories"
