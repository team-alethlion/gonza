"use client";
import React, { useState } from 'react';
import { MessageSquare, CheckCircle, XCircle, Clock, Send } from 'lucide-react';

interface Message {
    id: string;
    content: string;
    phone_number?: string;
    phoneNumber?: string;
    sms_credits_used?: number;
    smsCreditsUsed?: number;
    status: string;
    sent_at?: string;
    sentAt?: string;
    created_at?: string;
    createdAt?: string;
}

interface UsageHistoryTableProps {
    messages: Message[];
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

const UsageHistoryTable: React.FC<UsageHistoryTableProps> = ({ messages }) => {
    const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);

    const getStatusBadge = (status: string) => {
        switch (status.toLowerCase()) {
            case 'sent':
            case 'delivered':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3" />
                        {status === 'delivered' ? 'Delivered' : 'Sent'}
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

    const truncateMessage = (content: string, maxLength: number = 50) => {
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + '...';
    };

    if (messages.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow border p-8 text-center">
                <Send className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No Usage History</h3>
                <p className="text-sm text-gray-500">Your sent messages will appear here.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow border overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Usage History
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date Sent
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Phone Number
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Message
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Credits Used
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {messages.map((message) => {
                            const creditsUsed = message.sms_credits_used || message.smsCreditsUsed || 0;
                            return (
                                <tr key={message.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatDate(message.sent_at || message.sentAt || message.created_at || message.createdAt || '')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {message.phone_number || message.phoneNumber || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                                        <div>
                                            {expandedMessageId === message.id ? (
                                                <div className="whitespace-pre-wrap">
                                                    {message.content}
                                                    <button
                                                        onClick={() => setExpandedMessageId(null)}
                                                        className="text-blue-600 hover:text-blue-800 ml-2 text-xs"
                                                    >
                                                        Show less
                                                    </button>
                                                </div>
                                            ) : (
                                                <div>
                                                    {truncateMessage(message.content)}
                                                    {message.content.length > 50 && (
                                                        <button
                                                            onClick={() => setExpandedMessageId(message.id)}
                                                            className="text-blue-600 hover:text-blue-800 ml-2 text-xs"
                                                        >
                                                            Show more
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {creditsUsed} credit{creditsUsed > 1 ? 's' : ''}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(message.status)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UsageHistoryTable;
