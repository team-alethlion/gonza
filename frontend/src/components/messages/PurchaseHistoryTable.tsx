import React from 'react';
import { CreditCard, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Purchase {
    id: string;
    credits_amount?: number;
    creditsAmount?: number;
    total_cost?: number;
    totalCost?: number;
    payment_phone_number?: string;
    paymentPhoneNumber?: string;
    payment_status?: string;
    paymentStatus?: string;
    payment_method?: string;
    paymentMethod?: string;
    created_at?: string;
    createdAt?: string;
}

interface PurchaseHistoryTableProps {
    purchases: Purchase[];
}

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const PurchaseHistoryTable: React.FC<PurchaseHistoryTableProps> = ({ purchases }) => {
    const getStatusBadge = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3" />
                        Completed
                    </span>
                );
            case 'pending':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Clock className="w-3 h-3" />
                        Pending
                    </span>
                );
            case 'failed':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircle className="w-3 h-3" />
                        Failed
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {status}
                    </span>
                );
        }
    };

    if (purchases.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow border p-8 text-center">
                <CreditCard className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No Purchase History</h3>
                <p className="text-sm text-gray-500">Your credit purchase history will appear here.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow border overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Purchase History
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Credits
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Total Cost
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Payment Phone
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Payment Method
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {purchases.map((purchase) => (
                            <tr key={purchase.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {formatDate(purchase.created_at || purchase.createdAt || '')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {(purchase.credits_amount || purchase.creditsAmount || 0).toLocaleString()} credits
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    UGX {(purchase.total_cost || purchase.totalCost || 0).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    {purchase.payment_phone_number || purchase.paymentPhoneNumber || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {getStatusBadge(purchase.payment_status || purchase.paymentStatus || 'pending')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    {purchase.payment_method || purchase.paymentMethod || '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PurchaseHistoryTable;
