import React from 'react';
import {
  Activity, CheckCircle, AlertTriangle, ShieldCheck, Database,
  CloudRain, Cpu, Crosshair, RefreshCw, Plane, Users, Compass, Layers
} from 'lucide-react';
import type { FusionResponse } from '../types';

interface SensorFusionHubProps {
  fusionData: FusionResponse | null;
  onRefresh: () => void;
  isDaylightMode?: boolean;
}

export const SensorFusionHub: React.FC<SensorFusionHubProps> = ({
  fusionData,
  onRefresh,
  isDaylightMode = false,
}) => {
  if (!fusionData) {
    return (
      <div className="p-8 text-center text-slate-400 font-mono text-xs">
        Loading Multi-Source Sensor Fusion Grid...
      </div>
    );
  }

  const getStreamIcon = (id: string) => {
    if (id.includes('AVAIL')) return Plane;
    if (id.includes('CREW')) return Users;
    if (id.includes('WEAPONS') || id.includes('ARMORY')) return Database;
    if (id.includes('AIRSPACE')) return Compass;
    if (id.includes('MET')) return CloudRain;
    if (id.includes('THREATS') || id.includes('EW')) return Crosshair;
    if (id.includes('PRIORITY')) return Layers;
    return Cpu;
  };


  return (
    <div className={`p-6 rounded-2xl border shadow-xl transition-all ${
      isDaylightMode
        ? 'bg-white border-slate-300 text-slate-800'
        : 'bg-navy-900 border-cyan-900/40 text-slate-100'
    }`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-5 border-b border-slate-700/60 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold font-mono tracking-tight text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <span>MULTI-SOURCE SENSOR DATA FUSION HUB</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
              {fusionData.composite_integrity_pct}% INTEGRITY
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Real-time multi-sensor cross-validation (Radar, Weather, EW Threat Intel, Depot Inventory, Fleet Telemetry).
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="px-3 py-1.5 rounded-lg bg-navy-950 border border-slate-700 text-slate-300 hover:text-cyan-400 font-mono text-xs flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Feeds</span>
        </button>
      </div>

      {/* Stream Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {fusionData.streams.map((stream) => {
          const Icon = getStreamIcon(stream.id);
          const isWarning = stream.status === 'STALE_WARNING' || stream.status === 'DEGRADED';
          const isAlert = stream.status === 'HIGH_ALERT';

          return (
            <div
              key={stream.id}
              className={`p-3.5 rounded-xl border font-mono transition-all ${
                isAlert
                  ? 'bg-rose-950/20 border-rose-800/80 text-rose-200'
                  : isWarning
                  ? 'bg-amber-950/20 border-amber-800/80 text-amber-200'
                  : 'bg-navy-950/60 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${
                    isAlert ? 'bg-rose-500/20 text-rose-400' : 'bg-cyan-500/20 text-cyan-400'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold leading-tight truncate max-w-[170px]">
                      {stream.name}
                    </h4>
                    <span className="text-[10px] text-slate-400 block truncate max-w-[170px]">
                      {stream.provider}
                    </span>
                  </div>
                </div>

                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  isAlert
                    ? 'bg-rose-900 text-rose-200'
                    : isWarning
                    ? 'bg-amber-900 text-amber-200'
                    : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                }`}>
                  {stream.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1 text-[10px] bg-navy-900/60 p-2 rounded border border-slate-800/80 mt-2">
                <div>
                  <span className="text-slate-400 block">LATENCY</span>
                  <span className="font-bold text-cyan-300">{stream.latency_ms} ms</span>
                </div>
                <div>
                  <span className="text-slate-400 block">SYNC</span>
                  <span className="font-bold text-cyan-300">{stream.sync_rate_hz} Hz</span>
                </div>
                <div>
                  <span className="text-slate-400 block">INTEGRITY</span>
                  <span className="font-bold text-emerald-400">{stream.integrity_score}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cross-Sensor Inconsistency Detection */}
      <div className="bg-navy-950/80 p-4 rounded-xl border border-slate-800 font-mono">
        <h4 className="text-xs font-bold text-slate-300 mb-2.5 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>CROSS-SENSOR ANOMALY & SPOOFING DETECTION AUDIT</span>
        </h4>

        <div className="space-y-2">
          {fusionData.inconsistencies.map((inc) => (
            <div
              key={inc.id}
              className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                inc.severity === 'WARNING'
                  ? 'bg-amber-950/30 border-amber-800/80 text-amber-200'
                  : 'bg-cyan-950/30 border-cyan-800/60 text-cyan-200'
              }`}
            >
              {inc.severity === 'WARNING' ? (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span>{inc.type} [{inc.target_resource}]</span>
                  <span>{inc.source_pair.join(' ↔ ')}</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">{inc.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
