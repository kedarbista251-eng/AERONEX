import React, { useState, useEffect } from 'react';
import {
  TrendingUp, ShieldAlert, Fuel, Gauge, CloudRain,
  Play, Sparkles, CheckCircle, Crosshair
} from 'lucide-react';
import {
  ResponsiveContainer,
  XAxis, YAxis, Tooltip,
  CartesianGrid, AreaChart, Area, LineChart, Line
} from 'recharts';
import { api } from '../services/api';
import type { FleetPredictiveSummary, WhatIfSimResponse } from '../types';

export const PredictiveAnalytics: React.FC = () => {
  const [fleetSummary, setFleetSummary] = useState<FleetPredictiveSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [simLoading, setSimLoading] = useState<boolean>(false);

  // Simulation Controls
  const [selectedType, setSelectedType] = useState<string>('CARGO_TRANSPORT');
  const [distanceKm, setDistanceKm] = useState<number>(750);
  const [initialFuelPct, setInitialFuelPct] = useState<number>(85);
  const [countermeasures, setCountermeasures] = useState<boolean>(true);
  const [stealth, setStealth] = useState<boolean>(false);
  const [environmentStress, setEnvironmentStress] = useState<string>('NORMAL');

  // Active Simulation Result
  const [simResult, setSimResult] = useState<WhatIfSimResponse | null>(null);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const fleet = await api.getPredictiveFleetReadiness();
      setFleetSummary(fleet);

      // Run default simulation
      const defaultSim = await api.runWhatIfSimulation({
        aircraft_type: selectedType,
        distance_km: distanceKm,
        initial_fuel_pct: initialFuelPct,
        countermeasures,
        stealth,
        environment_stress: environmentStress,
      });
      setSimResult(defaultSim);
    } catch (err: any) {
      console.error('Error loading predictive analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleRunSimulation = async () => {
    try {
      setSimLoading(true);
      const res = await api.runWhatIfSimulation({
        aircraft_type: selectedType,
        distance_km: distanceKm,
        initial_fuel_pct: initialFuelPct,
        countermeasures,
        stealth,
        environment_stress: environmentStress,
      });
      setSimResult(res);
    } catch (err: any) {
      alert('Simulation error: ' + err.message);
    } finally {
      setSimLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 font-mono text-cyan-400 gap-3">
        <div className="animate-spin w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full" />
        Initializing Predictive AI Analytics & Reliability Models...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-navy-700/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Predictive Airpower Analytics & Attrition Modeling
            </h2>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-700/50">
              TACTICAL ATTRITION MODELING
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Weibull MTBF component degradation, Great-Circle Bingo fuel curves, and contested threat exposure forecast ($P_{'{'}surv{'}'}$).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-navy-900 border border-navy-700 px-3 py-1.5 rounded-lg text-xs font-mono text-cyan-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Operational Tempo: {fleetSummary?.fleet_operational_tempo || 'DEFCON-2'}</span>
          </div>
        </div>
      </div>

      {/* Top Fleet KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-navy-900/80 border border-navy-700/60 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase font-mono">Surge Sortie Capacity</p>
            <p className="text-2xl font-black text-white mt-1">
              {fleetSummary?.surge_capacity_pct}%
            </p>
            <p className="text-[11px] text-emerald-400 mt-0.5">
              {fleetSummary?.surge_ready_airframes} of {fleetSummary?.total_airframes_monitored} Airframes Surge Ready
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-navy-900/80 border border-navy-700/60 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase font-mono">Fleet Avg Airframe Health</p>
            <p className="text-2xl font-black text-cyan-400 mt-1">
              {fleetSummary?.fleet_average_health_score}/100
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Structural & Avionics Bus nominal
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Gauge className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-navy-900/80 border border-navy-700/60 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase font-mono">Current Route Survivability</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">
              {simResult?.survivability.overall_survivability_pct}%
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Classification: <span className="font-bold text-emerald-400">{simResult?.survivability.risk_classification}</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-navy-900/80 border border-navy-700/60 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase font-mono">Divert Fuel Margin</p>
            <p className="text-2xl font-black text-amber-400 mt-1">
              +{simResult?.fuel_profile.divert_fuel_margin_pct}%
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Above 15% Combat Reserve
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Fuel className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Interactive Workspace (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Interactive What-If Simulator Panel */}
        <div className="bg-navy-900/90 border border-navy-700 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-navy-700 pb-3">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Tactical What-If Simulator
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            {/* Airframe Type */}
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Target Airframe Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="CARGO_TRANSPORT">C-130 Hercules / Heavy Transport</option>
                <option value="RESCUE_HELICOPTER">ALH Dhruv / Rescue Helicopter</option>
                <option value="RECON_UAV">Netra UAV / Strategic Reconnaissance</option>
                <option value="PATROL_AIRCRAFT">Dornier 228 / Coastal Patrol</option>
                <option value="MEDEVAC">Air Ambulance / Critical Care Medevac</option>
              </select>
            </div>

            {/* Distance Slider */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Mission Distance</span>
                <span className="font-mono text-cyan-400">{distanceKm} km</span>
              </div>
              <input
                type="range"
                min="200"
                max="2400"
                step="50"
                value={distanceKm}
                onChange={(e) => setDistanceKm(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Initial Fuel Slider */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Initial Fuel Load</span>
                <span className="font-mono text-cyan-400">{initialFuelPct}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="100"
                step="5"
                value={initialFuelPct}
                onChange={(e) => setInitialFuelPct(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Environmental Stress */}
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Environmental Stress Vector</label>
              <select
                value={environmentStress}
                onChange={(e) => setEnvironmentStress(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="NORMAL">Standard Atmospheric Envelope</option>
                <option value="COASTAL_CORROSIVE">Coastal High-Salinity / Monsoonal</option>
                <option value="HIGHLAND_COLD">Highland Extreme Sub-Zero (10,000+ ft)</option>
                <option value="COMBAT_G_LOAD">Contested Combat High-G Maneuvering</option>
              </select>
            </div>

            {/* Toggles */}
            <div className="pt-2 border-t border-navy-800 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={countermeasures}
                  onChange={(e) => setCountermeasures(e.target.checked)}
                  className="rounded border-navy-700 bg-navy-950 text-cyan-500 focus:ring-0"
                />
                <span>Chaff/Flares & Active ECM Suite Active</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={stealth}
                  onChange={(e) => setStealth(e.target.checked)}
                  className="rounded border-navy-700 bg-navy-950 text-cyan-500 focus:ring-0"
                />
                <span>Low-Observable (Stealth) Ingress Profile</span>
              </label>
            </div>

            {/* Run Button */}
            <button
              onClick={handleRunSimulation}
              disabled={simLoading}
              className="w-full mt-3 py-2.5 px-4 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/30 transition-all disabled:opacity-50"
            >
              {simLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Calculating Trajectories...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  EXECUTE PREDICTIVE SIMULATION
                </>
              )}
            </button>
          </div>

          {/* Feasibility Composite Gauge */}
          {simResult && (
            <div className="bg-navy-950 border border-navy-800 rounded-lg p-3.5 space-y-2 text-center">
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                Composite Mission Feasibility Index
              </p>
              <div className="text-3xl font-black text-cyan-400 font-mono">
                {simResult.composite_feasibility_score}/100
              </div>
              <p className="text-[11px] text-slate-400">
                {simResult.reliability.recommended_action}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Predictive Curves (2 Rows) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart 1: Waypoint-by-Waypoint Survivability & Threat Exposure */}
          <div className="bg-navy-900/80 border border-navy-700/60 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-emerald-400" />
                  Waypoint Trajectory Survivability Curve $P_{'{'}surv{'}'}(t)$
                </h4>
                <p className="text-xs text-slate-400">
                  Calculates cumulative probability of mission survival against active SAM/Radar envelopes.
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Final: {simResult?.survivability.overall_survivability_pct}%
              </span>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={simResult?.survivability.waypoints_analysis || []}>
                  <defs>
                    <linearGradient id="survGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="threatGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="waypoint_name" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="survivability_pct"
                    name="Survivability P_surv"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#survGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="threat_exposure_score"
                    name="Threat Exposure Risk"
                    stroke="#EF4444"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#threatGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Dynamic Fuel Exhaustion Curve & Bingo Divert Margin */}
          <div className="bg-navy-900/80 border border-navy-700/60 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-amber-400" />
                  Dynamic Fuel Depletion & Bingo Return Threshold
                </h4>
                <p className="text-xs text-slate-400">
                  Time-series fuel profile indicating critical point of diversion to alternate forward base.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-amber-400 font-bold">Bingo: 25%</span>
                <span className="text-rose-400 font-bold">Emergency: 15%</span>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={simResult?.fuel_profile.profile_points || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="distance_km" stroke="#64748b" tick={{ fontSize: 11 }} unit="km" />
                  <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="projected_fuel_pct"
                    name="Fuel Level"
                    stroke="#38BDF8"
                    strokeWidth={2.5}
                    dot={{ fill: '#0284C7', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Reliability & Subsystem MTBF + Weather Window */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subsystem Health & Weibull Reliability */}
        <div className="bg-navy-900/80 border border-navy-700/60 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-cyan-400" />
              Subsystem Health & MTBF Degradation
            </h4>
            <span className="text-xs font-mono text-cyan-400">
              MTBF: {simResult?.reliability.effective_mtbf_hours} hrs
            </span>
          </div>

          <div className="space-y-3">
            {simResult && Object.entries(simResult.reliability.subsystem_health_scores).map(([name, score]) => (
              <div key={name} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300 capitalize">{name.replace(/_/g, ' ')}</span>
                  <span className="text-cyan-400 font-bold">{score}%</span>
                </div>
                <div className="h-2 w-full bg-navy-950 rounded-full overflow-hidden border border-navy-800">
                  <div
                    className={`h-full rounded-full ${
                      score >= 90 ? 'bg-emerald-500' : score >= 75 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-navy-800 grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div className="bg-navy-950 p-2 rounded border border-navy-800">
              <p className="text-slate-400 text-[10px]">30h Risk</p>
              <p className="text-emerald-400 font-bold mt-0.5">
                {simResult?.reliability.failure_risk_forecast.within_30_flight_hours_pct}%
              </p>
            </div>
            <div className="bg-navy-950 p-2 rounded border border-navy-800">
              <p className="text-slate-400 text-[10px]">60h Risk</p>
              <p className="text-amber-400 font-bold mt-0.5">
                {simResult?.reliability.failure_risk_forecast.within_60_flight_hours_pct}%
              </p>
            </div>
            <div className="bg-navy-950 p-2 rounded border border-navy-800">
              <p className="text-slate-400 text-[10px]">90h Risk</p>
              <p className="text-rose-400 font-bold mt-0.5">
                {simResult?.reliability.failure_risk_forecast.within_90_flight_hours_pct}%
              </p>
            </div>
          </div>
        </div>

        {/* Hyperlocal Weather Window Outlook */}
        <div className="bg-navy-900/80 border border-navy-700/60 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-cyan-400" />
              6-Hour Hyperlocal Destination Weather Horizon
            </h4>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              {fleetSummary?.sector_weather_horizons[0]?.operational_clearance.replace(/_/g, ' ') || 'VFR CLEARED'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-navy-800 text-slate-400">
                  <th className="pb-2">Time (UTC)</th>
                  <th className="pb-2">Wind (kts)</th>
                  <th className="pb-2">Vis (km)</th>
                  <th className="pb-2">Storm Risk</th>
                  <th className="pb-2">Flight Cat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800/60">
                {fleetSummary?.sector_weather_horizons[0]?.hourly_projections.slice(0, 5).map((row, i) => (
                  <tr key={i} className="hover:bg-navy-800/30">
                    <td className="py-2 text-white font-bold">{row.zulu_time}</td>
                    <td className="py-2 text-cyan-400">{row.projected_wind_kts} kts</td>
                    <td className="py-2 text-slate-300">{row.projected_visibility_km} km</td>
                    <td className="py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        row.storm_probability_pct > 50 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {row.storm_probability_pct}%
                      </span>
                    </td>
                    <td className="py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        row.flight_category === 'VFR' ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {row.flight_category}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
