import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { djangoFetch } from '@/lib/django-client';

function numberToWords(num: number): string {
    const specialNames = ['', 'thousand', 'million', 'billion', 'trillion'];
    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    if (num === 0) return 'zero';

    function convertGroup(n: number): string {
        let res = '';
        if (n >= 100) {
            res += ones[Math.floor(n / 100)] + ' hundred ';
            n %= 100;
        }
        if (n >= 20) {
            res += tens[Math.floor(n / 10)] + ' ';
            n %= 10;
        } else if (n >= 10) {
            res += teens[n - 10] + ' ';
            return res;
        }
        if (n > 0) {
            res += ones[n] + ' ';
        }
        return res;
    }

    let result = '';
    let groupIdx = 0;

    while (num > 0) {
        const group = num % 1000;
        if (group !== 0) {
            result = convertGroup(group) + (specialNames[groupIdx] ? specialNames[groupIdx] + ' ' : '') + result;
        }
        num = Math.floor(num / 1000);
        groupIdx++;
    }

    return result.trim();
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const saleId = searchParams.get('saleId');

    if (!saleId) {
        return NextResponse.json({ error: 'Sale ID is required' }, { status: 400 });
    }

    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const sale = await djangoFetch(`sales/sales/${saleId}/`);

        if (!sale || sale.error) {
            return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
        }

        // AUTHORIZATION
        const userBranchId = (session.user as any).branchId;
        if (userBranchId && userBranchId !== sale.branch) {
            const role = (session.user as any).role?.toLowerCase();
            if (role !== 'superadmin') {
                return NextResponse.json({ error: 'Unauthorized: Branch mismatch' }, { status: 403 });
            }
        }
        
        const branch = await djangoFetch(`core/branches/${sale.branch}/`);

        const items = Array.isArray(sale.items) ? sale.items : [];
        const subtotal = Number(sale.subtotal || 0);
        const taxAmount = Number(sale.tax_amount || 0);
        const total = Number(sale.total || 0);
        const amountPaid = Number(sale.amount_paid || 0);
        const balance = Number(sale.balance || 0);

        const finalData = {
            receiptNumber: sale.sale_number,
            date: sale.date,
            customerName: sale.customer_name,
            customerAddress: sale.customer_address,
            customerPhone: sale.customer_phone,
            paymentStatus: sale.payment_status,
            notes: sale.notes,
            taxRate: Number(sale.tax_rate || 0),
            subtotal,
            taxAmount,
            total,
            amountPaid,
            balance,
            amountInWords: numberToWords(total),
            items: items.map((item: any) => ({
                description: item.description,
                quantity: Number(item.quantity || 0),
                price: Number(item.price || 0),
                discountAmount: Number(item.discount_amount || 0),
                discountPercentage: Number(item.discount_percentage || 0),
                total: (Number(item.quantity || 0) * Number(item.price || 0)) - Number(item.discount_amount || 0)
            })),
            businessSettings: {
                businessName: branch.settings?.business_name || branch.name,
                businessAddress: branch.settings?.address || branch.location,
                businessPhone: branch.settings?.phone || branch.phone,
                businessEmail: branch.settings?.email || branch.email,
                currency: branch.settings?.currency || 'UGX',
                businessLogo: branch.settings?.logo
            }
        };

        return NextResponse.json(finalData);

    } catch (err: any) {
        console.error('API Route Error:', err);
        return NextResponse.json({ error: err?.message || 'Unknown processing error' }, { status: 400 });
    }
}
