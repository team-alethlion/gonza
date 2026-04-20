import pandas as pd
import io
from datetime import datetime
from django.db import transaction
from ..models import Expense, ExpenseCategory, CashAccount, CashTransaction
from core.utils import to_decimal

def generate_expense_template(branch_id):
    """
    Generates an Excel template with valid categories and accounts as instructions.
    """
    categories = list(ExpenseCategory.objects.filter(branch_id=branch_id).values_list('name', flat=True))
    accounts = list(CashAccount.objects.filter(branch_id=branch_id, is_active=True).values_list('name', flat=True))
    
    df = pd.DataFrame(columns=[
        'Date', 'Amount', 'Description', 'Category', 
        'Payment Method', 'Person In Charge', 'Link to Finance', 'Finance Account'
    ])
    
    # Add sample row
    df.loc[0] = ['2026-04-16', '5000', 'Office Supplies', categories[0] if categories else 'Office', 'Cash', 'Admin', 'TRUE', accounts[0] if accounts else 'Main Cash']
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='Template')
        workbook = writer.book
        worksheet = writer.sheets['Template']
        
        # Add a sheet with instructions/valid values
        instr_df = pd.DataFrame({
            'Valid Categories': categories + ([''] * (max(0, len(accounts) - len(categories)))),
            'Valid Finance Accounts': accounts + ([''] * (max(0, len(categories) - len(accounts))))
        })
        instr_df.to_excel(writer, index=False, sheet_name='ValidValues')
        
    return output.getvalue()

def process_expense_import(file_data, user, branch_id):
    """
    Processes a CSV or Excel import of expenses with a two-phase validation.
    Phase 1: Dry run to validate all data and map accounts.
    Phase 2: Atomic transaction to save only if all rows are valid.
    """
    if hasattr(file_data, 'name') and file_data.name.endswith('.csv'):
        df = pd.read_csv(file_data)
    else:
        df = pd.read_excel(file_data)
    
    df.columns = [c.strip() for c in df.columns]
    
    required_cols = ['Date', 'Amount', 'Description']
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Missing required column: {col}")

    # Pre-fetch accounts for mapping
    accounts_map = {a.name.lower().strip(): a.id for a in CashAccount.objects.filter(branch_id=branch_id, is_active=True)}
    
    validation_errors = []
    validated_rows = []

    # --- Phase 1: Validation ---
    for index, row in df.iterrows():
        row_num = index + 2
        row_errors = []
        
        # 1. Date Validation
        date_val = row.get('Date')
        try:
            if pd.isna(date_val):
                date_val = datetime.now()
            else:
                date_val = pd.to_datetime(date_val)
        except Exception:
            row_errors.append(f"Invalid date format: {date_val}")

        # 2. Amount Validation
        try:
            amount = to_decimal(row.get('Amount', 0))
            if amount <= 0:
                row_errors.append("Amount must be greater than 0")
        except Exception:
            row_errors.append(f"Invalid numeric amount: {row.get('Amount')}")
            amount = 0

        # 3. Description Validation
        description = str(row.get('Description', '')).strip()
        if not description:
            row_errors.append("Description is required")

        # 4. Finance Linking Validation
        link_to_cash = str(row.get('Link to Finance', 'false')).lower() == 'true'
        account_name = str(row.get('Finance Account', '')).lower().strip()
        cash_account_id = None
        
        if link_to_cash:
            if not account_name:
                row_errors.append("Finance Account name is required when 'Link to Finance' is true")
            else:
                cash_account_id = accounts_map.get(account_name)
                if not cash_account_id:
                    row_errors.append(f"Finance Account '{row.get('Finance Account')}' not found or inactive")

        if row_errors:
            validation_errors.append({
                'row': row_num,
                'errors': row_errors
            })
        else:
            validated_rows.append({
                'amount': amount,
                'description': description,
                'category': str(row.get('Category', 'Uncategorized')).strip() or 'Uncategorized',
                'date': date_val,
                'payment_method': str(row.get('Payment Method', 'Cash')).strip() or 'Cash',
                'person_in_charge': str(row.get('Person In Charge', '')).strip(),
                'cash_account_id': cash_account_id
            })

    # If ANY validation errors, return them all and skip saving
    if validation_errors:
        return {
            'success': False,
            'total': len(df),
            'error_count': len(validation_errors),
            'errors': validation_errors
        }

    # --- Phase 2: Atomic Save ---
    try:
        with transaction.atomic():
            for data in validated_rows:
                cash_tx = None
                
                # 1. Create Cash Transaction first if linked
                if data['cash_account_id']:
                    cash_tx = CashTransaction.objects.create(
                        user_id=user.id,
                        branch_id=branch_id,
                        account_id=data['cash_account_id'],
                        amount=data['amount'],
                        transaction_type='cash_out',
                        category=data['category'],
                        description=f"Imported Expense: {data['description']}",
                        person_in_charge=data['person_in_charge'],
                        date=data['date'],
                        payment_method=data['payment_method'],
                        reference_type='EXPENSE'
                    )

                # 2. Create Expense with linked transaction
                expense = Expense.objects.create(
                    amount=data['amount'],
                    description=data['description'],
                    category=data['category'],
                    date=data['date'],
                    payment_method=data['payment_method'],
                    person_in_charge=data['person_in_charge'],
                    branch_id=branch_id,
                    agency_id=user.agency_id,
                    user_id=user.id,
                    cash_account_id=data['cash_account_id'],
                    cash_transaction=cash_tx
                )
                
                # 3. Update the reference_id on the transaction now that we have the expense ID
                if cash_tx:
                    cash_tx.reference_id = expense.id
                    cash_tx.save(update_fields=['reference_id'])

    except Exception as e:
        return {
            'success': False,
            'error': f"Database error during import: {str(e)}"
        }

    return {
        'success': True,
        'total': len(df),
        'inserted': len(validated_rows)
    }
