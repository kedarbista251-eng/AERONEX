import React from 'react';
import type { LucideIcon } from 'lucide-react';


interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral' | 'alert';
  accentColor?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendType = 'neutral',
  accentColor = 'border-cyan-500/40 text-cyan-400'
}) => {
  return (
    <div className={`glass-panel p-5 rounded-xl border-l-4 ${accentColor} transition-all hover:bg-navy-850/80`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-white mt-1.5">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className="p-2.5 rounded-lg bg-navy-950 border border-navy-700/50">
          <Icon className="w-5 h-5 text-cyan-400" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium">
          <span
            className={
              trendType === 'positive'
                ? 'text-emerald-400'
                : trendType === 'negative'
                ? 'text-rose-400'
                : trendType === 'alert'
                ? 'text-amber-400 font-bold'
                : 'text-slate-400'
            }
          >
            {trend}
          </span>
        </div>
      )}
    </div>
  );
};
