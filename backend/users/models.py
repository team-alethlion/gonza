from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils.translation import gettext_lazy as _
from core.utils import gen_us_id, gen_ro_id, gen_pe_id, gen_pt_id, gen_dr_id, gen_ev_id

class Role(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_ro_id)
    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    branch = models.ForeignKey('core_app.Branch', on_delete=models.CASCADE, null=True, blank=True, related_name='roles')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('branch', 'name')
        
    def __str__(self):
        return self.name

class Permission(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_pe_id)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(null=True, blank=True)
    roles = models.ManyToManyField(Role, related_name='permissions')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    username = None # Remove username field, use email as unique identifier
    email = models.EmailField(_('email address'), unique=True)
    
    # Custom fields mapping from Prisma User
    id = models.CharField(max_length=30, primary_key=True, default=gen_us_id)
    phone = models.CharField(max_length=20, null=True, blank=True)
    user_metadata = models.JSONField(null=True, blank=True, default=dict)
    password_reset_required = models.BooleanField(default=False)
    is_onboarded = models.BooleanField(default=False)
    
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
        ('SUSPENDED', 'Suspended'),
        ('EXPIRED', 'Expired'),
    ]
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ACTIVE')
    image = models.URLField(max_length=500, null=True, blank=True)
    
    # These are required links set on creation
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, related_name='users')
    agency = models.ForeignKey('core_app.Agency', on_delete=models.CASCADE, related_name='users', null=True, blank=True)
    branch = models.ForeignKey('core_app.Branch', on_delete=models.SET_NULL, null=True, related_name='users')
    
    credits = models.IntegerField(default=0)
    pin = models.CharField(max_length=4, null=True, blank=True)
    default_thank_you_template_id = models.CharField(max_length=30, null=True, blank=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    @property
    def name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.email

    def __str__(self):
        return self.email

class PasswordResetToken(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_pt_id)
    email = models.EmailField()
    token = models.CharField(max_length=200, unique=True)
    expires = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('email', 'token')

class DeletionRequest(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_dr_id)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='deletion_requests')
    reason = models.TextField()
    status = models.CharField(max_length=50, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

class EmailVerification(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_ev_id)
    email = models.EmailField(unique=True)
    code = models.CharField(max_length=10)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
