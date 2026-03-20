"use client";
import React from 'react';
import { Search, Filter, MessageSquare } from 'lucide-react';
import { Message } from '@/hooks/useMessages';
import { Customer } from '@/hooks/useCustomers';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MessageContentProps {
  messages: Message[];
  customers: Customer[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
}

const MessageContent = ({
  messages,
  customers,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter
}: MessageContentProps) => {

  const getCustomer = (customerId?: string) => {
    if (!customerId) return null;
    return customers.find(c => c.id === customerId);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-800',
      sent: 'bg-green-100 text-green-800',
      delivered: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800'
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  // Filter messages by search and status
  const filteredMessages = messages.filter(msg => {
    const customer = getCustomer(msg.customerId);
    const name = customer ? ((customer as any).full_name || customer.fullName || (customer as any).name) : '';
    const phone = msg.phoneNumber;
    const content = msg.content;

    const matchesSearch = searchTerm
      ? name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      content.toLowerCase().includes(searchTerm.toLowerCase())
      : true;

    const matchesStatus = statusFilter === 'all' || msg.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Messages</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Messages List */}
      <div className="space-y-3">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No messages found</p>
          </div>
        ) : (
          filteredMessages.map(msg => {
            const customer = getCustomer(msg.customerId);
            const name = customer?.fullName || '';

            return (
              <div
                key={msg.id}
                className="bg-white p-4 rounded-lg shadow border hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">
                        {name ? `${name} (${msg.phoneNumber})` : msg.phoneNumber}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(msg.status)}`}>
                        {msg.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleTimeString()}</p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-2">{msg.content}</p>

                <div className="flex justify-between items-center text-xs text-gray-400">
                  <span>{msg.smsCreditsUsed} credit{msg.smsCreditsUsed > 1 ? 's' : ''} used</span>
                  {msg.errorMessage && <span className="text-red-600">{msg.errorMessage}</span>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MessageContent;
