import React, { useState, useRef, useMemo } from 'react';
import {
  Compass, ZoomIn, ZoomOut, RotateCcw,
  Disc, Layers
} from 'lucide-react';
import type { Airbase, ThreatZone, AircraftTelemetry } from '../types';

interface TacticalMapProps {
  airbases: Airbase[];
  threatZones: ThreatZone[];
  aircraft: AircraftTelemetry[];
  selectedAircraftId: string | null;
  onSelectAircraft: (aircraftId: string | null) => void;
  onToggleThreat: (threatId: string) => void;
  isDaylightMode?: boolean;
}

export const TacticalMap: React.FC<TacticalMapProps> = ({
  airbases,
  threatZones,
  aircraft,
  selectedAircraftId,
  onSelectAircraft,
  onToggleThreat,
  isDaylightMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Layer Visibility
  const [showAirbases, setShowAirbases] = useState<boolean>(true);
  const [showThreats, setShowThreats] = useState<boolean>(true);
  const [showRoutes, setShowRoutes] = useState<boolean>(true);
  const [showRangeRings, setShowRangeRings] = useState<boolean>(true);
  const [showRadarSweep, setShowRadarSweep] = useState<boolean>(true);

  // Geographic bounds of the theater
  const bounds = useMemo(() => ({
    minLat: 16.0,
    maxLat: 35.5,
    minLng: 71.0,
    maxLng: 79.5,
  }), []);

  // Map dimensions for projection
  const mapWidth = 1000;
  const mapHeight = 700;

  const project = (lat: number, lng: number) => {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * (mapWidth - 160) + 80;
    const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * (mapHeight - 140) + 70;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click drag
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.max(0.7, Math.min(2.5, prev + delta)));
  };

  const handleResetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const selectedAc = aircraft.find((a) => a.id === selectedAircraftId);

  // Color constants based on theme
  const bgFill = isDaylightMode ? '#F8FAFC' : '#040812';
  const gridLineColor = isDaylightMode ? 'rgba(148, 163, 184, 0.25)' : 'rgba(56, 189, 248, 0.08)';
  const radarSweepColor = isDaylightMode ? 'rgba(14, 165, 233, 0.08)' : 'rgba(6, 182, 212, 0.06)';

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[620px] rounded-xl overflow-hidden select-none border transition-colors ${
        isDaylightMode
          ? 'bg-slate-50 border-slate-300 shadow-md'
          : 'bg-navy-950 border-cyan-900/40 shadow-2xl shadow-cyan-950/40'
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {/* HUD Header Overlay */}
      <div className="absolute top-3 left-4 z-20 flex items-center gap-3 pointer-events-none">
        <div className={`px-3 py-1.5 rounded-lg border backdrop-blur-md flex items-center gap-2 ${
          isDaylightMode ? 'bg-white/90 border-slate-300 text-slate-800' : 'bg-navy-900/80 border-cyan-500/30 text-cyan-400'
        }`}>
          <Compass className="w-4 h-4 animate-spin text-cyan-500" style={{ animationDuration: '12s' }} />
          <span className="text-xs font-mono font-bold tracking-widest uppercase">
            THEATER COP: NORTH-WEST SECTOR
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>

        <div className={`hidden md:flex px-3 py-1.5 rounded-lg border text-xs font-mono backdrop-blur-md ${
          isDaylightMode ? 'bg-white/90 border-slate-300 text-slate-600' : 'bg-navy-900/80 border-slate-700 text-slate-300'
        }`}>
          ZOOM: {Math.round(zoom * 100)}% | ACTIVE TRACKS: {aircraft.length} | THREATS: {threatZones.filter((t) => t.is_active).length}
        </div>
      </div>

      {/* Layer Controls & Zoom Toolbar */}
      <div className="absolute top-3 right-4 z-20 flex items-center gap-2">
        {/* Layer Visibility Toggle Popover */}
        <div className="flex items-center bg-navy-900/90 border border-slate-700/80 rounded-lg p-1 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-1 px-1.5 py-1 text-slate-400 border-r border-slate-700/60 mr-1">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] font-mono hidden sm:inline">LAYERS:</span>
          </div>
          <button
            onClick={() => setShowAirbases(!showAirbases)}
            title="Toggle Airbases"
            className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1 transition-all ${
              showAirbases ? 'bg-cyan-500/20 text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Bases
          </button>
          <button
            onClick={() => setShowThreats(!showThreats)}
            title="Toggle Threats"
            className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1 transition-all ${
              showThreats ? 'bg-rose-500/20 text-rose-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Threats
          </button>
          <button
            onClick={() => setShowRoutes(!showRoutes)}
            title="Toggle Flight Routes"
            className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1 transition-all ${
              showRoutes ? 'bg-emerald-500/20 text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Corridors
          </button>
          <button
            onClick={() => setShowRadarSweep(!showRadarSweep)}
            title="Toggle Radar Sweep"
            className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1 transition-all ${
              showRadarSweep ? 'bg-amber-500/20 text-amber-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Radar
          </button>
          <button
            onClick={() => setShowRangeRings(!showRangeRings)}
            title="Toggle Range Rings"
            className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1 transition-all ${
              showRangeRings ? 'bg-indigo-500/20 text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Rings
          </button>
        </div>

        {/* Zoom In/Out Buttons */}
        <div className="flex items-center bg-navy-900/90 border border-slate-700/80 rounded-lg p-1 shadow-lg backdrop-blur-md">
          <button
            onClick={() => handleZoom(0.2)}
            className="p-1.5 text-slate-300 hover:text-cyan-400 hover:bg-navy-800 rounded"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(-0.2)}
            className="p-1.5 text-slate-300 hover:text-cyan-400 hover:bg-navy-800 rounded"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetView}
            className="p-1.5 text-slate-300 hover:text-cyan-400 hover:bg-navy-800 rounded"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SVG Canvas with Pan & Zoom Transform */}
      <svg
        viewBox={`0 0 ${mapWidth} ${mapHeight}`}
        className="w-full h-full pointer-events-auto"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.15s ease-out',
        }}
      >
        <defs>
          {/* Background grid pattern */}
          <pattern id="tactical-grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke={gridLineColor} strokeWidth="0.8" />
            <circle cx="0" cy="0" r="1.5" fill={gridLineColor} />
          </pattern>

          {/* SAM Threat Gradient */}
          <radialGradient id="sam-threat-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#ef4444" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
          </radialGradient>

          {/* Radar Dome Gradient */}
          <radialGradient id="radar-dome-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.30" />
            <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.01" />
          </radialGradient>

          {/* Weather Storm Gradient */}
          <radialGradient id="weather-storm-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.40" />
            <stop offset="65%" stopColor="#a855f7" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.02" />
          </radialGradient>

          {/* Radar Sweep Arc Animation */}
          <linearGradient id="sweep-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Map Background */}
        <rect width={mapWidth} height={mapHeight} fill={bgFill} />
        <rect width={mapWidth} height={mapHeight} fill="url(#tactical-grid)" />

        {/* Animated Radar Sweep Cone */}
        {showRadarSweep && (
          <g transform={`translate(${mapWidth / 2}, ${mapHeight / 2})`}>
            <circle r="340" fill="none" stroke={radarSweepColor} strokeWidth="1" strokeDasharray="4 6" />
            <circle r="220" fill="none" stroke={radarSweepColor} strokeWidth="1" strokeDasharray="4 6" />
            <circle r="110" fill="none" stroke={radarSweepColor} strokeWidth="1" />
            <line x1="-340" y1="0" x2="340" y2="0" stroke={radarSweepColor} strokeWidth="1" />
            <line x1="0" y1="-340" x2="0" y2="340" stroke={radarSweepColor} strokeWidth="1" />
          </g>
        )}

        {/* 1. THREAT ZONES (Rendered under flight paths) */}
        {showThreats &&
          threatZones.map((threat) => {
            if (!threat.is_active) return null;
            const pt = project(threat.lat, threat.lng);
            // Approximate radius in pixels (1 km ~ 0.55 px at base scale)
            const pxRadius = threat.radius_km * 0.65;
            const pxLethal = (threat.lethal_radius_km || 0) * 0.65;

            const isSam = threat.type === 'SAM_SYSTEM';
            const isRadar = threat.type === 'RADAR_DOME';

            const fillGrad = isSam
              ? 'url(#sam-threat-grad)'
              : isRadar
              ? 'url(#radar-dome-grad)'
              : 'url(#weather-storm-grad)';
            const strokeColor = isSam ? '#ef4444' : isRadar ? '#f59e0b' : '#a855f7';

            return (
              <g
                key={threat.id}
                className="cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleThreat(threat.id);
                }}
              >
                {/* Outer Detection Envelope */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={pxRadius}
                  fill={fillGrad}
                  stroke={strokeColor}
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                  className="transition-all hover:stroke-width-3"
                />

                {/* Lethal Inner Ring (for SAM systems) */}
                {pxLethal > 0 && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={pxLethal}
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth="2.2"
                    strokeDasharray="2 2"
                    className="animate-pulse"
                  />
                )}

                {/* Threat Center Icon & Label */}
                <circle cx={pt.x} cy={pt.y} r="5" fill={strokeColor} />
                <text
                  x={pt.x}
                  y={pt.y - pxRadius - 6}
                  textAnchor="middle"
                  fill={strokeColor}
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {threat.name.toUpperCase()} [{threat.radius_km}KM]
                </text>
              </g>
            );
          })}

        {/* 2. FLIGHT CORRIDORS & WAYPOINTS */}
        {showRoutes &&
          aircraft.map((ac) => {
            const activeWps = ac.active_waypoints || ac.waypoints || [];
            if (activeWps.length < 2) return null;

            const pointsString = activeWps
              .map((wp) => {
                const p = project(wp.lat, wp.lng);
                return `${p.x},${p.y}`;
              })
              .join(' ');

            const isSelected = selectedAircraftId === ac.id;
            const isRetasked = ac.is_retasked;
            const strokeCol = isRetasked
              ? '#10b981' // Green evasive route
              : isSelected
              ? '#38bdf8'
              : 'rgba(56, 189, 248, 0.4)';

            return (
              <g key={`route-${ac.id}`}>
                {/* Route Line */}
                <polyline
                  points={pointsString}
                  fill="none"
                  stroke={strokeCol}
                  strokeWidth={isSelected ? 3.0 : 1.8}
                  strokeDasharray={isRetasked ? '6 3' : isSelected ? 'none' : '4 3'}
                  strokeLinecap="round"
                />

                {/* Waypoint Markers */}
                {activeWps.map((wp, idx) => {
                  const wpPos = project(wp.lat, wp.lng);
                  return (
                    <circle
                      key={`wp-${ac.id}-${idx}`}
                      cx={wpPos.x}
                      cy={wpPos.y}
                      r="3"
                      fill={strokeCol}
                      stroke={bgFill}
                      strokeWidth="1"
                    />
                  );
                })}
              </g>
            );
          })}

        {/* 3. AIRBASES */}
        {showAirbases &&
          airbases.map((base) => {
            const pt = project(base.lat, base.lng);
            return (
              <g
                key={base.id}
                className="cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Airbase Pulse Ring */}
                <circle cx={pt.x} cy={pt.y} r="14" fill="none" stroke="#0ea5e9" strokeWidth="1" strokeOpacity="0.4" />
                <circle cx={pt.x} cy={pt.y} r="8" fill="#0369a1" stroke="#38bdf8" strokeWidth="1.5" />
                <circle cx={pt.x} cy={pt.y} r="3" fill="#f8fafc" />

                {/* Runway lines marker */}
                <line x1={pt.x - 7} y1={pt.y} x2={pt.x + 7} y2={pt.y} stroke="#ffffff" strokeWidth="1.2" />

                {/* Label */}
                <text
                  x={pt.x}
                  y={pt.y + 18}
                  textAnchor="middle"
                  fill={isDaylightMode ? '#1e293b' : '#94a3b8'}
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {base.name.split('(')[0].trim()}
                </text>
                <text
                  x={pt.x}
                  y={pt.y + 28}
                  textAnchor="middle"
                  fill="#0ea5e9"
                  fontSize="8"
                  fontFamily="monospace"
                >
                  {base.readiness} | {base.runways[0].split(' ')[0]}
                </text>
              </g>
            );
          })}

        {/* 4. AIRCRAFT TRACKS (Topmost layer) */}
        {aircraft.map((ac) => {
          const pt = project(ac.lat, ac.lng);
          const isSelected = selectedAircraftId === ac.id;
          const hasThreatAlert = ac.threat_alert || ac.threat_proximity_alert;

          const acColor = hasThreatAlert ? '#f43f5e' : isSelected ? '#38bdf8' : '#22d3ee';

          // Velocity vector point (length proportional to speed)
          const rad = (ac.heading_deg * Math.PI) / 180;
          const vecLen = Math.min(35, Math.max(15, (ac.speed_kts / 350) * 28));
          const vecX = pt.x + Math.sin(rad) * vecLen;
          const vecY = pt.y - Math.cos(rad) * vecLen;

          return (
            <g
              key={ac.id}
              className="cursor-pointer transition-transform"
              onClick={(e) => {
                e.stopPropagation();
                onSelectAircraft(isSelected ? null : ac.id);
              }}
            >
              {/* Threat Alert Halo */}
              {hasThreatAlert && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="24"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="2"
                  className="animate-ping"
                  opacity="0.8"
                />
              )}

              {/* Combat Range Endurance Ring (if selected) */}
              {showRangeRings && isSelected && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={ac.combat_radius_km * 0.28}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.2"
                  strokeDasharray="4 4"
                  opacity="0.5"
                />
              )}

              {/* Selection Halo */}
              {isSelected && (
                <circle cx={pt.x} cy={pt.y} r="18" fill="rgba(56, 189, 248, 0.2)" stroke="#38bdf8" strokeWidth="1.5" />
              )}

              {/* Velocity Vector Line */}
              {ac.speed_kts > 0 && (
                <line
                  x1={pt.x}
                  y1={pt.y}
                  x2={vecX}
                  y2={vecY}
                  stroke={acColor}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              )}

              {/* Aircraft Icon (Rotated to heading) */}
              <g transform={`translate(${pt.x}, ${pt.y}) rotate(${ac.heading_deg})`}>
                <polygon
                  points="0,-10 6,8 0,5 -6,8"
                  fill={acColor}
                  stroke={bgFill}
                  strokeWidth="1.2"
                />
              </g>

              {/* Callsign & Altitude Data Tag (MIL-STD HUD Tag) */}
              <g transform={`translate(${pt.x + 12}, ${pt.y - 12})`}>
                <rect
                  x="0"
                  y="0"
                  width="85"
                  height="26"
                  rx="3"
                  fill={isDaylightMode ? '#ffffff' : '#090f1e'}
                  stroke={isSelected ? '#38bdf8' : hasThreatAlert ? '#f43f5e' : '#334155'}
                  strokeWidth="1"
                  opacity="0.92"
                />
                <text
                  x="5"
                  y="11"
                  fill={hasThreatAlert ? '#f43f5e' : isDaylightMode ? '#0f172a' : '#f8fafc'}
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {ac.callsign}
                </text>
                <text
                  x="5"
                  y="21"
                  fill={isDaylightMode ? '#475569' : '#94a3b8'}
                  fontSize="8"
                  fontFamily="monospace"
                >
                  FL{Math.round(ac.altitude_ft / 100)} | {ac.speed_kts}KT | {Math.round(ac.fuel_pct)}%
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Selected Aircraft Tactical Inspector Drawer (Floating bottom panel) */}
      {selectedAc && (
        <div className={`absolute bottom-3 left-4 right-4 md:right-auto md:w-96 p-4 rounded-xl border backdrop-blur-xl shadow-2xl z-30 transition-all ${
          isDaylightMode
            ? 'bg-white/95 border-slate-300 text-slate-800'
            : 'bg-navy-900/95 border-cyan-500/40 text-slate-100'
        }`}>
          <div className="flex items-start justify-between border-b pb-2 mb-3 border-slate-700/60">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-cyan-400">{selectedAc.callsign}</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  selectedAc.threat_alert || selectedAc.threat_proximity_alert
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                }`}>
                  {selectedAc.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">{selectedAc.name} ({selectedAc.id})</p>
            </div>
            <button
              onClick={() => onSelectAircraft(null)}
              className="text-slate-400 hover:text-slate-200 text-sm font-mono px-1.5 py-0.5"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs mb-3">
            <div className="bg-navy-950/70 p-2 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400 block">ALTITUDE</span>
              <span className="font-bold text-cyan-300">{selectedAc.altitude_ft.toLocaleString()} FT</span>
            </div>
            <div className="bg-navy-950/70 p-2 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400 block">SPEED</span>
              <span className="font-bold text-cyan-300">{selectedAc.speed_kts} KTS</span>
            </div>
            <div className="bg-navy-950/70 p-2 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400 block">FUEL</span>
              <span className={`font-bold ${selectedAc.fuel_pct < 35 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {selectedAc.fuel_pct}%
              </span>
            </div>
          </div>

          {/* Weapon / Stores Loadout */}
          <div className="mb-2">
            <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
              <Disc className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ordnance & Stores Loadout</span>
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto text-[11px] font-mono">
              {selectedAc.weapon_loadout.map((store, i) => (
                <div key={i} className="flex justify-between bg-navy-950/50 px-2 py-1 rounded border border-slate-800/80">
                  <span className="text-slate-300 truncate max-w-[210px]">{store.store}</span>
                  <span className="text-cyan-400 font-semibold">{store.weight_kg} kg</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pilot and Destination */}
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800">
            <span>Pilot: <b className="text-slate-200">{selectedAc.pilot}</b></span>
            <span>Dest: <b className="text-slate-200">{selectedAc.destination_base.split(' ')[0]}</b></span>
          </div>
        </div>
      )}
    </div>
  );
};
