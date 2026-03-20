from django.db import models
from core.utils import gen_cc_id, gen_cu_id, gen_fc_id, gen_tk_id

class CustomerCategory(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_cc_id)
    name = models.CharField(max_length=200)
    is_default = models.BooleanField(default=False)
    
    agency = models.ForeignKey('core_app.Agency', on_delete=models.CASCADE, related_name='customer_categories', null=True, blank=True)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='customer_categories', null=True, blank=True)
    branch = models.ForeignKey('core_app.Branch', on_delete=models.CASCADE, related_name='customer_categories', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('branch', 'name')
        verbose_name_plural = "Customer Categories"

    def __str__(self):
        return self.name

class Customer(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_cu_id)
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=50, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    
    agency = models.ForeignKey('core_app.Agency', on_delete=models.CASCADE, related_name='customers', null=True, blank=True)
    branch = models.ForeignKey('core_app.Branch', on_delete=models.CASCADE, related_name='customers', null=True, blank=True)
    admin = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='customers', null=True, blank=True)
    
    birthday = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, null=True, blank=True)
    category = models.ForeignKey(CustomerCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='customers')
    tags = models.JSONField(default=list, blank=True)
    social_media = models.JSONField(null=True, blank=True, default=dict)
    
    avatar = models.URLField(max_length=500, null=True, blank=True)
    source = models.CharField(max_length=100, default="System")
    timezone = models.CharField(max_length=100, default="UTC")
    language = models.CharField(max_length=100, default="English")
    assignee = models.CharField(max_length=200, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Customers"

    def __str__(self):
        return self.name

class FavoriteCustomer(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_fc_id)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='favorite_customers')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='favorited_by')
    agency = models.ForeignKey('core_app.Agency', on_delete=models.CASCADE, related_name='favorite_customers', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'customer')
        verbose_name_plural = "Favorite Customers"

    def __str__(self):
        return f"{self.user.email} - {self.customer.name}"

class Ticket(models.Model):
    TICKET_TYPES = (('Question', 'Question'), ('Bug', 'Bug'), ('Feature', 'Feature'))
    TICKET_PRIORITIES = (('High', 'High'), ('Medium', 'Medium'), ('Low', 'Low'))
    TICKET_STATUSES = (('Open', 'Open'), ('Closed', 'Closed'), ('Pending', 'Pending'))

    id = models.CharField(max_length=30, primary_key=True, default=gen_tk_id)
    title = models.CharField(max_length=200)
    description = models.TextField(null=True, blank=True)
    type = models.CharField(max_length=20, choices=TICKET_TYPES, default='Question')
    priority = models.CharField(max_length=20, choices=TICKET_PRIORITIES, default='Medium')
    status = models.CharField(max_length=20, choices=TICKET_STATUSES, default='Open')
    
    agency = models.ForeignKey('core_app.Agency', on_delete=models.CASCADE, related_name='tickets', null=True, blank=True)
    branch = models.ForeignKey('core_app.Branch', on_delete=models.CASCADE, related_name='tickets', null=True, blank=True)
    assigned_to = models.CharField(max_length=200, null=True, blank=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='tickets')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Tickets"

    def __str__(self):
        return self.title
