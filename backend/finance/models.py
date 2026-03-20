from django.db import models
from core.utils import gen_ac_id, gen_ct_id, gen_ec_id, gen_ex_id, gen_tx_id, gen_ci_id

class CashAccount(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_ac_id)
    name = models.CharField(max_length=200)
    description = models.TextField(null=True, blank=True)
    initial_balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    current_balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    agency = models.ForeignKey('core_app.Agency', on_delete=models.CASCADE, related_name='cash_accounts', null=True, blank=True)
    branch = models.ForeignKey('core_app.Branch', on_delete=models.CASCADE, related_name='cash_accounts', null=True, blank=True)
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='cash_accounts')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Cash Accounts"

    def __str__(self):
        return self.name

class CashTransaction(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_ct_id)
    amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    transaction_type = models.CharField(max_length=50) # "cash_in", "cash_out", "transfer_in", "transfer_out"
    category = models.CharField(max_length=100, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    person_in_charge = models.CharField(max_length=200, null=True, blank=True)
    tags = models.JSONField(default=list, blank=True)
    date = models.DateTimeField(auto_now_add=True)
    payment_method = models.CharField(max_length=100, null=True, blank=True)
    receipt_image = models.URLField(max_length=500, null=True, blank=True)

    agency = models.ForeignKey('core_app.Agency', on_delete=models.CASCADE, related_name='cash_transactions', null=True, blank=True)
    account = models.ForeignKey(CashAccount, on_delete=models.CASCADE, related_name='transactions')
    branch = models.ForeignKey('core_app.Branch', on_delete=models.CASCADE, related_name='cash_transactions', null=True, blank=True)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='cash_transactions', null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Cash Transactions"

    def __str__(self):
        return f"{self.transaction_type} - {self.amount}"

class ExpenseCategory(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_ec_id)
    name = models.CharField(max_length=200)
    is_default = models.BooleanField(default=False)
    
    agency = models.ForeignKey('core_app.Agency', on_delete=models.CASCADE, related_name='expense_categories', null=True, blank=True)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='expense_categories', null=True, blank=True)
    branch = models.ForeignKey('core_app.Branch', on_delete=models.CASCADE, related_name='expense_categories', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('branch', 'name')
        verbose_name_plural = "Expense Categories"

    def __str__(self):
        return self.name

class Expense(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_ex_id)
    amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    description = models.TextField()
    category = models.CharField(max_length=200)
    date = models.DateTimeField(auto_now_add=True)
    payment_method = models.CharField(max_length=100, null=True, blank=True)
    reference = models.CharField(max_length=200, null=True, blank=True)

    agency = models.ForeignKey('core_app.Agency', on_delete=models.CASCADE, related_name='expenses', null=True, blank=True)
    branch = models.ForeignKey('core_app.Branch', on_delete=models.CASCADE, related_name='expenses', null=True, blank=True)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='expenses', null=True, blank=True)

    receipt_image = models.URLField(max_length=500, null=True, blank=True)
    
    cash_account = models.ForeignKey(CashAccount, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    cash_transaction = models.ForeignKey(CashTransaction, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Expenses"

    def __str__(self):
        return f"{self.category} - {self.amount}"


class Transaction(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_tx_id)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='transactions')
    agency = models.ForeignKey('core_app.Agency', on_delete=models.CASCADE, related_name='transactions', null=True, blank=True)
    amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default="UGX")
    status = models.CharField(max_length=50, default="pending") # "pending", "completed", "failed"
    pesapal_order_tracking_id = models.CharField(max_length=200, unique=True, null=True, blank=True)
    pesapal_merchant_reference = models.CharField(max_length=200, unique=True)
    description = models.TextField(null=True, blank=True)

    type = models.CharField(max_length=50, default="topup") # "topup" | "subscription"
    package_id = models.CharField(max_length=100, null=True, blank=True)
    billing_cycle = models.CharField(max_length=50, null=True, blank=True) # "monthly" | "yearly"

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Transactions"

    def __str__(self):
        return self.pesapal_merchant_reference

class CarriageInward(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_ci_id)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='carriage_inwards', null=True, blank=True)
    agency = models.ForeignKey('core_app.Agency', on_delete=models.CASCADE, related_name='carriage_inwards', null=True, blank=True)
    branch = models.ForeignKey('core_app.Branch', on_delete=models.CASCADE, related_name='carriage_inwards', null=True, blank=True)
    supplier_name = models.CharField(max_length=200)
    details = models.TextField(null=True, blank=True)
    amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    date = models.DateTimeField(auto_now_add=True)
    cash_account = models.ForeignKey(CashAccount, on_delete=models.SET_NULL, null=True, blank=True)
    cash_transaction = models.ForeignKey(CashTransaction, on_delete=models.SET_NULL, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Carriage Inwards"

    def __str__(self):
        return f"{self.supplier_name} - {self.amount}"
