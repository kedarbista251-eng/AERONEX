import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const s = status.toUpperCase();
  let color = 'bg-slate-800 text-slate-300 border-slate-700';

  if (['AVAILABLE', 'READY', 'APPROVED', 'COMPLETED'].includes(s)) {
    color = 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
  } else if (['MAINTENANCE', 'RESTING', 'DEGRADED', 'PENDING_REVIEW', 'MEDIUM'].includes(s)) {
    color = 'bg-amber-950/80 text-amber-300 border-amber-700/60';
  } else if (['UNAVAILABLE', 'UNQUALIFIED', 'REJECTED', 'CRITICAL', 'CONFLICTED', 'HIGH', 'SEVERE'].includes(s)) {
    color = 'bg-rose-950/80 text-rose-300 border-rose-700/60';
  } else if (['UNASSIGNED', 'SCHEDULED', 'LOW'].includes(s)) {
    color = 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60';
  }

  const px = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center font-bold tracking-wide rounded-md border uppercase ${px} ${color}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
};
