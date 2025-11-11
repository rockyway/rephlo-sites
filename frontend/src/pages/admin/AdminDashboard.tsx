/**
 * AdminDashboard Page
 *
 * Unified admin dashboard home page displaying cross-plan KPIs, charts, and recent activity.
 *
 * Features:
 * - Top KPI Grid (4 stat cards)
 * - Revenue Mix Chart (Pie chart)
 * - User Growth Chart (Placeholder)
 * - Recent Activity Feed
 * - Quick Actions Panel
 * - Auto-refresh every 60 seconds
 * - Deep Navy theme
 * - Responsive design (mobile, tablet, desktop)
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  Users,
  Zap,
  Ticket,
  CreditCard,
  Key,
  Circle,
  Smartphone,
  UserPlus,
  FileText,
  Settings,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import AdminStatsGrid, { StatCard } from '@/components/admin/data/AdminStatsGrid';
import { LoadingState, EmptyState } from '@/components/admin/utility';
import { adminAPI, ActivityEvent } from '@/api/admin';
import { formatCurrency, formatNumber, formatRelativeTime } from '@/utils/format';
import { Link } from 'react-router-dom';
import Breadcrumbs from '@/components/admin/layout/Breadcrumbs';

// ============================================================================
// Main Dashboard Component
// ============================================================================

const AdminDashboard: React.FC = () => {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  // Fetch KPIs with auto-refresh
  const {
    data: kpis,
    isLoading: kpisLoading,
    error: kpisError,
    refetch: refetchKPIs,
  } = useQuery({
    queryKey: ['dashboard-kpis', period],
    queryFn: () => adminAPI.getDashboardKPIs(period),
    staleTime: 60 * 1000, // 60 seconds
    refetchInterval: 60 * 1000, // Auto-refresh every 60s
  });

  // Fetch recent activity
  const {
    data: activityData,
    isLoading: activityLoading,
    error: activityError,
  } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const response = await adminAPI.getRecentActivity({ limit: 20 });
      // Backend wraps responses in { success, data }
      return (response as any).data || response;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  // Loading state
  if (kpisLoading && activityLoading) {
    return <LoadingState fullPage message="Loading dashboard..." />;
  }

  // Error state
  if (kpisError) {
    return (
      <EmptyState
        icon={<AlertCircle className="h-12 w-12 text-red-500" />}
        title="Failed to load dashboard"
        description="There was an error loading the dashboard data. Please try again."
        action={{ label: 'Retry', onClick: () => refetchKPIs() }}
      />
    );
  }

  // Prepare KPI stats for AdminStatsGrid
  const kpiStats: StatCard[] = [
    {
      label: 'Total Revenue',
      value: formatCurrency(kpis?.totalRevenue.value || 0),
      change: kpis?.totalRevenue.change,
      icon: <DollarSign className="h-5 w-5" />,
    },
    {
      label: 'Active Users',
      value: kpis?.activeUsers.value || 0,
      change: kpis?.activeUsers.change,
      icon: <Users className="h-5 w-5" />,
    },
    {
      label: 'Credits Consumed',
      value: formatNumber(kpis?.creditsConsumed.value || 0),
      change: kpis?.creditsConsumed.change,
      icon: <Zap className="h-5 w-5" />,
    },
    {
      label: 'Coupon Redemptions',
      value: kpis?.couponRedemptions.value || 0,
      change: kpis?.couponRedemptions.change,
      icon: <Ticket className="h-5 w-5" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-deep-navy-800">Dashboard</h1>
          <p className="text-deep-navy-600 mt-1">
            Overview of platform metrics and recent activity
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border border-deep-navy-200 p-1">
          {(['7d', '30d', '90d', '1y'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-rephlo-blue text-white'
                  : 'text-deep-navy-600 hover:bg-deep-navy-50'
              }`}
            >
              {p === '1y' ? '1 Year' : p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Top KPI Grid */}
      <AdminStatsGrid stats={kpiStats} columns={4} />

      {/* 2. Charts Section (2-column) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueMixChart data={kpis?.totalRevenue} />
        <UserGrowthChart />
      </div>

      {/* 3. Recent Activity Feed */}
      <RecentActivityFeed
        activities={activityData?.events || []}
        isLoading={activityLoading}
        error={activityError}
      />

      {/* 4. Quick Actions Panel */}
      <QuickActionsPanel />
    </div>
  );
};

// ============================================================================
// Revenue Mix Chart Component
// ============================================================================

interface RevenueMixChartProps {
  data?: {
    value: number;
    breakdown: {
      mrr: number;
      perpetual: number;
      upgrades: number;
    };
  };
}

