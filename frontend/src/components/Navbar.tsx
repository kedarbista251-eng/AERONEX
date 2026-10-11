import React, { useState, useEffect } from 'react';
import { Plane, RefreshCw, RotateCcw, UserCheck } from 'lucide-react';

import { api } from '../services/api';

interface NavbarProps {
  currentRole: 'Planner' | 'Reviewer';
  onRoleChange: (role: 'Planner' | 'Reviewer') => void;
  onRefresh: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRole, onRoleChange, onRefresh }) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toUTCString().replace('GMT', 'UTC'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleReset = async () => {
    if (window.confirm('Reset synthetic database and demonstration scenario to baseline state?')) {
      try {
        setIsResetting(true);
        await api.resetDemo();
        onRefresh();
        alert('Demonstration scenario reset successfully!');
      } catch (err: any) {
        alert('Error resetting demo: ' + err.message);
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <header className="h-16 bg-navy-900 border-b border-navy-700/60 px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Brand & Subtitle */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Plane className="w-6 h-6 text-slate-950 font-bold transform -rotate-45" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-white">AeroSync AI</h1>
            <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-700/50">
              NON-COMBAT DEMONSTRATOR
            </span>
          </div>
          <p className="text-xs text-slate-400">Intelligent Air Operations Decision Support System</p>
        </div>
      </div>

      {/* Clock & Controls */}
      <div className="flex items-center gap-4">
        {/* System Time */}
        <div className="hidden md:flex items-center gap-2 text-xs font-mono bg-navy-950 px-3 py-1.5 rounded-md border border-navy-700 text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{timeStr || 'ZULU TIME'}</span>
        </div>

        {/* Role Selector */}
        <div className="flex items-center gap-2 bg-navy-950 px-2 py-1 rounded-md border border-navy-700">
          <UserCheck className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-slate-400 hidden sm:inline">Role:</span>
          <select
            value={currentRole}
            onChange={(e) => onRoleChange(e.target.value as 'Planner' | 'Reviewer')}
            className="bg-transparent text-xs font-semibold text-cyan-300 focus:outline-none cursor-pointer"
          >
            <option value="Planner" className="bg-navy-900 text-white">Mission Planner</option>
            <option value="Reviewer" className="bg-navy-900 text-white">Human Reviewer (Commander)</option>
          </select>
        </div>

        {/* Sync Telemetry */}
        <button
          onClick={onRefresh}
          className="p-2 rounded-md text-slate-300 hover:text-cyan-400 hover:bg-navy-800 transition-colors"
          title="Refresh Data Feeds"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Reset Scenario Button */}
        <button
          onClick={handleReset}
          disabled={isResetting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-rose-950/60 text-rose-300 border border-rose-800/80 hover:bg-rose-900/80 transition-colors"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          <span>Reset Demo</span>
        </button>
      </div>
    </header>
  );
};
