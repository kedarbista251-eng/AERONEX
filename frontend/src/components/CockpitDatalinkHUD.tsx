import React, { useState } from 'react';
import { Radio, ShieldAlert, CheckCircle2, Compass, AlertTriangle, Send, Fuel } from 'lucide-react';

interface CockpitDatalinkHUDProps {
  onOpenATOBrief?: () => void;
  isDaylightMode?: boolean;
}

export const CockpitDatalinkHUD: React.FC<CockpitDatalinkHUDProps> = ({
  onOpenATOBrief,
  isDaylightMode = false,
}) => {
  const [isAcknowledged, setIsAcknowledged] = useState<boolean>(false);
  const [ackTimestamp, setAckTimestamp] = useState<string | null>(null);

  const handleAcknowledge = () => {
    const now = new Date();
    const timeFormatted = now.toTimeString().split(' ')[0] + 'Z';
    setIsAcknowledged(true);
    setAckTimestamp(timeFormatted);
  };

  return (
    <div className={`rounded-xl border p-4 transition-all shadow-xl ${
      isDaylightMode
        ? 'bg-gradient-to-r from-emerald-50 via-slate-50 to-emerald-50 border-emerald-300 text-slate-800'
        : 'bg-gradient-to-r from-emerald-950/40 via-navy-950 to-navy-900 border-emerald-500/50 text-white shadow-emerald-950/30'
    }`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Pilot Identity & Datalink Status */}
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20 shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                LINK-16 COCKPIT HUD
              </span>
              <span className="text-xs font-bold text-white font-mono">
                CALLSIGN: TIGER-LEAD (Viper-101 / Rafale F4)
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700">
                DATALINK: CONNECTED
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Automated in-flight retask order broadcast from Air Operations Center (AOC).
            </p>
          </div>
        </div>

        {/* Center: Live Flight Waypoints & Bingo Fuel */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs">
          <div className={`p-2 rounded-lg border ${
            isDaylightMode ? 'bg-white border-slate-200' : 'bg-navy-900/90 border-navy-800'
          }`}>
            <span className="text-[10px] text-slate-400 block uppercase">Ingress Steerpoint</span>
            <span className="text-cyan-400 font-bold">WP-3 (29.42°N, 77.12°E)</span>
          </div>

          <div className={`p-2 rounded-lg border ${
            isDaylightMode ? 'bg-white border-slate-200' : 'bg-navy-900/90 border-navy-800'
          }`}>
            <span className="text-[10px] text-slate-400 block uppercase">Contested Evasion</span>
            <span className="text-rose-400 font-bold flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 inline" />
              Radial 310° Bypass
            </span>
          </div>

          <div className={`p-2 rounded-lg border ${
            isDaylightMode ? 'bg-white border-slate-200' : 'bg-navy-900/90 border-navy-800'
          }`}>
            <span className="text-[10px] text-slate-400 block uppercase flex items-center gap-1">
              <Fuel className="w-3 h-3 text-amber-400" />
              Bingo Fuel Margin
            </span>
            <span className="text-amber-400 font-bold">1,850 kg (Sector-A Divert)</span>
          </div>
        </div>

        {/* Right: Pilot Acknowledgment Action */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenATOBrief && (
            <button
              onClick={onOpenATOBrief}
              className="px-3 py-2 rounded-lg bg-navy-800 hover:bg-navy-700 text-cyan-300 border border-cyan-800/80 font-mono text-xs font-bold transition-all"
            >
              Inspect ATO Brief
            </button>
          )}

          {isAcknowledged ? (
            <div className="px-3 py-2 rounded-lg bg-emerald-950 border border-emerald-600 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>ACKNOWLEDGED [WILCO] ({ackTimestamp})</span>
            </div>
          ) : (
            <button
              onClick={handleAcknowledge}
              className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all animate-pulse"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Acknowledge Datalink [WILCO]</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
