import React, { useState, useEffect } from 'react';
import { Plane, RefreshCw, RotateCcw, UserCheck, Sun, Moon, Radio, Shield, Cpu, Wrench } from 'lucide-react';
import { api } from '../services/api';
import type { MilitaryRole } from '../types';
import { MILITARY_PERSONAS } from '../services/militaryPersonas';
import { C2InfoRoutingModal } from './C2InfoRoutingModal';

interface NavbarProps {
  currentRole: MilitaryRole;
  onRoleChange: (role: MilitaryRole) => void;
  onRefresh: () => void;
  isDaylightMode?: boolean;
  onToggleDaylightMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  onRefresh,
  isDaylightMode = false,
  onToggleDaylightMode,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [isResetting, setIsResetting] = useState(false);
  const [isRoutingModalOpen, setIsRoutingModalOpen] = useState(false);

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

  const activePersona = MILITARY_PERSONAS[currentRole] || MILITARY_PERSONAS.Commander;

  return (
    <>
      <header className={`h-16 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 transition-colors border-b ${
        isDaylightMode
          ? 'bg-slate-100 border-slate-300 text-slate-800'
          : 'bg-navy-900 border-navy-700/60 text-white'
      }`}>
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
            <Plane className="w-6 h-6 text-slate-950 font-bold transform -rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-lg font-bold tracking-tight ${isDaylightMode ? 'text-slate-900' : 'text-white'}`}>
                AERONEX AI
              </h1>
              <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                TACTICAL C2
              </span>
              <span className="hidden xl:inline text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                AIR POWER OPTIMISATION
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-md hidden sm:block">
              Dynamic Air Operations & Resource Optimisation Platform
            </p>
          </div>
        </div>

        {/* Controls, C2 Info Flow & Role Selector */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* C2 Information Routing & Transformation Button */}
          <button
            onClick={() => setIsRoutingModalOpen(true)}
            className="px-2.5 py-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-700/80 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-cyan-950/50"
            title="Inspect how information is transformed and routed between the 4 military roles"
          >
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="hidden md:inline">C2 Comms & Info Routing</span>
          </button>

          {/* 4-Role Persona Selector */}
          <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border transition-all ${
            isDaylightMode
              ? 'bg-white border-slate-300 text-slate-900'
              : 'bg-navy-950 border-cyan-900/60 text-slate-100'
          }`}>
            <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${activePersona.avatarBg} flex items-center justify-center text-white shrink-0`}>
              {currentRole === 'Commander' ? (
                <Shield className="w-3.5 h-3.5" />
              ) : currentRole === 'Planner' ? (
                <Cpu className="w-3.5 h-3.5" />
              ) : currentRole === 'Pilot' ? (
                <Radio className="w-3.5 h-3.5" />
              ) : (
                <Wrench className="w-3.5 h-3.5" />
              )}
            </div>

            <div className="hidden lg:flex flex-col text-left mr-1">
              <span className="text-[11px] font-bold text-white leading-tight">
                {activePersona.callsign}
              </span>
              <span className="text-[9px] text-slate-400 font-mono">
                {activePersona.rank}
              </span>
            </div>

            <select
              value={currentRole}
              onChange={(e) => onRoleChange(e.target.value as MilitaryRole)}
              className="bg-transparent text-xs font-semibold text-cyan-300 focus:outline-none cursor-pointer py-0.5"
              title="Switch Military Persona (Chain-of-Command Role)"
            >
              <option value="Commander" className="bg-navy-900 text-white">Commander (AOC Vance)</option>
              <option value="Planner" className="bg-navy-900 text-white">Ops Planner (Wg Cdr Sharma)</option>
              <option value="Pilot" className="bg-navy-900 text-white">Flight Lead / Pilot (Sqn Ldr Sen)</option>
              <option value="Engineer" className="bg-navy-900 text-white">Tech Officer (Sqn Ldr Rao)</option>
            </select>
          </div>

          {/* Daylight / Midnight Mode Switch */}
          {onToggleDaylightMode && (
            <button
              onClick={onToggleDaylightMode}
              className={`p-2 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-colors ${
                isDaylightMode
                  ? 'bg-white border-slate-300 text-amber-600 hover:bg-slate-50'
                  : 'bg-navy-950 border-slate-700 text-cyan-400 hover:bg-navy-800'
              }`}
              title={isDaylightMode ? 'Switch to Tactical Midnight' : 'Switch to Daylight Command'}
            >
              {isDaylightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}

          {/* System Time */}
          <div className="hidden xl:flex items-center gap-2 text-xs font-mono bg-navy-950 px-3 py-1.5 rounded-md border border-navy-700 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{timeStr || 'ZULU TIME'}</span>
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
            <span className="hidden sm:inline">Reset Demo</span>
          </button>
        </div>
      </header>

      {/* C2 Information Routing & Transformation Modal */}
      <C2InfoRoutingModal
        isOpen={isRoutingModalOpen}
        onClose={() => setIsRoutingModalOpen(false)}
        activeRole={currentRole}
        onSelectRole={onRoleChange}
      />
    </>
  );
};



