import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, PlaneTakeoff, CalendarRange, CheckCircle2,
  AlertTriangle, History, ShieldAlert
} from 'lucide-react';

interface SidebarProps {
  alertCount: number;
  pendingReviewCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ alertCount, pendingReviewCount }) => {
  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/resources', label: 'Resource Readiness', icon: PlaneTakeoff },
    { to: '/planning', label: 'Planning Workspace', icon: CalendarRange },
    {
      to: '/recommendations',
      label: 'Recommendation Review',
      icon: CheckCircle2,
      badge: pendingReviewCount > 0 ? pendingReviewCount : undefined,
      badgeColor: 'bg-cyan-500 text-slate-950',
    },
    {
      to: '/alerts',
      label: 'Alerts & Data Quality',
      icon: AlertTriangle,
      badge: alertCount > 0 ? alertCount : undefined,
      badgeColor: 'bg-amber-500 text-slate-950',
    },
    { to: '/audit', label: 'Audit History', icon: History },
  ];

  return (
    <aside className="w-64 bg-navy-900 border-r border-navy-700/60 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          OPERATIONAL MODULES
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-400 border-l-4 border-cyan-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800/60'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Security Governance Footer Badge */}
      <div className="p-4 border-t border-navy-800/80">
        <div className="bg-navy-950 p-3 rounded-lg border border-navy-800 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-400 leading-relaxed">
            <span className="font-semibold text-slate-300 block">Governance Active</span>
            Strict human approval required. Synthetic data demonstrator.
          </div>
        </div>
      </div>
    </aside>
  );
};
