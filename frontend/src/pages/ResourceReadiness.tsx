import React, { useState } from 'react';
import type { Resource } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { ResourceDrawer } from '../components/ResourceDrawer';
import { Search, Filter, RefreshCw, ChevronRight } from 'lucide-react';


interface ResourceReadinessProps {
  resources: Resource[];
  loading?: boolean;
  onRefresh: () => void;
}

export const ResourceReadiness: React.FC<ResourceReadinessProps> = ({ resources, loading: _loading, onRefresh }) => {

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  const filteredResources = resources.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.location_base.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || r.resource_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Resource Readiness Fleet Roster</h2>
          <p className="text-xs text-slate-400">
            Real-time status, health indicators, base locations and technical specifications
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3.5 py-2 bg-navy-850 hover:bg-navy-800 text-slate-200 border border-navy-700 rounded-lg text-xs font-semibold transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
          <span>Refresh Fleet Telemetry</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-xl border border-navy-700/60 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, name or base..."
            className="w-full bg-navy-950 border border-navy-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-navy-950 px-3 py-1.5 rounded-lg border border-navy-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer font-semibold"
            >
              <option value="ALL" className="bg-navy-900">All Statuses</option>
              <option value="AVAILABLE" className="bg-navy-900">AVAILABLE</option>
              <option value="MAINTENANCE" className="bg-navy-900">MAINTENANCE</option>
              <option value="DEGRADED" className="bg-navy-900">DEGRADED</option>
              <option value="UNAVAILABLE" className="bg-navy-900">UNAVAILABLE</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-navy-950 px-3 py-1.5 rounded-lg border border-navy-700 text-xs">
            <span className="text-slate-400">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer font-semibold"
            >
              <option value="ALL" className="bg-navy-900">All Categories</option>
              <option value="CARGO_TRANSPORT" className="bg-navy-900">Cargo Transport</option>
              <option value="RESCUE_HELICOPTER" className="bg-navy-900">Rescue Helicopter</option>
              <option value="RECON_UAV" className="bg-navy-900">Recon UAV</option>
              <option value="PATROL_AIRCRAFT" className="bg-navy-900">Patrol Aircraft</option>
              <option value="MEDEVAC" className="bg-navy-900">Medevac</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resource Table */}
      <div className="glass-panel rounded-xl border border-navy-700/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-navy-950 text-slate-400 uppercase text-[10px] tracking-wider font-mono border-b border-navy-700">
              <tr>
                <th className="p-4">Resource Identifier</th>
                <th className="p-4">Category</th>
                <th className="p-4">Readiness Status</th>
                <th className="p-4">Home Base</th>
                <th className="p-4 text-center">Health Score</th>
                <th className="p-4">Payload / Range</th>
                <th className="p-4">Last Updated</th>
                <th className="p-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60">
              {filteredResources.map((res) => (
                <tr
                  key={res.id}
                  onClick={() => setSelectedResource(res)}
                  className="hover:bg-navy-850/60 cursor-pointer transition-colors"
                >
                  <td className="p-4 font-mono">
                    <div className="font-bold text-white text-sm">{res.name}</div>
                    <div className="text-[11px] text-cyan-400">{res.id}</div>
                  </td>
                  <td className="p-4 text-slate-300 font-semibold">{res.resource_type.replace(/_/g, ' ')}</td>
                  <td className="p-4">
                    <StatusBadge status={res.status} />
                  </td>
                  <td className="p-4 text-slate-200">{res.location_base}</td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center font-bold text-emerald-400 font-mono">
                      {res.health_score}%
                    </span>
                  </td>
                  <td className="p-4 text-slate-300 font-mono">
                    <div>{res.payload_capacity_kg.toLocaleString()} kg</div>
                    <div className="text-[10px] text-slate-400">{res.range_km.toLocaleString()} km range</div>
                  </td>
                  <td className="p-4 text-slate-400 font-mono text-[11px]">
                    {new Date(res.last_updated).toLocaleString()}
                  </td>
                  <td className="p-4 text-right">
                    <button className="p-1.5 rounded bg-navy-800 text-slate-300 hover:text-white">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredResources.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 font-mono">
                    No matching resources found for current search filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Detail Drawer */}
      <ResourceDrawer resource={selectedResource} onClose={() => setSelectedResource(null)} />
    </div>
  );
};
