from core.logic.number_generator import NumberingEngine

def get_next_receipt_number(branch_id, increment=False):
    """
    Generates a professional, industry-standard receipt number.
    Format: GZ-{BRANCH}-{YYMM}-{SEQUENCE}
    Example: GZ-KLA-2603-0042
    
    If increment=True, it updates the database counter.
    If increment=False, it previews the next number.
    """
    return NumberingEngine.get_next_number(
        branch_id=branch_id, 
        type_key='sale', 
        prefix='GZ', 
        increment=increment
    )

def generate_receipt_number(branch_id):
    """
    Backward compatible wrapper that increments the counter.
    """
    return get_next_receipt_number(branch_id, increment=True)

def generate_return_number(branch_id):
    """
    Generates a professional return number.
    Format: RET-{BRANCH}-{YYMM}-{SEQUENCE}
    """
    return NumberingEngine.get_next_number(
        branch_id=branch_id, 
        type_key='return', 
        prefix='RET', 
        increment=True
    )
