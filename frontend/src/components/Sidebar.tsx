import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, PlaneTakeoff, CalendarRange, CheckCircle2,
  AlertTriangle, History, ShieldAlert, Compass
} from 'lucide-react';

interface SidebarProps {
  alertCount: number;
  pendingReviewCount: number;
  isDaylightMode?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ alertCount, pendingReviewCount, isDaylightMode = false }) => {
  const navItems = [
    {
      to: '/tactical-cop',
      label: 'Tactical COP & 4D Map',
      icon: Compass,
      badge: 'LIVE',
      badgeColor: 'bg-rose-500 text-white animate-pulse',
    },
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
    <aside className={`w-64 border-r flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)] transition-colors ${
      isDaylightMode
        ? 'bg-white border-slate-200 text-slate-800'
        : 'bg-navy-900 border-navy-700/60 text-slate-100'
    }`}>
      <div className="p-4 space-y-1">
        <div className={`px-3 py-2 text-[11px] font-semibold uppercase tracking-wider ${
          isDaylightMode ? 'text-slate-500' : 'text-slate-400'
        }`}>
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
                    ? isDaylightMode
                      ? 'bg-cyan-50 text-cyan-700 border-l-4 border-cyan-500 font-semibold shadow-sm'
                      : 'bg-cyan-500/15 text-cyan-400 border-l-4 border-cyan-400 font-semibold'
                    : isDaylightMode
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
      <div className={`p-4 border-t ${isDaylightMode ? 'border-slate-200' : 'border-navy-800/80'}`}>
        <div className={`p-3 rounded-lg border flex items-start gap-2.5 ${
          isDaylightMode ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-navy-950 border-navy-800 text-slate-400'
        }`}>
          <ShieldAlert className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <span className={`font-semibold block ${isDaylightMode ? 'text-slate-800' : 'text-slate-300'}`}>Governance Active</span>
            Strict human approval required. Synthetic data demonstrator.
          </div>
        </div>
      </div>
    </aside>
  );
};
