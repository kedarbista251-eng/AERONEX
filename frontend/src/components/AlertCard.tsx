import React from 'react';
import type { DataAlert } from '../types';
import { Clock, ShieldAlert, FileX, CloudRain, AlertCircle } from 'lucide-react';

import { StatusBadge } from './StatusBadge';

interface AlertCardProps {
  alert: DataAlert;
}

export const AlertCard: React.FC<AlertCardProps> = ({ alert }) => {
  const getIcon = () => {
    switch (alert.alert_type) {
      case 'STALE_DATA':
        return Clock;
      case 'MAINTENANCE_OVERLAP':
        return ShieldAlert;
      case 'MISSING_FIELDS':
        return FileX;
      case 'WEATHER_HAZARD':
        return CloudRain;
      default:
        return AlertCircle;
    }
  };

  const Icon = getIcon();

  return (
    <div className="glass-panel p-4 rounded-xl border border-navy-700/80 flex items-start gap-4 hover:border-navy-600 transition-colors">
      <div
        className={`p-3 rounded-lg shrink-0 ${
          alert.severity === 'CRITICAL'
            ? 'bg-rose-950 text-rose-400 border border-rose-800'
            : alert.severity === 'HIGH'
            ? 'bg-amber-950 text-amber-400 border border-amber-800'
            : 'bg-navy-950 text-cyan-400 border border-navy-700'
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <StatusBadge status={alert.severity} size="sm" />
          <span className="text-xs font-mono text-cyan-400 font-semibold uppercase">{alert.alert_type}</span>
          <span className="text-[10px] text-slate-500">•</span>
          <span className="text-[10px] text-slate-400 font-mono">{alert.entity_type} [{alert.entity_id}]</span>
        </div>
        <p className="text-sm font-medium text-slate-200 leading-relaxed">{alert.message}</p>
        <div className="mt-2 text-[11px] text-slate-500 font-mono">
          Detected: {new Date(alert.timestamp).toLocaleString()}
        </div>
      </div>
    </div>
  );
};
