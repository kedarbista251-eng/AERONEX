import React, { useState } from 'react';
import {
  AlertOctagon, ShieldAlert, ArrowRight,
  TrendingDown, Zap, Radio, FileText, Send
} from 'lucide-react';
import type { RetaskingPlan } from '../types';

interface CrisisDisruptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  retaskingPlan: RetaskingPlan | null;
  onInjectCrisis: (type: string) => Promise<void>;
  onCommitRetasking: (approved: boolean, reviewer: string) => Promise<void>;
  isDaylightMode?: boolean;
}

export const CrisisDisruptionModal: React.FC<CrisisDisruptionModalProps> = ({
  isOpen,
  onClose,
  retaskingPlan,
  onInjectCrisis,
  onCommitRetasking,
  isDaylightMode = false,
}) => {
  const [selectedCrisisType, setSelectedCrisisType] = useState<string>('SAM_RADAR_ACTIVATED');
  const [reviewerName, setReviewerName] = useState<string>('Air Marshal R. Sharma');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleInject = async () => {
    try {
      setIsSubmitting(true);
      await onInjectCrisis(selectedCrisisType);
    } catch (err: any) {
      alert('Error injecting crisis: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommit = async (approved: boolean) => {
    try {
      setIsSubmitting(true);
      await onCommitRetasking(approved, reviewerName);
      onClose();
    } catch (err: any) {
      alert('Error committing retasking order: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border p-6 shadow-2xl transition-all ${
        isDaylightMode
          ? 'bg-white border-slate-300 text-slate-800'
          : 'bg-navy-900 border-rose-500/40 text-slate-100 shadow-rose-950/40'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4 mb-5 border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-mono tracking-tight flex items-center gap-2">
                <span>CONTESTED THREAT & IN-FLIGHT RETASKING ENGINE</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold uppercase">
                  OR-TOOLS RETASK
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Simulate real-time battle-space disruptions and generate sub-second evasive rerouting plans.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 font-mono text-lg p-2"
          >
            ✕
          </button>
        </div>

        {/* Crisis Injection Selector (Trigger Bar) */}
        <div className="bg-navy-950/80 p-4 rounded-xl border border-slate-800 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="w-full md:w-auto flex-1">
              <label className="block text-xs font-mono text-slate-400 mb-1">
                SELECT OPERATIONAL CRISIS TO INJECT:
              </label>
              <select
                value={selectedCrisisType}
                onChange={(e) => setSelectedCrisisType(e.target.value)}
                className="w-full bg-navy-900 border border-slate-700 text-cyan-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-cyan-500"
              >
                <option value="SAM_RADAR_ACTIVATED">
                  [THREAT POP-UP] Hostile S-400 SAM Radar Locked on Flight GARUDA-01
                </option>
                <option value="RUNWAY_DENIAL">
                  [AIRBASE ATTACK] Forward Base Foxtrot Runway 14/32 Denied & Cratered
                </option>
              </select>
            </div>

            <button
              onClick={handleInject}
              disabled={isSubmitting}
              className="w-full md:w-auto px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-600/30 shrink-0"
            >
              <Zap className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>INJECT CRISIS & SOLVE</span>
            </button>
          </div>
        </div>

        {/* Retasking Plan Output (when active) */}
        {retaskingPlan ? (
          <div className="space-y-6">
            {/* Crisis Alert Banner */}
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 flex items-start gap-3">
              <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-rose-300">
                    CRISIS DETECTED: {retaskingPlan.incident_id}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-900 text-rose-200 border border-rose-700 font-bold">
                    {retaskingPlan.urgency}
                  </span>
                </div>
                <p className="text-xs text-rose-200 mt-1">{retaskingPlan.crisis_summary}</p>
              </div>
            </div>

            {/* Delta Metrics (Before vs After) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-navy-950/70 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 block">THREAT RISK REDUCTION</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-bold font-mono text-emerald-400">
                    {retaskingPlan.delta_metrics.threat_exposure_reduction_pct}%
                  </span>
                  <TrendingDown className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-[9px] font-mono text-slate-400">Clear of SAM Envelope</span>
              </div>

              <div className="bg-navy-950/70 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 block">SURVIVABILITY SCORE</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-sm font-mono text-rose-400 line-through">
                    {retaskingPlan.delta_metrics.survivability_score_before}%
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className="text-xl font-bold font-mono text-emerald-400">
                    {retaskingPlan.delta_metrics.survivability_score_after}%
                  </span>
                </div>
                <span className="text-[9px] font-mono text-emerald-400 font-bold">+76.4% Gain</span>
              </div>

              <div className="bg-navy-950/70 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 block">FUEL COST DELTA</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-bold font-mono text-amber-400">
                    +{retaskingPlan.delta_metrics.fuel_pct_cost}%
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    (+{retaskingPlan.delta_metrics.fuel_burn_delta_kg}kg)
                  </span>
                </div>
                <span className="text-[9px] font-mono text-emerald-400">Within Safe Bingo Fuel</span>
              </div>

              <div className="bg-navy-950/70 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 block">ETA DELAY</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-bold font-mono text-cyan-400">
                    +{retaskingPlan.delta_metrics.eta_delay_minutes} min
                  </span>
                </div>
                <span className="text-[9px] font-mono text-slate-400">
                  +{retaskingPlan.delta_metrics.distance_delta_km} km dogleg
                </span>
              </div>
            </div>

            {/* Decision Radar Breakdown */}
            <div className="bg-navy-950/80 p-4 rounded-xl border border-slate-800">
              <h4 className="text-xs font-mono font-bold text-slate-300 mb-3 flex items-center gap-2">
                <span>EXPLAINABLE AI (XAI) DECISION RADAR MATRIX</span>
              </h4>
              <div className="space-y-2 font-mono text-xs">
                {Object.entries(retaskingPlan.decision_radar_scores).map(([key, score]) => (
                  <div key={key}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400 uppercase">{key.replace(/_/g, ' ')}</span>
                      <span className="text-cyan-400 font-bold">{score}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full"
                        style={{ width: `${score}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* XAI Natural Language Rationale */}
            <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/60">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 mb-1">
                <FileText className="w-3.5 h-3.5" />
                <span>AI RETASKING RATIONALE & DECONFLICTION REPORT:</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-mono">
                {retaskingPlan.xai_rationale}
              </p>
            </div>

            {/* Commander Sign-Off & Execution Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-mono text-slate-400">Reviewer:</span>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="bg-navy-950 border border-slate-700 text-xs font-mono text-cyan-300 rounded px-2.5 py-1.5 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  onClick={() => handleCommit(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 text-xs font-mono font-bold transition-all"
                >
                  Reject & Hold Course
                </button>
                <button
                  onClick={() => handleCommit(true)}
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/30"
                >
                  <Send className="w-4 h-4" />
                  <span>TRANSMIT VIA LINK-16 DATALINK</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-slate-400 font-mono text-xs">
            <Radio className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-pulse" />
            <span>Select a tactical disruption above and click "INJECT CRISIS & SOLVE" to test live dynamic retasking.</span>
          </div>
        )}
      </div>
    </div>
  );
};