const RevenueMixChart: React.FC<RevenueMixChartProps> = ({ data }) => {
  const chartData = [
    {
      name: 'MRR (Subscriptions)',
      value: data?.breakdown.mrr || 0,
      color: '#2563EB',
    },
    {
      name: 'Perpetual Licenses',
      value: data?.breakdown.perpetual || 0,
      color: '#10B981',
    },
    {
      name: 'Upgrades',
      value: data?.breakdown.upgrades || 0,
      color: '#8B5CF6',
    },
  ];

  // Custom label renderer
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    if (percent === 0) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-sm font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-deep-navy-200 p-6">
      <h3 className="text-lg font-semibold text-deep-navy-800 mb-4">
        Revenue Mix
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value) => (
              <span className="text-sm text-deep-navy-700">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// ============================================================================
// User Growth Chart Component (Placeholder)
// ============================================================================

const UserGrowthChart: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-deep-navy-200 p-6">
      <h3 className="text-lg font-semibold text-deep-navy-800 mb-4">
        User Growth
      </h3>
      <div className="h-[300px] flex items-center justify-center bg-deep-navy-50 rounded-lg border border-dashed border-deep-navy-300">
        <div className="text-center">
          <FileText className="h-12 w-12 text-deep-navy-400 mx-auto mb-2" />
          <p className="text-deep-navy-600 font-medium">
            Chart placeholder - Historical data endpoint needed
          </p>
          <p className="text-sm text-deep-navy-700 mt-1">
            This chart will display user growth trends over time
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Recent Activity Feed Component
// ============================================================================

interface RecentActivityFeedProps {
  activities: ActivityEvent[];
  isLoading: boolean;
  error: any;
}

const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({
  activities,
  isLoading,
  error,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-deep-navy-200">
        <div className="p-6 border-b border-deep-navy-200">
          <h3 className="text-lg font-semibold text-deep-navy-800">
            Recent Activity
          </h3>
        </div>
        <div className="p-8">
          <LoadingState message="Loading activity..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-deep-navy-200 p-6">
        <EmptyState
          icon={<AlertCircle className="h-8 w-8 text-red-500" />}
          title="Failed to load activity"
          description="There was an error loading recent activity."
        />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-deep-navy-200 p-6">
        <EmptyState
          icon={<Circle className="h-8 w-8 text-deep-navy-400" />}
          title="No recent activity"
          description="There are no recent events to display."
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-deep-navy-200">
      <div className="p-6 border-b border-deep-navy-200">
        <h3 className="text-lg font-semibold text-deep-navy-800">
          Recent Activity
        </h3>
      </div>
      <div className="divide-y divide-deep-navy-200 max-h-[600px] overflow-y-auto">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="p-4 hover:bg-deep-navy-50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <ActivityIcon type={activity.type} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-deep-navy-800 font-medium">
                  {activity.description}
                </p>
                <p className="text-xs text-deep-navy-600 mt-1">
                  {activity.user.email} •{' '}
                  {formatRelativeTime(activity.timestamp)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Activity type icon mapping
const ActivityIcon: React.FC<{ type: string }> = ({ type }) => {
  const iconClass = 'h-5 w-5';
  const icons: Record<string, JSX.Element> = {
    subscription: <CreditCard className={`${iconClass} text-blue-500`} />,
    license: <Key className={`${iconClass} text-green-500`} />,
    coupon: <Ticket className={`${iconClass} text-purple-500`} />,
    credit: <Zap className={`${iconClass} text-yellow-500`} />,
    device: <Smartphone className={`${iconClass} text-indigo-500`} />,
  };
  return (
    <div className="p-2 bg-deep-navy-50 rounded-lg shrink-0">
      {icons[type] || <Circle className={`${iconClass} text-gray-500`} />}
    </div>
  );
};

// ============================================================================
// Quick Actions Panel Component
// ============================================================================

const QuickActionsPanel: React.FC = () => {
  const actions = [
    {
      icon: <UserPlus className="h-6 w-6" />,
      label: 'Add User',
      to: '/admin/users/new',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: <Ticket className="h-6 w-6" />,
      label: 'Create Coupon',
      to: '/admin/coupons/new',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      icon: <FileText className="h-6 w-6" />,
      label: 'View Reports',
      to: '/admin/analytics',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      icon: <Settings className="h-6 w-6" />,
      label: 'Settings',
      to: '/admin/settings',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-deep-navy-200 p-6">
      <h3 className="text-lg font-semibold text-deep-navy-800 mb-4">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action, index) => (
          <Link
            key={index}
            to={action.to}
            className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-deep-navy-200 hover:border-rephlo-blue hover:shadow-md transition-all group"
          >
            <div
              className={`${action.bgColor} p-3 rounded-lg mb-3 group-hover:scale-110 transition-transform`}
            >
              <div className={action.color}>{action.icon}</div>
            </div>
            <span className="text-sm font-medium text-deep-navy-700 text-center">
              {action.label}
            </span>
            <ArrowRight className="h-4 w-4 text-deep-navy-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
