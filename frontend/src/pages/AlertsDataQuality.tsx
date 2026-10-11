import React, { useState } from 'react';
import type { DataAlert } from '../types';
import { AlertCard } from '../components/AlertCard';
import { RefreshCw, ShieldAlert, FileX, Clock, CheckCircle } from 'lucide-react';

import { api } from '../services/api';

interface AlertsDataQualityProps {
  alerts: DataAlert[];
  loading: boolean;
  onRefresh: () => void;
}

export const AlertsDataQuality: React.FC<AlertsDataQualityProps> = ({ alerts, loading, onRefresh }) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncData = async () => {
    try {
      setIsSyncing(true);
      await api.importData();
      onRefresh();
      alert('Operational telemetry feeds re-synchronized!');
    } catch (err: any) {
      alert('Error syncing telemetry: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredAlerts = alerts.filter(
    (a) => filterType === 'ALL' || a.alert_type === filterType
  );

  const staleCount = alerts.filter((a) => a.alert_type === 'STALE_DATA').length;
  const maintCount = alerts.filter((a) => a.alert_type === 'MAINTENANCE_OVERLAP').length;
  const missingCount = alerts.filter((a) => a.alert_type === 'MISSING_FIELDS').length;

  return (
    <div className="space-y-6">
      {/* Title & Sync Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Alerts & Data Quality Management</h2>
          <p className="text-xs text-slate-400">
            Detect missing, stale or conflicting operational records across external telemetry streams
          </p>
        </div>

        <button
          onClick={handleSyncData}
          disabled={isSyncing}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-lg text-xs shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>Re-Sync Operational Data</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-amber-500/40 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase">Stale Telemetry (&gt;24h)</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">{staleCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Records require refresh</div>
          </div>
          <Clock className="w-8 h-8 text-amber-500/40" />
        </div>

        <div className="glass-panel p-4 rounded-xl border border-rose-500/40 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase">Maintenance Overlaps</div>
            <div className="text-2xl font-bold text-rose-400 mt-1">{maintCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Conflicting operational states</div>
          </div>
          <ShieldAlert className="w-8 h-8 text-rose-500/40" />
        </div>

        <div className="glass-panel p-4 rounded-xl border border-cyan-500/40 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase">Missing Data Fields</div>
            <div className="text-2xl font-bold text-cyan-400 mt-1">{missingCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Incomplete specifications</div>
          </div>
          <FileX className="w-8 h-8 text-cyan-500/40" />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-navy-800 pb-2 overflow-x-auto">
        {['ALL', 'STALE_DATA', 'MAINTENANCE_OVERLAP', 'MISSING_FIELDS', 'WEATHER_HAZARD'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterType === type
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'bg-navy-900 text-slate-400 hover:text-white border border-navy-700'
            }`}
          >
            {type.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Alert Feed */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 font-mono">Loading data quality alerts...</div>
      ) : filteredAlerts.length === 0 ? (
        <div className="glass-panel p-8 rounded-xl border border-navy-700 text-center space-y-2">
          <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-white">No Active Data Quality Flags</h3>
          <p className="text-xs text-slate-400">All operational records pass data integrity standards.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
};
