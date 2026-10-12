import React, { useState, useEffect } from 'react';
import type { DashboardSummary, FusionResponse } from '../types';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../services/api';
import {
  Plane, AlertTriangle, Clock, Activity, ShieldAlert,
  BarChart2, PieChart as PieIcon, Layers, Compass, TrendingUp,
  Cpu, Database, ArrowRight, ShieldCheck
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

export const Overview: React.FC<OverviewProps> = ({ summary, loading, onNavigate }) => {
  const [fusionData, setFusionData] = useState<FusionResponse | null>(null);

  useEffect(() => {
    const loadFusion = async () => {
      try {
        const data = await api.getSensorFusion();
        setFusionData(data);
      } catch (e) {
        console.error('Error loading fusion in overview:', e);
      }
    };
    loadFusion();
  }, []);

  if (loading || !summary) {
    return (
      <div className="p-8 text-center text-slate-400 font-mono flex items-center justify-center h-64">
        <div className="animate-spin w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full mr-3" />
        Loading Operational Airpower Command Dashboard...
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

  const airbases = [
    { name: 'Sector-Alpha Airbase', role: 'Northern HQ', readiness: 'DEFCON-2', hangars: '8 Hangars', fuel: '450 kL' },
    { name: 'Sector-Beta Airbase', role: 'Western Sector', readiness: 'DEFCON-2', hangars: '6 Hangars', fuel: '380 kL' },
    { name: 'Sector-Gamma Hub', role: 'Central Logistics', readiness: 'DEFCON-3', hangars: '12 Hangars', fuel: '620 kL' },
    { name: 'Coastal Station Delta', role: 'Naval Air Station', readiness: 'DEFCON-3', hangars: '4 Hangars', fuel: '290 kL' },
    { name: 'Highland Outpost Echo', role: 'High Altitude FOB', readiness: 'DEFCON-1', hangars: '3 Hangars', fuel: '190 kL' },
    { name: 'Forward Base Foxtrot', role: 'Border QRA Outpost', readiness: 'DEFCON-1', hangars: '4 Hangars', fuel: '210 kL' },
  ];

  return (
    <div className="space-y-6">
      {/* Defense Operations Command Hero Banner */}
      <div className="rounded-2xl border border-cyan-500/40 bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 p-6 shadow-xl shadow-cyan-950/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                TACTICAL AIR OPERATIONS (C2)
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold">
                7-SOURCE INTELLIGENCE FUSION
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                DETERMINISTIC OPTIMISATION ACTIVE
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Air Power: Dynamic Air Operations & Resource Optimisation
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Autonomous AI-enabled tactical decision support system unifying <strong>7 disparate feeds</strong> (Aircraft availability, crew status, weapon loads, airspace, weather, threats, and mission priorities). Evaluates <strong>9 non-negotiable hard rules</strong> deterministically, forecasts survivability (P_surv), and executes dynamic in-flight retasking in <strong>&lt; 2.8 seconds</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
            <button
              onClick={() => onNavigate('/tactical-cop')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs font-mono flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
            >
              <Compass className="w-4 h-4" />
              <span>Launch 4D Tactical COP</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onNavigate('/predictive')}
              className="px-4 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 border border-cyan-700/60 text-cyan-300 font-bold text-xs font-mono flex items-center justify-center gap-2 transition-all"
            >
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Predictive Attrition Suite</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Technology Opportunity Pillars (Command Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div
          onClick={() => onNavigate('/tactical-cop')}
          className="p-4 rounded-xl bg-navy-900/90 border border-cyan-800/40 hover:border-cyan-500/80 cursor-pointer transition-all hover:-translate-y-0.5 space-y-2 group shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
              <Compass className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase">Pillar 1</span>
          </div>
          <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
            4D Tactical COP & Vector Map
          </h3>
          <p className="text-xs text-slate-400 leading-snug">
            Real-time geospatial tracking, speed leaders, S-400 SAM threat envelopes & time scrubbing (T+0h to T+4h).
          </p>
        </div>

        {/* Card 2 */}
        <div
          onClick={() => onNavigate('/tactical-cop')}
          className="p-4 rounded-xl bg-navy-900/90 border border-cyan-800/40 hover:border-cyan-500/80 cursor-pointer transition-all hover:-translate-y-0.5 space-y-2 group shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
              <Database className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">Pillar 2</span>
          </div>
          <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
            7-Source Multi-Sensor Fusion
          </h3>
          <p className="text-xs text-slate-400 leading-snug">
            Cross-checks ADS-B vs. Primary Radar tracks, flags sensor spoofing & detects stale feeds (&gt;4 hours).
          </p>
        </div>

        {/* Card 3 */}
        <div
          onClick={() => onNavigate('/predictive')}
          className="p-4 rounded-xl bg-navy-900/90 border border-cyan-800/40 hover:border-cyan-500/80 cursor-pointer transition-all hover:-translate-y-0.5 space-y-2 group shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">Pillar 3</span>
          </div>
          <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
            Predictive Analytics & Attrition
          </h3>
          <p className="text-xs text-slate-400 leading-snug">
            Weibull MTBF component degradation, Great-Circle Bingo fuel curves & waypoint survivability (P_surv).
          </p>
        </div>

        {/* Card 4 */}
        <div
          onClick={() => onNavigate('/planning')}
          className="p-4 rounded-xl bg-navy-900/90 border border-cyan-800/40 hover:border-cyan-500/80 cursor-pointer transition-all hover:-translate-y-0.5 space-y-2 group shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:bg-rose-500 group-hover:text-slate-950 transition-colors">
              <Cpu className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold text-rose-400 uppercase">Pillar 4</span>
          </div>
          <h3 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
            9-Rule Optimization & ATO
          </h3>
          <p className="text-xs text-slate-400 leading-snug">
            Zero black-box guessing. Evaluates weapon loads, crew fatigue, Pareto trade-offs & standard military ATO manifests.
          </p>
        </div>
      </div>

      {/* 7 Multi-Source Signals Live Fusion Strip */}
      {fusionData && (
        <div className="bg-navy-900/80 border border-navy-700/60 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-navy-800 pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
                7 Multi-Source Intelligence Streams (Disparate Defense Systems Fusion)
              </h4>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
              {fusionData.composite_integrity_pct}% COMPOSITE INTEGRITY
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {fusionData.streams.map((stream) => (
              <div
                key={stream.id}
                className="bg-navy-950 p-2.5 rounded-lg border border-navy-800 text-xs font-mono space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className={`w-2 h-2 rounded-full ${
                    stream.status === 'OPTIMAL' ? 'bg-emerald-400' : (
                      stream.status === 'HIGH_ALERT' ? 'bg-rose-400 animate-pulse' : 'bg-amber-400'
                    )
                  }`} />
                  <span className="text-[10px] text-slate-400">{stream.latency_ms}ms</span>
                </div>
                <p className="font-bold text-white text-[11px] truncate leading-tight" title={stream.name}>
                  {stream.name}
                </p>
                <p className="text-[10px] text-slate-400 truncate" title={stream.provider}>
                  {stream.provider}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Strategic Airpower Forward Bases (FOBs Grid) */}
      <div className="bg-navy-900/80 border border-navy-700/60 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-navy-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Strategic Forward Operating Bases (FOB) Readiness</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">6 Tactical Sectors</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {airbases.map((base) => (
            <div key={base.name} className="p-3.5 rounded-xl bg-navy-950/80 border border-navy-800 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{base.name}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  base.readiness === 'DEFCON-1' ? 'bg-rose-500/20 text-rose-400 border border-rose-800' :
                  base.readiness === 'DEFCON-2' ? 'bg-amber-500/20 text-amber-400 border border-amber-800' :
                  'bg-cyan-500/20 text-cyan-400 border border-cyan-800'
                }`}>
                  {base.readiness}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">{base.role}</p>
              <div className="flex justify-between text-[10px] text-slate-400 pt-1 border-t border-navy-900">
                <span>Hangars: <strong className="text-slate-200">{base.hangars}</strong></span>
                <span>Fuel Reserve: <strong className="text-cyan-400">{base.fuel}</strong></span>
              </div>
            </div>
          ))}
        </div>
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
            <h3 className="text-base font-bold text-white">Fleet Composition by Airpower Category</h3>
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
            <h3 className="text-base font-bold text-white">Immutable Decision Ledger & Audit Stream</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Last 10 Events (SHA-256 Verified)</span>
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
