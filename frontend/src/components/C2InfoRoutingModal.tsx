import React, { useState } from 'react';
import {
  X, Shield, Radio, Cpu, Wrench, Users, ArrowRight,
  CheckCircle2, Clock, Send, Lock
} from 'lucide-react';
import type { MilitaryRole } from '../types';
import { MILITARY_PERSONAS, C2_INFORMATION_ROUTING_PIPELINE } from '../services/militaryPersonas';

interface C2InfoRoutingModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRole: MilitaryRole;
  onSelectRole: (role: MilitaryRole) => void;
}

export const C2InfoRoutingModal: React.FC<C2InfoRoutingModalProps> = ({
  isOpen,
  onClose,
  activeRole,
  onSelectRole,
}) => {
  const [selectedPipelineStep, setSelectedPipelineStep] = useState<number>(4); // Default to Pilot datalink step
  const [activeTabRole, setActiveTabRole] = useState<MilitaryRole>(activeRole);
  const [isSimulatingDispatch, setIsSimulatingDispatch] = useState<boolean>(false);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentPersona = MILITARY_PERSONAS[activeTabRole];

  const handleSimulateDispatch = () => {
    setIsSimulatingDispatch(true);
    setDispatchStatus('Transmitting via Link-16 Tactical Datalink (MIL-STD-6016)...');
    setTimeout(() => {
      setDispatchStatus('J-Series Message J2.2 received by Viper-101 Cockpit MFD — Pilot WILCO Acknowledged (14:02:40Z)');
      setIsSimulatingDispatch(false);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-navy-900 border border-cyan-500/50 rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl shadow-cyan-950/40 text-slate-100 flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-navy-700/80 flex items-start justify-between bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-slate-950 font-bold">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold">
                  MILITARY C2 ARCHITECTURE
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                  4 OPERATIONAL ROLES
                </span>
                <span className="hidden sm:inline text-[10px] font-mono text-slate-400 bg-navy-950 px-2 py-0.5 rounded border border-navy-800">
                  LINK-16 SECURE DATALINK
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight mt-1">
                C2 Information Transformation & Operational Role Routing
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 text-sm overflow-y-auto">
          {/* Quick Explanation Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/50 to-blue-950/40 border border-cyan-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-bold text-cyan-300 text-sm flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-400" />
                How Information Transforms for Each Operational Persona
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                In military air operations, different personnel never see raw unprocessed noise. Raw radar and avionics data is <strong>synthesized by AI</strong>, translated into <strong>actionable plans for Planners</strong>, distilled into <strong>veto cards for Commanders</strong>, broadcast via <strong>Link-16 cockpit datalink to Pilots</strong>, and converted into <strong>Weibull MTBF component wear for Engineers</strong>.
              </p>
            </div>

            <button
              onClick={handleSimulateDispatch}
              disabled={isSimulatingDispatch}
              className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-mono font-bold text-xs flex items-center gap-2 shrink-0 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Send className={`w-3.5 h-3.5 ${isSimulatingDispatch ? 'animate-bounce' : ''}`} />
              <span>{isSimulatingDispatch ? 'Broadcasting Datalink...' : 'Simulate Datalink Broadcast'}</span>
            </button>
          </div>

          {dispatchStatus && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{dispatchStatus}</span>
            </div>
          )}

          {/* Interactive Pipeline Sequence (5 Stages) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono uppercase font-bold text-slate-400 tracking-wider">
                End-to-End C2 Information Transformation Pipeline
              </h4>
              <span className="text-[11px] font-mono text-cyan-400">
                Click any stage to inspect transmission details
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {C2_INFORMATION_ROUTING_PIPELINE.map((node) => {
                const isSelected = selectedPipelineStep === node.stageNumber;
                return (
                  <button
                    key={node.stageNumber}
                    onClick={() => {
                      setSelectedPipelineStep(node.stageNumber);
                      setActiveTabRole(node.role);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-lg shadow-cyan-950/50'
                        : 'bg-navy-950/60 border-navy-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-navy-900 border border-navy-700 text-cyan-400">
                        STAGE {node.stageNumber}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400">{node.latency}</span>
                    </div>
                    <p className="font-bold text-xs text-white line-clamp-1">{node.stage}</p>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">Actor: {node.actor}</p>
                  </button>
                );
              })}
            </div>

            {/* Selected Stage Detail Panel */}
            {(() => {
              const activeNode = C2_INFORMATION_ROUTING_PIPELINE.find(n => n.stageNumber === selectedPipelineStep)!;
              return (
                <div className="p-4 rounded-xl bg-navy-950 border border-navy-700 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                      <h4 className="font-bold text-white text-sm">
                        Stage {activeNode.stageNumber}: {activeNode.stage}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-slate-400">Channel:</span>
                      <span className="text-cyan-400 font-bold">{activeNode.transmissionChannel}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-navy-900/80 border border-navy-800 space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">1. Data Ingestion Input</span>
                      <p className="text-slate-200 leading-relaxed">{activeNode.dataInput}</p>
                    </div>

                    <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/80 space-y-1">
                      <span className="text-[10px] font-mono uppercase text-cyan-400 block font-bold">2. AI Transformation Process</span>
                      <p className="text-cyan-200 leading-relaxed">{activeNode.transformationProcess}</p>
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/80 space-y-1">
                      <span className="text-[10px] font-mono uppercase text-emerald-400 block font-bold">3. Transformed Output Routed</span>
                      <p className="text-emerald-200 leading-relaxed font-semibold">{activeNode.dataOutput}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 4 Roles Explorer Tabs */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-navy-800 pb-2">
              <h4 className="text-xs font-mono uppercase font-bold text-slate-400 tracking-wider">
                Inspect 4 Chain-of-Command Roles & Individual Workstations
              </h4>
              <span className="text-xs text-slate-400 font-mono">
                Active in Session: <strong className="text-cyan-300">{activeRole}</strong>
              </span>
            </div>

            {/* Role Tab Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['Commander', 'Planner', 'Pilot', 'Engineer'] as MilitaryRole[]).map((r) => {
                const p = MILITARY_PERSONAS[r];
                const isActiveTab = activeTabRole === r;
                return (
                  <button
                    key={r}
                    onClick={() => setActiveTabRole(r)}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                      isActiveTab
                        ? 'bg-gradient-to-r from-navy-900 to-navy-800 border-cyan-400 text-white shadow-md'
                        : 'bg-navy-950/80 border-navy-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${p.avatarBg} flex items-center justify-center text-white shrink-0 font-bold text-xs`}>
                      {r === 'Commander' ? <Shield className="w-5 h-5" /> : r === 'Planner' ? <Cpu className="w-5 h-5" /> : r === 'Pilot' ? <Radio className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-white truncate">{p.name}</p>
                      <p className="text-[10px] text-cyan-400 font-mono truncate">{p.callsign}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Persona Deep-Dive Card */}
            <div className="p-5 rounded-2xl bg-navy-950 border border-navy-700 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-navy-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${currentPersona.avatarBg} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                    {activeTabRole[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">{currentPersona.name}</h3>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-navy-900 text-cyan-400 border border-navy-700">
                        {currentPersona.rank}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{currentPersona.roleTitle} • Unit: {currentPersona.unit}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                    {currentPersona.clearance}
                  </span>
                  <button
                    onClick={() => {
                      onSelectRole(activeTabRole);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 transition-all"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Switch to this Role</span>
                  </button>
                </div>
              </div>

              {/* Persona Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-navy-900 border border-navy-800">
                  <span className="text-[10px] text-slate-400 uppercase block">Authority Level</span>
                  <span className="text-amber-400 font-bold text-xs">{currentPersona.authorityLevel}</span>
                </div>

                <div className="p-3 rounded-xl bg-navy-900 border border-navy-800">
                  <span className="text-[10px] text-slate-400 uppercase block">Primary Mission</span>
                  <span className="text-emerald-400 font-bold text-xs">{currentPersona.primaryMission}</span>
                </div>

                <div className="p-3 rounded-xl bg-navy-900 border border-navy-800">
                  <span className="text-[10px] text-slate-400 uppercase block">Active Datalink Channel</span>
                  <span className="text-cyan-400 font-bold text-xs">{currentPersona.activeDatalink}</span>
                </div>
              </div>

              {/* Key Role Responsibilities & How they get informed */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="space-y-2">
                  <h5 className="text-xs font-mono uppercase font-bold text-slate-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    How They Receive & Process Information
                  </h5>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {currentPersona.keyResponsibilities.map((resp, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-cyan-400 font-mono font-bold">›</span>
                        <span>{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Specific Highlight for Role */}
                <div className="p-3.5 rounded-xl bg-navy-900/80 border border-navy-800 text-xs space-y-2">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                    {activeTabRole === 'Pilot'
                      ? '✈️ Flight Lead Cockpit Telemetry Protocol'
                      : activeTabRole === 'Commander'
                      ? '⚖️ Strategic Veto Authority Protocol'
                      : activeTabRole === 'Planner'
                      ? '⚡ Deterministic 9-Rule Solver Protocol'
                      : '🔧 Weibull MTBF Logistics Protocol'}
                  </span>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    {activeTabRole === 'Pilot' && (
                      <>Flight Lead receives real-time <strong>MIL-STD-6016 Link-16 J-Series messages</strong> directly onto Cockpit MFD displays. When dynamic retasking occurs, waypoints update instantly with zero voice channel delay, showing safe radar avoidance corridors and exact Bingo fuel lines.</>
                    )}
                    {activeTabRole === 'Commander' && (
                      <>Commander holds sole constitutional veto authority. The system presents Pareto trade-offs and explainable AI constraint proofs. Without the Commander's cryptographic signature, no in-flight retasking order can be dispatched to combat aircrew.</>
                    )}
                    {activeTabRole === 'Planner' && (
                      <>Operations Planners execute deterministic solvers that crunch 9 hard constraints across 7 disparate intelligence feeds simultaneously. Guarantees zero unverified missions reach the Commander or Flight Lead.</>
                    )}
                    {activeTabRole === 'Engineer' && (
                      <>Technical Officers monitor airframe stress and Weibull reliability degradation curves to guarantee hangar turnaround schedules and fuel allocations for maximum Sortie Generation Rate (SGR).</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-navy-700/80 bg-navy-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>REAL-TIME RBAC & INFORMATION DISPATCH ACTIVE</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-navy-800 hover:bg-navy-700 text-white font-mono text-xs font-bold transition-colors"
          >
            Close Architecture View
          </button>
        </div>
      </div>
    </div>
  );
};
