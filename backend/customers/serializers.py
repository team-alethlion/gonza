from rest_framework import serializers
from .models import CustomerCategory, Customer, FavoriteCustomer, Ticket, CustomerLedger

class CustomerCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerCategory
        fields = '__all__'

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'

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
