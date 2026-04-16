from rest_framework import serializers
from .models import CustomerCategory, Customer, FavoriteCustomer, Ticket, CustomerLedger

class CustomerCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerCategory
        fields = '__all__'

class CustomerSerializer(serializers.ModelSerializer):
    lifetime_value = serializers.DecimalField(source='total_spent', max_digits=20, decimal_places=2, read_only=True)
    
    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'phone', 'email', 'address', 'city', 'notes',
            'agency', 'branch', 'admin', 'birthday', 'gender', 'category',
            'tags', 'social_media', 'avatar', 'source', 'timezone',
            'language', 'assignee', 'credit_limit', 'total_spent', 'lifetime_value', 'order_count',
            'created_at', 'updated_at'
        ]

class FavoriteCustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = FavoriteCustomer
        fields = '__all__'

class TicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = '__all__'

class CustomerLedgerSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerLedger
        fields = '__all__'
