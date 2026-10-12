import React from 'react';
import { FileText, Printer, Shield, CheckCircle, Crosshair, AlertTriangle } from 'lucide-react';
import type { ATOBriefingResponse } from '../types';

interface ATOBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  atoData: ATOBriefingResponse | null;
  isDaylightMode?: boolean;
}

export const ATOBriefingModal: React.FC<ATOBriefingModalProps> = ({
  isOpen,
  onClose,
  atoData,
  isDaylightMode = false,
}) => {
  if (!isOpen || !atoData) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border p-6 shadow-2xl transition-all font-mono ${
        isDaylightMode
          ? 'bg-white border-slate-300 text-slate-800'
          : 'bg-navy-900 border-cyan-500/40 text-slate-100 shadow-cyan-950/40'
      }`}>
        {/* ATO Classification Banner */}
        <div className="bg-amber-950/40 border border-amber-600/60 p-2 text-center text-amber-300 font-bold text-xs uppercase tracking-widest rounded-lg mb-5">
          {atoData.security_classification} // SIMULATED COMBAT OPERATIONS BRIEF
        </div>

        {/* Modal Controls */}
        <div className="flex items-center justify-between border-b pb-4 mb-4 border-slate-700/60">
          <div>
            <h2 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <span>AIR TASKING ORDER (ATO): {atoData.ato_number}</span>
            </h2>
            <p className="text-xs text-slate-400">Effective Zulu: {atoData.zulu_effective}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-navy-950 border border-slate-700 hover:text-cyan-400 text-xs flex items-center gap-1.5 transition-colors"
              title="Print Tactical ATO Briefing"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Order</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 text-lg px-2"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Mission Identification */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 text-xs bg-navy-950/80 p-3.5 rounded-xl border border-slate-800">
          <div>
            <span className="text-slate-400 block text-[10px]">CALLSIGN</span>
            <span className="font-bold text-cyan-300 text-sm">{atoData.mission_task.callsign}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">TAIL NUMBER</span>
            <span className="font-bold text-slate-200">{atoData.mission_task.tail_number}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">AIRCRAFT TYPE</span>
            <span className="font-bold text-slate-200">{atoData.mission_task.aircraft_type}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">PILOT IN COMMAND</span>
            <span className="font-bold text-emerald-400">{atoData.mission_task.pilot_in_command}</span>
          </div>
        </div>

        {/* Flight Profile & Transponder */}
        <div className="bg-navy-950/70 p-4 rounded-xl border border-slate-800 mb-5">
          <h4 className="text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>Assigned Flight Corridor & Telemetry Parameters</span>
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-navy-900/60 p-2.5 rounded border border-slate-800">
              <span className="text-slate-400 block text-[10px]">ALTITUDE CORRIDOR</span>
              <span className="font-bold text-cyan-300">{atoData.flight_corridor.flight_level}</span>
            </div>
            <div className="bg-navy-900/60 p-2.5 rounded border border-slate-800">
              <span className="text-slate-400 block text-[10px]">CRUISING SPEED</span>
              <span className="font-bold text-cyan-300">{atoData.flight_corridor.cruising_speed_kts} KTS</span>
            </div>
            <div className="bg-navy-900/60 p-2.5 rounded border border-slate-800">
              <span className="text-slate-400 block text-[10px]">MODE-S IFF SQUAWK</span>
              <span className="font-bold text-emerald-400">{atoData.flight_corridor.assigned_squawk_code}</span>
            </div>
            <div className="bg-navy-900/60 p-2.5 rounded border border-slate-800">
              <span className="text-slate-400 block text-[10px]">TACTICAL COMMS FREQ</span>
              <span className="font-bold text-slate-200">{atoData.flight_corridor.tactical_freq_mhz}</span>
            </div>
            <div className="bg-navy-900/60 p-2.5 rounded border border-slate-800">
              <span className="text-slate-400 block text-[10px]">BINGO FUEL LIMIT</span>
              <span className="font-bold text-amber-400">{atoData.flight_corridor.bingo_fuel_pct}% MINIMUM</span>
            </div>
            <div className="bg-navy-900/60 p-2.5 rounded border border-slate-800">
              <span className="text-slate-400 block text-[10px]">ALTERNATE RECOVERY</span>
              <span className="font-bold text-slate-200">{atoData.mission_task.alternate_recovery_base}</span>
            </div>
          </div>
        </div>

        {/* Ordnance & Stores Manifest */}
        <div className="bg-navy-950/70 p-4 rounded-xl border border-slate-800 mb-5">
          <h4 className="text-xs font-bold text-slate-300 mb-2.5 uppercase tracking-wider flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-cyan-400" />
            <span>Authorized Ordnance & Equipment Stores Manifest</span>
          </h4>

          <div className="space-y-1.5 text-xs">
            {atoData.ordnance_and_stores.map((store, idx) => (
              <div key={idx} className="flex justify-between items-center bg-navy-900/80 px-3 py-2 rounded border border-slate-800">
                <span className="font-semibold text-slate-300">{store.station}: {store.store}</span>
                <span className="text-cyan-400 font-bold">{store.qty}x ({store.weight_kg} kg)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rules of Engagement & Threat Warning */}
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/80 mb-5 text-xs">
          <div className="flex items-center gap-2 font-bold text-rose-300 mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span>THREAT POSTURE: {atoData.threat_environment.threat_warning_level}</span>
          </div>
          <p className="text-rose-200/90 leading-relaxed mb-2">
            {atoData.threat_environment.rules_of_engagement}
          </p>
          <div className="flex flex-wrap gap-2">
            {atoData.threat_environment.active_threats_along_sector.map((th, i) => (
              <span key={i} className="px-2 py-0.5 rounded bg-rose-900 text-rose-200 text-[10px] font-bold">
                {th.threat} ({th.lethality})
              </span>
            ))}
          </div>
        </div>

        {/* SPINS Special Instructions */}
        <div className="bg-navy-950/70 p-4 rounded-xl border border-slate-800 mb-5 text-xs text-slate-300 space-y-1">
          <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[11px] mb-2">
            SPECIAL INSTRUCTIONS (SPINS):
          </h4>
          {atoData.special_instructions_spins.map((spin, i) => (
            <p key={i} className="text-slate-400 leading-relaxed">{spin}</p>
          ))}
        </div>

        {/* Sign-off footer */}
        <div className="flex justify-between items-center text-xs text-slate-400 pt-3 border-t border-slate-800">
          <span>Authority: <b className="text-slate-200">{atoData.authorized_by}</b></span>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            DIGITALLY SIGNED & DISPATCHED
          </span>
        </div>
      </div>
    </div>
  );
};
