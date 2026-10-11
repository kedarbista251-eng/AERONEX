import React, { useState, useEffect } from 'react';
import type { AuditEvent } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../services/api';
import { Search, RefreshCw } from 'lucide-react';


interface AuditHistoryProps {
  onRefresh: () => void;
}

export const AuditHistory: React.FC<AuditHistoryProps> = ({ onRefresh }) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAudit();
  }, [search]);

  const loadAudit = async () => {
    try {
      setLoading(true);
      const list = await api.getAuditEvents(search);
      setEvents(list);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">System Audit & Governance History</h2>
          <p className="text-xs text-slate-400">
            Immutable log of human approvals, rules engine evaluations, data syncs & decision overrides
          </p>
        </div>

        <button
          onClick={() => {
            loadAudit();
            onRefresh();
          }}
          className="flex items-center gap-2 px-3.5 py-2 bg-navy-850 hover:bg-navy-800 text-slate-200 border border-navy-700 rounded-lg text-xs font-semibold transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
          <span>Refresh Audit Stream</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="glass-panel p-4 rounded-xl border border-navy-700/60 flex items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit trail by actor, action or comments..."
            className="w-full bg-navy-950 border border-navy-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="text-xs text-slate-400 font-mono hidden md:block">
          Total Recorded Events: <strong className="text-cyan-400">{events.length}</strong>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel rounded-xl border border-navy-700/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-navy-950 text-slate-400 uppercase text-[10px] tracking-wider font-mono border-b border-navy-700">
              <tr>
                <th className="p-4">Timestamp (UTC)</th>
                <th className="p-4">Action Event</th>
                <th className="p-4">Actor / Demo Role</th>
                <th className="p-4">Target Entity</th>
                <th className="p-4">Rationale & Human Comments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-mono">
                    Fetching audit events...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-mono">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-navy-850/60 transition-colors">
                    <td className="p-4 font-mono text-slate-400 text-[11px]">
                      {new Date(evt.timestamp).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={evt.action} />
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-white">{evt.actor_name}</div>
                      <div className="text-[10px] text-slate-400">{evt.actor_role}</div>
                    </td>
                    <td className="p-4 font-mono text-cyan-400">
                      {evt.related_entity_type} {evt.related_entity_id ? `[${evt.related_entity_id}]` : ''}
                    </td>
                    <td className="p-4 text-slate-200 max-w-md">
                      <p className="line-clamp-2">{evt.comments || 'N/A'}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
