from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.units import mm
import io

class BaseReport:
    def __init__(self, buffer, title="Report"):
        self.buffer = buffer
        self.doc = SimpleDocTemplate(
            self.buffer,
            pagesize=A4,
            rightMargin=15*mm,
            leftMargin=15*mm,
            topMargin=20*mm,
            bottomMargin=15*mm
        )
        self.styles = getSampleStyleSheet()
        self.title = title
        
        # Custom styles
        self.styles.add(ParagraphStyle(
            name='Center',
            alignment=1,
            fontSize=10,
            leading=12
        ))
        self.styles.add(ParagraphStyle(
            name='Right',
            alignment=2,
            fontSize=10,
            leading=12
        ))
        self.styles.add(ParagraphStyle(
            name='Heading1Center',
            parent=self.styles['Heading1'],
            alignment=1,
            spaceAfter=12
        ))

    def _get_business_header(self, agency_name, address=None, phone=None, logo_path=None):
        elements = []
        
        if logo_path:
            try:
                img = Image(logo_path, width=40*mm, height=15*mm, kind='proportional')
                img.hAlign = 'LEFT'
                elements.append(img)
            except:
                pass
        
        header_text = f"<b>{agency_name}</b><br/>"
        if address:
            header_text += f"{address}<br/>"
        if phone:
            header_text += f"Phone: {phone}"
            
        elements.append(Paragraph(header_text, self.styles['Right']))
        elements.append(Spacer(1, 10*mm))
        
        elements.append(Paragraph(self.title.upper(), self.styles['Heading1Center']))
        elements.append(Spacer(1, 5*mm))
        
        return elements

    def draw_table(self, data, col_widths=None):
        table = Table(data, colWidths=col_widths)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        return table

def generate_pdf_response(elements, filename, buffer=None):
    from django.http import HttpResponse
    if not buffer:
        buffer = io.BytesIO()
    
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    doc.build(elements)
    
    buffer.seek(0)
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}.pdf"'
    response.write(buffer.getvalue())
    return response

class ReceiptGenerator(BaseReport):
    def generate(self, sale):
        agency = sale.agency
        elements = self._get_business_header(
            agency_name=agency.name if agency else "Gonza System",
            address=agency.address if agency else "",
            phone=agency.phone if agency else ""
        )
        
        # Receipt Details
        details_text = f"<b>Receipt #:</b> {sale.receipt_number}<br/>"
        details_text += f"<b>Date:</b> {sale.date.strftime('%Y-%m-%d %H:%M')}<br/>"
        details_text += f"<b>Customer:</b> {sale.customer_name}<br/>"
        details_text += f"<b>Status:</b> {sale.status}"
        
        elements.append(Paragraph(details_text, self.styles['Normal']))
        elements.append(Spacer(1, 10))
        
        # Items Table
        table_data = [['Description', 'Qty', 'Unit Price', 'Total']]
        for item in sale.items.all():
            table_data.append([
                item.product_name,
                str(item.quantity),
                f"{item.unit_price:,.2f}",
                f"{item.total:,.2f}"
            ])
            
        elements.append(self.draw_table(table_data, col_widths=[80*mm, 20*mm, 40*mm, 40*mm]))
        elements.append(Spacer(1, 10))
        
        # Totals
        totals_text = f"<b>Subtotal:</b> {sale.subtotal:,.2f}<br/>"
        if sale.discount_amount > 0:
            totals_text += f"<b>Discount:</b> -{sale.discount_amount:,.2f}<br/>"
        if sale.tax_amount > 0:
            totals_text += f"<b>Tax:</b> {sale.tax_amount:,.2f}<br/>"
        totals_text += f"<b>TOTAL: {sale.total_amount:,.2f}</b><br/>"
        totals_text += f"<b>Amount Paid:</b> {sale.amount_paid:,.2f}<br/>"
        totals_text += f"<b>Balance Due:</b> {sale.balance_due:,.2f}"
        
        elements.append(Paragraph(totals_text, self.styles['Right']))
        return elements

class StockSummaryGenerator(BaseReport):
    def generate(self, products, branch_name):
        agency = products.first().agency if products.exists() else None
        elements = self._get_business_header(
            agency_name=agency.name if agency else "Gonza System",
            address=agency.address if agency else "",
            phone=agency.phone if agency else ""
        )
        
        elements.append(Paragraph(f"<b>Branch:</b> {branch_name}", self.styles['Normal']))
        elements.append(Spacer(1, 10))
        
        table_data = [['Product Name', 'SKU', 'Stock', 'Selling Price']]
        for p in products:
            table_data.append([
                p.name,
                p.sku or '-',
                str(p.stock),
                f"{p.selling_price:,.0f}"
            ])
            
        elements.append(self.draw_table(table_data, col_widths=[70*mm, 40*mm, 30*mm, 40*mm]))
        return elements

class SalesReportGenerator(BaseReport):
    def generate(self, sales, period_label):
        agency = sales.first().agency if sales.exists() else None
        elements = self._get_business_header(
            agency_name=agency.name if agency else "Gonza System",
            address=agency.address if agency else "",
            phone=agency.phone if agency else ""
        )
        
        elements.append(Paragraph(f"<b>Sales Report:</b> {period_label}", self.styles['Normal']))
        elements.append(Spacer(1, 10))
        
        table_data = [['Date', 'Receipt #', 'Customer', 'Total']]
        total_sum = Decimal('0')
        
        for s in sales:
            total_sum += s.total_amount
            table_data.append([
                s.date.strftime('%Y-%m-%d'),
                s.receipt_number,
                s.customer_name[:20] + '..' if len(s.customer_name) > 20 else s.customer_name,
                f"{s.total_amount:,.2f}"
            ])
            
        elements.append(self.draw_table(table_data, col_widths=[30*mm, 40*mm, 70*mm, 40*mm]))
        elements.append(Spacer(1, 10))
        
        summary_text = f"<b>Total Sales: {total_sum:,.2f}</b><br/>"
        summary_text += f"<b>Count:</b> {sales.count()}"
        
        elements.append(Paragraph(summary_text, self.styles['Right']))
        return elements

class ProfitLossGenerator(BaseReport):
    def generate(self, data, period_label):
        agency = data.get('agency')
        elements = self._get_business_header(
            agency_name=agency.name if agency else "Gonza System",
            address=agency.address if agency else "",
            phone=agency.phone if agency else ""
        )
        
        elements.append(Paragraph(f"<b>Profit & Loss Report:</b> {period_label}", self.styles['Normal']))
        elements.append(Spacer(1, 10))
        
        total_sales = data.get('total_sales', Decimal('0'))
        total_expenses = data.get('total_expenses', Decimal('0'))
        net_profit = total_sales - total_expenses
        
        table_data = [
            ['Description', 'Income', 'Expense', 'Balance'],
            ['Total Sales', f"{total_sales:,.2f}", '-', f"{total_sales:,.2f}"],
            ['Total Expenses', '-', f"{total_expenses:,.2f}", f"-{total_expenses:,.2f}"],
            ['NET PROFIT/LOSS', '', '', f"<b>{net_profit:,.2f}</b>"]
        ]
        
        elements.append(self.draw_table(table_data, col_widths=[70*mm, 40*mm, 40*mm, 40*mm]))
        
        if net_profit > 0:
            elements.append(Paragraph("<br/><b>Status: profitable</b>", self.styles['Normal']))
        else:
            elements.append(Paragraph("<br/><b>Status: loss/break-even</b>", self.styles['Normal']))
            
        return elements
