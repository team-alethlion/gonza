from rest_framework import serializers
from .models import (
    CashAccount, CashTransaction, ExpenseCategory, Expense, Transaction,
    CarriageInward
)

class CashAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = CashAccount
        fields = '__all__'

class CashTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CashTransaction
        fields = '__all__'

class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = '__all__'

class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = '__all__'

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get('request')
        
        # 🛡️ SECURITY: Amount-level permission masking
        if request and request.user and request.user.is_authenticated:
            if not request.user.has_permission('dashboard.view_total_expenses'):
                ret['amount'] = None
                
        return ret

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = '__all__'

class CarriageInwardSerializer(serializers.ModelSerializer):
    class Meta:
        model = CarriageInward
        fields = '__all__'
