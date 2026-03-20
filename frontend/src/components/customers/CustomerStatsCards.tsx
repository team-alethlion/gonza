import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, Calendar } from 'lucide-react';

interface CustomerStatsCardsProps {
  customerStats: {
    totalCustomers: number;
    customersThisMonth: number;
    customersWithBirthdays: number;
  };
}

const CustomerStatsCards: React.FC<CustomerStatsCardsProps> = ({ customerStats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-blue-900">Total Customers</CardTitle>
          <div className="p-2 bg-blue-500 rounded-lg">
            <Users className="h-4 w-4 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-900">{customerStats.totalCustomers}</div>
          <p className="text-xs text-blue-700 mt-1">Active customer base</p>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-green-900">New This Month</CardTitle>
          <div className="p-2 bg-green-500 rounded-lg">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-900">{customerStats.customersThisMonth}</div>
          <p className="text-xs text-green-700 mt-1">Recent acquisitions</p>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-purple-900">With Birthdays</CardTitle>
          <div className="p-2 bg-purple-500 rounded-lg">
            <Calendar className="h-4 w-4 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-purple-900">{customerStats.customersWithBirthdays}</div>
          <p className="text-xs text-purple-700 mt-1">Special occasions</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerStatsCards;