import React from 'react';
import { 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Clock, 
  CreditCard,
  Wallet 
} from 'lucide-react';

interface MessageStatsCardsProps {
  stats: {
    total: number;
    sent: number;
    failed: number;
    pending: number;
    totalCreditsUsed: number;
    creditsRemaining: number;  // New field
  };
}

const MessageStatsCards = ({ stats }: MessageStatsCardsProps) => {
  const isLowBalance = stats.creditsRemaining <= 50;
  const isCritical = stats.creditsRemaining <= 20;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {/* Credits Remaining - 6th Card */}
      <div className={`p-5 rounded-xl shadow-sm border-2 transition-all hover:shadow-lg ${
        isCritical 
          ? 'bg-red-50 border-red-400' 
          : isLowBalance 
            ? 'bg-amber-50 border-amber-400' 
            : 'bg-emerald-50 border-emerald-400'
      }`}>
        <div className={`flex items-center gap-3 mb-2 ${
          isCritical ? 'text-red-700' : isLowBalance ? 'text-amber-700' : 'text-emerald-700'
        }`}>
          <Wallet className="w-5 h-5" />
          <span className="text-sm font-medium">Credit Bal.</span>
        </div>
        <p className={`text-3xl font-bold ${
          isCritical ? 'text-red-700' : isLowBalance ? 'text-amber-700' : 'text-emerald-700'
        }`}>
          {stats.creditsRemaining.toLocaleString()}
        </p>

      </div>
      {/* Total Messages */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 text-gray-600 mb-2">
          <MessageSquare className="w-5 h-5" />
          <span className="text-sm font-medium">Total</span>
        </div>
        <p className="text-3xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
      </div>

      {/* Sent */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 text-green-600 mb-2">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium">Sent</span>
        </div>
        <p className="text-3xl font-bold text-green-600">{stats.sent.toLocaleString()}</p>
      </div>

      {/* Pending */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 text-amber-600 mb-2">
          <Clock className="w-5 h-5" />
          <span className="text-sm font-medium">Pending</span>
        </div>
        <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
      </div>

      {/* Failed */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 text-red-600 mb-2">
          <XCircle className="w-5 h-5" />
          <span className="text-sm font-medium">Failed</span>
        </div>
        <p className="text-3xl font-bold text-red-600">{stats.failed}</p>
      </div>

      {/* Credits Used */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 text-blue-600 mb-2">
          <CreditCard className="w-5 h-5" />
          <span className="text-sm font-medium">Credits Used</span>
        </div>
        <p className="text-3xl font-bold text-blue-600">{stats.totalCreditsUsed.toLocaleString()}</p>
      </div>
    </div>
  );
};

export default MessageStatsCards;