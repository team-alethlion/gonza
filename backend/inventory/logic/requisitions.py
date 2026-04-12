from decimal import Decimal
from django.db.models import Sum, F
from inventory.models import Product, Requisition, RequisitionItem
from core_app.pdf_utils import BaseReport, mm, colors, Table, TableStyle, Paragraph, Spacer

def get_low_stock_items(branch_id):
    """
    Returns products that are at or below their minimum stock threshold.
    Highly optimized for the frontend alerts.
    """
    return Product.objects.filter(
        branch_id=branch_id,
        stock__lte=F('min_stock')
    ).values('id', 'name', 'stock', 'min_stock', 'sku')

def calculate_requisition_total(requisition_id):
    """
    Calculates the total estimated cost of a requisition based on its items
    and the current cost prices of those products in the database.
    """
    items = RequisitionItem.objects.filter(requisition_id=requisition_id)
    total = Decimal('0')
    
    for item in items:
        if item.product:
            total += item.product.cost_price * item.quantity
            
    return total

class RequisitionPDFGenerator(BaseReport):
    def generate(self, requisition):
        from core_app.models import BranchSettings
        
        branch = requisition.branch
        settings = BranchSettings.objects.filter(branch=branch).first()
        
        agency_name = settings.business_name if settings and settings.business_name else (branch.name if branch else "Gonza System")
        address = settings.address if settings and settings.address else (branch.location if branch else "")
        phone = settings.phone if settings and settings.phone else (branch.phone if branch else "")
        currency = settings.currency if settings else "UGX"

        elements = self._get_business_header(
            agency_name=agency_name,
            address=address,
            phone=phone
        )
        
        # Requisition Details
        elements.append(Paragraph(f"<b>Requisition #:</b> {requisition.requisition_number}", self.styles['Normal']))
        elements.append(Paragraph(f"<b>Date:</b> {requisition.date.strftime('%d/%m/%Y')}", self.styles['Normal']))
        elements.append(Paragraph(f"<b>Status:</b> {requisition.status}", self.styles['Normal']))
        
        if requisition.title:
            elements.append(Paragraph(f"<b>Title:</b> {requisition.title}", self.styles['Normal']))
            
        elements.append(Spacer(1, 10*mm))
        
        # Items Table
        table_data = [['#', 'Item Description', 'SKU', 'Qty', 'Unit Cost', 'Amount']]
        total_amount = Decimal('0')
        
        for i, item in enumerate(requisition.items.all()):
            cost = item.product.cost_price if item.product else Decimal('0')
            line_total = cost * item.quantity
            total_amount += line_total
            
            table_data.append([
                str(i + 1),
                item.product_name,
                item.sku or '-',
                str(item.quantity),
                f"{cost:,.0f}",
                f"{line_total:,.0f}"
            ])
            
        elements.append(self.draw_table(table_data, col_widths=[10*mm, 70*mm, 30*mm, 20*mm, 25*mm, 25*mm]))
        elements.append(Spacer(1, 5*mm))
        
        # Summary
        summary_text = f"<b>Total Items:</b> {requisition.items.count()}<br/>"
        summary_text += f"<b>Estimated Total: {currency} {total_amount:,.0f}</b>"
        elements.append(Paragraph(summary_text, self.styles['Right']))
        
        if requisition.notes:
            elements.append(Spacer(1, 10*mm))
            elements.append(Paragraph(f"<b>Notes:</b> {requisition.notes}", self.styles['Normal']))
            
        return elements
