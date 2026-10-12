import React, { useState, useEffect } from 'react';
import {
  Compass, Radio, Zap, Activity, FileText,
  RefreshCw, Plane, ShieldAlert
} from 'lucide-react';
import { TacticalMap } from '../components/TacticalMap';
import { TimelineScrubber } from '../components/TimelineScrubber';
import { CrisisDisruptionModal } from '../components/CrisisDisruptionModal';
import { SensorFusionHub } from '../components/SensorFusionHub';
import { ATOBriefingModal } from '../components/ATOBriefingModal';
import { api } from '../services/api';
import type {
  TacticalCOPResponse, RetaskingPlan, FusionResponse, ATOBriefingResponse
} from '../types';

interface TacticalCOPProps {
  isDaylightMode?: boolean;
}

export const TacticalCOP: React.FC<TacticalCOPProps> = ({ isDaylightMode = false }) => {
  const [copData, setCopData] = useState<TacticalCOPResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [simTime, setSimTime] = useState<number>(0.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(null);

  // Modals & Panels
  const [isCrisisModalOpen, setIsCrisisModalOpen] = useState<boolean>(false);
  const [isFusionPanelOpen, setIsFusionPanelOpen] = useState<boolean>(false);
  const [isATOModalOpen, setIsATOModalOpen] = useState<boolean>(false);

  const [retaskingPlan, setRetaskingPlan] = useState<RetaskingPlan | null>(null);
  const [fusionData, setFusionData] = useState<FusionResponse | null>(null);
  const [atoData, setAtoData] = useState<ATOBriefingResponse | null>(null);

  const loadCOP = async (time: number = simTime) => {
    try {
      const data = await api.getTacticalCOP(time);
      setCopData(data);
      if (data.crisis_state?.retasking_plan) {
        setRetaskingPlan(data.crisis_state.retasking_plan);
      }
    } catch (err: any) {
      console.error('Error loading Tactical COP:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFusionData = async () => {
    try {
      const data = await api.getSensorFusion();
      setFusionData(data);
    } catch (err: any) {
      console.error('Error loading Sensor Fusion:', err);
    }
  };

  const handleOpenATO = async (missionId: string = 'REQ-2026-002') => {
    try {
      const data = await api.getMissionATO(missionId);
      setAtoData(data);
      setIsATOModalOpen(true);
    } catch (err: any) {
      alert('Error fetching ATO: ' + err.message);
    }
  };

  useEffect(() => {
    loadCOP(simTime);
  }, [simTime]);

  const handleToggleThreat = async (threatId: string) => {
    try {
      await api.toggleThreat(threatId);
      await loadCOP(simTime);
    } catch (err: any) {
      alert('Error toggling threat: ' + err.message);
    }
  };

  const handleInjectCrisis = async (crisisType: string) => {
    const plan = await api.injectCrisis(crisisType);
    setRetaskingPlan(plan);
    await loadCOP(simTime);
  };

  const handleCommitRetasking = async (approved: boolean, reviewer: string) => {
    await api.commitRetasking(approved, reviewer);
    setRetaskingPlan(null);
    await loadCOP(simTime);
    alert(approved ? 'Retasking order successfully transmitted via Link-16!' : 'Retasking rejected. Current route held.');
  };

  if (loading && !copData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-slate-400 font-mono text-sm">
        <Radio className="w-8 h-8 text-cyan-400 animate-pulse mb-3" />
        <span>ACQUIRING LINK-16 TACTICAL RADAR DATA...</span>
      </div>
    );
  }

  const activeThreatsCount = copData?.threat_zones.filter((t) => t.is_active).length || 0;
  const airbornePlanesCount = copData?.aircraft.filter((a) => a.status.includes('AIRBORNE')).length || 0;

  return (
    <div className="space-y-6">
      {/* Tactical Command Action Bar */}
      <div className={`p-4 rounded-2xl border shadow-lg flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 font-mono transition-colors ${
        isDaylightMode
          ? 'bg-white border-slate-300 text-slate-800'
          : 'bg-navy-900 border-cyan-900/40 text-slate-100'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
            <Compass className="w-6 h-6 animate-spin" style={{ animationDuration: '15s' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight">4D TACTICAL AIR OPERATIONS (COP)</h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                SIH26250
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 inline" />
                {activeThreatsCount} THREAT DOMES
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Contested Environment Simulation, Live Threat Domes & Real-Time Dynamic Retasking
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Inject Crisis Button */}
          <button
            onClick={() => setIsCrisisModalOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-rose-600/20"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>INJECT THREAT / RETASK</span>
          </button>

          {/* Sensor Fusion Hub Button */}
          <button
            onClick={() => {
              loadFusionData();
              setIsFusionPanelOpen(!isFusionPanelOpen);
            }}
            className={`px-3.5 py-2 rounded-lg border text-xs font-bold flex items-center gap-2 transition-colors ${
              isFusionPanelOpen
                ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                : 'bg-navy-950 text-cyan-300 border-slate-700 hover:bg-navy-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>DATA FUSION HUB</span>
          </button>

          {/* ATO Briefing Button */}
          <button
            onClick={() => handleOpenATO('REQ-2026-002')}
            className="px-3.5 py-2 rounded-lg bg-navy-950 border border-slate-700 text-slate-300 hover:text-cyan-400 text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>MISSION ATO</span>
          </button>

          {/* Refresh */}
          <button
            onClick={() => loadCOP(simTime)}
            className="p-2 rounded-lg bg-navy-950 border border-slate-700 text-slate-300 hover:text-cyan-400 transition-colors"
            title="Refresh Link-16 Tracks"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sensor Fusion Drawer (if toggled open) */}
      {isFusionPanelOpen && (
        <div className="animate-in fade-in duration-200">
          <SensorFusionHub
            fusionData={fusionData}
            onRefresh={loadFusionData}
            isDaylightMode={isDaylightMode}
          />
        </div>
      )}

      {/* Main Interactive Tactical Map */}
      <TacticalMap
        airbases={copData?.airbases || []}
        threatZones={copData?.threat_zones || []}
        aircraft={copData?.aircraft || []}
        selectedAircraftId={selectedAircraftId}
        onSelectAircraft={setSelectedAircraftId}
        onToggleThreat={handleToggleThreat}
        isDaylightMode={isDaylightMode}
      />

      {/* 4D Simulation Timeline Scrubber */}
      <TimelineScrubber
        simTime={simTime}
        onSimTimeChange={setSimTime}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        playbackSpeed={playbackSpeed}
        onChangeSpeed={setPlaybackSpeed}
        isDaylightMode={isDaylightMode}
      />

      {/* Live In-Flight Telemetry Fleet Grid */}
      <div className={`p-6 rounded-2xl border shadow-xl font-mono transition-colors ${
        isDaylightMode
          ? 'bg-white border-slate-300 text-slate-800'
          : 'bg-navy-900 border-cyan-900/40 text-slate-100'
      }`}>
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-700/60">
          <div className="flex items-center gap-2">
            <Plane className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold tracking-tight">ACTIVE AIRCRAFT TELEMETRY & WEAPON LOADOUTS</h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
              {airbornePlanesCount} AIRBORNE / {copData?.aircraft.length} MONITORED
            </span>
          </div>
          <span className="text-xs text-slate-400">Click any aircraft card to track on tactical map</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {copData?.aircraft.map((ac) => {
            const isSelected = selectedAircraftId === ac.id;
            const hasAlert = ac.threat_alert || ac.threat_proximity_alert;

            return (
              <div
                key={ac.id}
                onClick={() => setSelectedAircraftId(isSelected ? null : ac.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-500/10'
                    : hasAlert
                    ? 'bg-rose-950/20 border-rose-800 hover:border-rose-600'
                    : 'bg-navy-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-cyan-300">{ac.callsign}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        hasAlert
                          ? 'bg-rose-900 text-rose-200 animate-pulse'
                          : 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                      }`}>
                        {ac.status}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">{ac.name} • {ac.type}</span>
                  </div>

                  <span className={`text-xs font-bold ${ac.fuel_pct < 35 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {ac.fuel_pct}% Fuel
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1 text-[10px] bg-navy-900/60 p-2 rounded border border-slate-800 mb-2">
                  <div>
                    <span className="text-slate-400 block">ALT</span>
                    <span className="font-bold text-slate-200">{ac.altitude_ft.toLocaleString()} ft</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">SPEED</span>
                    <span className="font-bold text-slate-200">{ac.speed_kts} kts</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">HDG</span>
                    <span className="font-bold text-slate-200">{ac.heading_deg}°</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-300 flex justify-between pt-1 border-t border-slate-800/80">
                  <span className="truncate max-w-[150px]">To: {ac.destination_base.split(' ')[0]}</span>
                  <span className="text-cyan-400 font-bold">{ac.weapon_loadout.length} Stores Loaded</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Crisis Retasking Modal */}
      <CrisisDisruptionModal
        isOpen={isCrisisModalOpen}
        onClose={() => setIsCrisisModalOpen(false)}
        retaskingPlan={retaskingPlan}
        onInjectCrisis={handleInjectCrisis}
        onCommitRetasking={handleCommitRetasking}
        isDaylightMode={isDaylightMode}
      />

      {/* ATO Briefing Modal */}
      <ATOBriefingModal
        isOpen={isATOModalOpen}
        onClose={() => setIsATOModalOpen(false)}
        atoData={atoData}
        isDaylightMode={isDaylightMode}
      />
    </div>
  );
};
