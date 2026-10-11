import React from 'react';
import type { DashboardSummary } from '../types';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import {
  Plane, AlertTriangle, Clock, Activity, ShieldAlert,
  BarChart2, PieChart as PieIcon, Layers
} from 'lucide-react';

import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';

interface OverviewProps {
  summary: DashboardSummary | null;
  loading: boolean;
  onNavigate: (page: string) => void;
}

const COLORS = ['#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export const Overview: React.FC<OverviewProps> = ({ summary, loading }) => {
  if (loading || !summary) {
    return (
      <div className="p-8 text-center text-slate-400 font-mono flex items-center justify-center h-64">
        <div className="animate-spin w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full mr-3"></div>
        Loading Operational Dashboard Metrics...
      </div>
    );
  }

  // Chart data formatting
  const statusChartData = Object.entries(summary.resource_status_breakdown || {}).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
  }));

  const typeChartData = Object.entries(summary.resource_type_breakdown || {}).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    count: value,
  }));

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Operations Command Overview</h2>
          <p className="text-xs text-slate-400">
            Real-time readiness telemetry, scheduling conflict detection & data freshness metrics
          </p>
        </div>
        <div className="flex items-center gap-2 bg-navy-900 border border-navy-700 px-3 py-1.5 rounded-lg text-xs font-mono text-cyan-400">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>Rules Engine Active</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Fleet Resources"
          value={summary.total_resources}
          subtitle={`${summary.available_resources} Available for dispatch`}
          icon={Plane}
          accentColor="border-cyan-500 text-cyan-400"
          trend={`${summary.available_resources} Ready`}
          trendType="positive"
        />

        <MetricCard
          title="Pending Planning Requests"
          value={summary.pending_requests}
          subtitle="Awaiting schedule assignment"
          icon={Layers}
          accentColor="border-indigo-500 text-indigo-400"
          trend="Requires Scenario Evaluation"
          trendType="neutral"
        />

        <MetricCard
          title="Active Conflicts & Alerts"
          value={summary.active_conflicts}
          subtitle={`${summary.resources_requiring_review} Critical maintenance overlaps`}
          icon={AlertTriangle}
          accentColor="border-amber-500 text-amber-400"
          trend={summary.active_conflicts > 0 ? "Requires Review" : "Nominal"}
          trendType={summary.active_conflicts > 0 ? "alert" : "positive"}
        />

        <MetricCard
          title="Telemetry Freshness"
          value={`${summary.data_freshness_percent}%`}
          subtitle={`${summary.stale_records_count} Stale telemetry records`}
          icon={Clock}
          accentColor="border-emerald-500 text-emerald-400"
          trend={summary.stale_records_count > 0 ? "Stale Data Flagged" : "Fully Fresh"}
          trendType={summary.stale_records_count > 0 ? "negative" : "positive"}
        />
      </div>

      {/* Analytics & Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resource Status Distribution */}
        <div className="glass-panel p-5 rounded-xl border border-navy-700/60">
          <div className="flex items-center gap-2 mb-4">
            <PieIcon className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Resource Readiness Status Distribution</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b132b', borderColor: '#2a385b', borderRadius: '8px' }}
                  itemStyle={{ color: '#38bdf8' }}
                />
                <Legend formatter={(val) => <span className="text-xs text-slate-300 font-mono">{val}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Resource Type Breakdown */}
        <div className="glass-panel p-5 rounded-xl border border-navy-700/60">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Fleet Composition by Capability Category</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2541" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b132b', borderColor: '#2a385b', borderRadius: '8px' }}
                  itemStyle={{ color: '#06b6d4' }}
                />
                <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity & Audit Feed */}
      <div className="glass-panel p-5 rounded-xl border border-navy-700/60 space-y-4">
        <div className="flex items-center justify-between border-b border-navy-700/60 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Recent System Audit & Decision Stream</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Last 10 Events</span>
        </div>

        <div className="divide-y divide-navy-800/60 max-h-64 overflow-y-auto">
          {summary.recent_events.map((event) => (
            <div key={event.id} className="py-3 flex items-start justify-between text-xs hover:bg-navy-850/40 px-2 rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <StatusBadge status={event.action} size="sm" />
                  <span className="font-bold text-white">{event.actor_name}</span>
                  <span className="text-slate-500">({event.actor_role})</span>
                </div>
                <p className="text-slate-300">{event.comments || 'Action executed'}</p>
              </div>
              <div className="text-slate-500 font-mono text-[11px] shrink-0">
                {new Date(event.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
