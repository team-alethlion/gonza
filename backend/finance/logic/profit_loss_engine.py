from decimal import Decimal
from core.utils import to_decimal
from .calculators.revenue import RevenueCalculator
from .calculators.cogs import COGSCalculator
from .calculators.expenses import ExpenseCalculator

class ProfitLossEngine:
    """
    🧮 PROFIT & LOSS ENGINE
    
    A centralized module to calculate high-precision financial metrics.
    Ensures that "Revenue", "COGS", and "Gross Profit" are calculated 
    consistently across the entire platform.
    """

    def __init__(self, branch_id, start_date, end_date):
        self.branch_id = branch_id
        self.start_date = start_date
        self.end_date = end_date
        
        self.revenue_calc = RevenueCalculator(branch_id, start_date, end_date)
        self.cogs_calc = COGSCalculator(branch_id, start_date, end_date)
        self.expense_calc = ExpenseCalculator(branch_id, start_date, end_date)

    def get_full_report(self, tax_percentage=0, basis='accrual'):
        """
        Generates the definitive P&L dictionary for a specific branch and period.
        """
        if not self.branch_id:
            return {}

        # 1. & 2. Revenue and Returns Calculation
        rev_data = self.revenue_calc.calculate(basis=basis)
        
        # 3. COST OF GOODS SOLD (COGS)
        cogs_data = self.cogs_calc.calculate()
        
        # 4. GROSS PROFIT
        gross_profit = rev_data['net_revenue'] - cogs_data['net_cogs']

        # 5. OPERATING EXPENSES
        exp_data = self.expense_calc.calculate()
        total_expenses = exp_data['total']
        expenses_dict = exp_data['breakdown']

        # 6. NET PROFIT
        net_profit_loss = gross_profit - total_expenses
        
        # 7. TAXATION (Calculated on Net Profit if positive)
        tax_dec = Decimal(str(tax_percentage))
        tax_amount = (net_profit_loss * tax_dec / Decimal('100')) if net_profit_loss > 0 else Decimal('0.00')
        final_profit = net_profit_loss - tax_amount

        return {
            "period": {
                "start": self.start_date.isoformat(),
                "end": self.end_date.isoformat()
            },
            "revenue": {
                "turnover": float(rev_data['turnover']),
                "salesReturns": float(rev_data['returns']),
                "netSales": float(rev_data['net_revenue']),
                "salesCount": rev_data['sales_count'],
                "returnsCount": rev_data['returns_count']
            },
            "cogs": {
                "grossCostSales": float(cogs_data['gross_cost']),
                "costOfReturns": float(cogs_data['return_cost']),
                "carriageInwards": float(cogs_data['carriage']),
                "totalCOGS": float(cogs_data['net_cogs'])
            },
            "profitability": {
                "grossProfit": float(gross_profit),
                "netProfitLoss": float(net_profit_loss),
                "taxAmount": float(tax_amount),
                "finalProfitAfterTax": float(final_profit),
                "grossMargin": float((gross_profit / rev_data['net_revenue'] * 100)) if rev_data['net_revenue'] > 0 else 0,
                "netMargin": float((net_profit_loss / rev_data['net_revenue'] * 100)) if rev_data['net_revenue'] > 0 else 0
            },
            "expenses": {
                "total": float(total_expenses),
                "breakdown": expenses_dict
            }
        }
