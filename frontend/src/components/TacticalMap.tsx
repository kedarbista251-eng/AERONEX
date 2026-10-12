import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import {
  Compass, ZoomIn, ZoomOut, RotateCcw, Disc, Layers,
  Globe, Crosshair, Plane,
  Mountain, Eye, CloudRain, Navigation, CheckCircle2
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

export type MapTileStyle =
  | 'satellite-hybrid' // Realistic Satellite Earth + Borders & Tactical Reference
  | 'terrain-topo'     // Realistic 3D Topographic Terrain & Shaded Elevation Relief
  | 'satellite-pure'   // Pure High-Res Optical Satellite Reconnaissance
  | 'night-flir'       // Realistic FLIR / Night Vision Infrared Phosphor
  | 'dark'             // Tactical C4ISR Midnight
  | 'daylight'         // Daylight Operations
  | 'streets';         // Aeronautical / Street Navigation

interface TileLayerDef {
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string[];
  className?: string;
  opacity?: number;
}

interface TileStyleConfig {
  id: MapTileStyle;
  name: string;
  badge: string;
  description: string;
  layers: TileLayerDef[];
}

const TILE_STYLES: Record<MapTileStyle, TileStyleConfig> = {
  'satellite-hybrid': {
    id: 'satellite-hybrid',
    name: 'Satellite Hybrid',
    badge: 'REALISTIC',
    description: 'High-Res Optical Earth Imagery with Tactical Borders, Coastlines & Airways',
    layers: [
      {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
        maxZoom: 19,
        className: 'satellite-enhanced-filter',
      },
      {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Reference &copy; Esri',
        maxZoom: 19,
        opacity: 0.85,
      },
    ],
  },
  'terrain-topo': {
    id: 'terrain-topo',
    name: '3D Topo Terrain',
    badge: 'ELEVATION',
    description: 'Topographic Shaded Relief with Himalayan Contours, Passes, Valleys & Elevation',
    layers: [
      {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Topo &copy; Esri, DeLorme, USGS, HERE',
        maxZoom: 19,
      },
    ],
  },
  'satellite-pure': {
    id: 'satellite-pure',
    name: 'Pure Satellite',
    badge: 'OPTICAL',
    description: 'Pristine Photorealistic Earth Reconnaissance without Overlay Labels',
    layers: [
      {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
        maxZoom: 19,
        className: 'satellite-enhanced-filter',
      },
    ],
  },
  'night-flir': {
    id: 'night-flir',
    name: 'FLIR Night Vision',
    badge: 'THERMAL',
    description: 'Green Phosphor Infrared Night Reconnaissance & Heat-Signature Optics',
    layers: [
      {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Imagery &copy; Esri, Maxar',
        maxZoom: 19,
        className: 'flir-filter-layer',
      },
      {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Reference &copy; Esri',
        maxZoom: 19,
        opacity: 0.6,
      },
    ],
  },
  'dark': {
    id: 'dark',
    name: 'Tactical Dark',
    badge: 'C4ISR',
    description: 'High-Contrast Midnight Vector Map for Air Operations Center Screens',
    layers: [
      {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; CartoDB &copy; OpenStreetMap',
        maxZoom: 19,
        subdomains: ['a', 'b', 'c', 'd'],
      },
    ],
  },
  'daylight': {
    id: 'daylight',
    name: 'Daylight Ops',
    badge: 'LIGHT',
    description: 'High-Clarity Light Operations Map for Daylight Control Rooms',
    layers: [
      {
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; CartoDB &copy; OpenStreetMap',
        maxZoom: 19,
        subdomains: ['a', 'b', 'c', 'd'],
      },
    ],
  },
  'streets': {
    id: 'streets',
    name: 'Aeronautical Nav',
    badge: 'NAV',
    description: 'OpenStreetMap Topo & Ground Infrastructure Navigation',
    layers: [
      {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      },
    ],
  },
};

// Geodesic destination calculation for accurate realistic runway and velocity vectors
function getDestinationPoint(lat: number, lng: number, distKm: number, bearingDeg: number): [number, number] {
  const R = 6371; // Earth radius in km
  const d = distKm / R;
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lng * Math.PI) / 180;

  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
  const lon2 = lon1 + Math.atan2(
    Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
    Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
  );

  return [(lat2 * 180) / Math.PI, (lon2 * 180) / Math.PI];
}

// Parse runway designations (e.g., "09/27 (Active)" -> heading 90°, reciprocal 270°)
function parseRunwayHeading(rwyString: string): { heading: number; reciprocal: number; number1: string; number2: string } | null {
  const match = rwyString.match(/(\d{2})\/(\d{2})/);
  if (!match) return null;
  const num1 = parseInt(match[1], 10);
  const heading = num1 * 10;
  const reciprocal = (heading + 180) % 360;
  return {
    heading,
    reciprocal,
    number1: match[1],
    number2: match[2],
  };
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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const activeTileLayersRef = useRef<L.TileLayer[]>([]);

  // Tactical Object Layer Groups
  const airbaseLayerGroupRef = useRef<L.LayerGroup>(L.layerGroup());
  const runwaysLayerGroupRef = useRef<L.LayerGroup>(L.layerGroup());
  const threatLayerGroupRef = useRef<L.LayerGroup>(L.layerGroup());
  const aircraftLayerGroupRef = useRef<L.LayerGroup>(L.layerGroup());
  const velocityVectorsLayerGroupRef = useRef<L.LayerGroup>(L.layerGroup());
  const flightPathsLayerGroupRef = useRef<L.LayerGroup>(L.layerGroup());
  const rangeRingLayerGroupRef = useRef<L.LayerGroup>(L.layerGroup());
  const gridLayerGroupRef = useRef<L.LayerGroup>(L.layerGroup());
  const weatherLayerGroupRef = useRef<L.LayerGroup>(L.layerGroup());

  // Default to Realistic Satellite Hybrid for authentic military realism
  const [mapStyle, setMapStyle] = useState<MapTileStyle>('satellite-hybrid');
  const [showAirbases, setShowAirbases] = useState<boolean>(true);
  const [showRunways, setShowRunways] = useState<boolean>(true);
  const [showThreats, setShowThreats] = useState<boolean>(true);
  const [showRoutes, setShowRoutes] = useState<boolean>(true);
  const [showRangeRings, setShowRangeRings] = useState<boolean>(true);
  const [showVelocityVectors, setShowVelocityVectors] = useState<boolean>(true);
  const [showTacticalGrid, setShowTacticalGrid] = useState<boolean>(true);
  const [showWeatherRadar, setShowWeatherRadar] = useState<boolean>(false);

  // Telemetry HUD state
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(6);
  const [styleMenuOpen, setStyleMenuOpen] = useState<boolean>(false);

  // Handle daylight mode toggle
  useEffect(() => {
    if (isDaylightMode && (mapStyle === 'dark' || mapStyle === 'night-flir')) {
      setMapStyle('daylight');
    }
  }, [isDaylightMode]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Theater center: Central/Northern India operational airspace
      const map = L.map(mapContainerRef.current, {
        center: [27.5, 76.5],
        zoom: 6,
        minZoom: 4,
        maxZoom: 18,
        zoomControl: false,
        attributionControl: false,
      });

      // Add tactical military scale control in Nautical Miles & Kilometers
      L.control.scale({
        imperial: true, // Nautical Miles & Miles
        metric: true,   // Kilometers
        position: 'bottomleft',
      }).addTo(map);

      // Track cursor coordinates
      map.on('mousemove', (e: L.LeafletMouseEvent) => {
        setCursorCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      map.on('zoomend', () => {
        setCurrentZoom(map.getZoom());
      });

      // Attach tactical layer groups to map
      gridLayerGroupRef.current.addTo(map);
      weatherLayerGroupRef.current.addTo(map);
      runwaysLayerGroupRef.current.addTo(map);
      airbaseLayerGroupRef.current.addTo(map);
      threatLayerGroupRef.current.addTo(map);
      flightPathsLayerGroupRef.current.addTo(map);
      rangeRingLayerGroupRef.current.addTo(map);
      velocityVectorsLayerGroupRef.current.addTo(map);
      aircraftLayerGroupRef.current.addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Base Tile Layers when mapStyle changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove old tile layers
    activeTileLayersRef.current.forEach((layer) => {
      map.removeLayer(layer);
    });
    activeTileLayersRef.current = [];

    const cfg = TILE_STYLES[mapStyle] || TILE_STYLES['satellite-hybrid'];
    const newLayers: L.TileLayer[] = [];

    cfg.layers.forEach((layerDef) => {
      const tile = L.tileLayer(layerDef.url, {
        attribution: layerDef.attribution,
        maxZoom: layerDef.maxZoom,
        subdomains: layerDef.subdomains || ['a', 'b', 'c', 'd'],
        className: layerDef.className || '',
        opacity: layerDef.opacity !== undefined ? layerDef.opacity : 1.0,
      });
      tile.addTo(map);
      newLayers.push(tile);
    });

    activeTileLayersRef.current = newLayers;
  }, [mapStyle]);

  // Render Military Tactical Graticule Grid (MGRS / Lat-Long Grid)
  useEffect(() => {
    const group = gridLayerGroupRef.current;
    group.clearLayers();

    if (!showTacticalGrid) return;

    const latMin = 16;
    const latMax = 36;
    const lngMin = 68;
    const lngMax = 82;
    const step = 2; // Every 2 degrees for clean tactical overview

    // Parallels (Latitude lines)
    for (let lat = latMin; lat <= latMax; lat += step) {
      const latLine = L.polyline([
        [lat, lngMin],
        [lat, lngMax],
      ], {
        color: '#38bdf8',
        weight: 1,
        dashArray: '3, 6',
        opacity: 0.22,
      });
      group.addLayer(latLine);

      // Border latitude tag
      const labelIcon = L.divIcon({
        html: `<div class="text-[9px] font-mono text-cyan-400/60 font-semibold px-1 select-none pointer-events-none">${lat}°00'N</div>`,
        className: 'grid-lat-label',
        iconSize: [45, 14],
      });
      group.addLayer(L.marker([lat, lngMin + 0.3], { icon: labelIcon, interactive: false }));
    }

    // Meridians (Longitude lines)
    for (let lng = lngMin; lng <= lngMax; lng += step) {
      const lngLine = L.polyline([
        [latMin, lng],
        [latMax, lng],
      ], {
        color: '#38bdf8',
        weight: 1,
        dashArray: '3, 6',
        opacity: 0.22,
      });
      group.addLayer(lngLine);

      // Border longitude tag
      const labelIcon = L.divIcon({
        html: `<div class="text-[9px] font-mono text-cyan-400/60 font-semibold px-1 select-none pointer-events-none">${lng}°00'E</div>`,
        className: 'grid-lng-label',
        iconSize: [45, 14],
      });
      group.addLayer(L.marker([latMin + 0.4, lng], { icon: labelIcon, interactive: false }));
    }
  }, [showTacticalGrid]);

  // Render Simulated Tactical Weather Radar / Doppler Storm Cells
  useEffect(() => {
    const group = weatherLayerGroupRef.current;
    group.clearLayers();

    if (!showWeatherRadar) return;

    // Convective storm cells over contested operational zones
    const weatherCells = [
      { lat: 29.8, lng: 74.2, radiusKm: 85, intensity: 'HEAVY PRECIPITATION / SEVERE TURBULENCE' },
      { lat: 25.1, lng: 73.8, radiusKm: 60, intensity: 'MODERATE CONVECTIVE RAIN CELL' },
      { lat: 32.4, lng: 76.9, radiusKm: 75, intensity: 'MOUNTAIN HAIL / ICING HAZARD' },
    ];

    weatherCells.forEach((cell) => {
      const stormCircle = L.circle([cell.lat, cell.lng], {
        radius: cell.radiusKm * 1000,
        color: '#06b6d4',
        weight: 1.5,
        dashArray: '4, 4',
        fillColor: '#10b981',
        fillOpacity: 0.16,
      });

      stormCircle.bindTooltip(`
        <div class="p-1 font-mono text-[11px] text-cyan-300">
          <b>DOPPLER WEATHER HAZARD</b><br/>
          ${cell.intensity}<br/>
          Coverage: ${cell.radiusKm} km radius
        </div>
      `, { sticky: true });

      group.addLayer(stormCircle);

      // Inner severe core
      const innerCore = L.circle([cell.lat, cell.lng], {
        radius: (cell.radiusKm * 0.45) * 1000,
        color: '#ef4444',
        weight: 1,
        fillColor: '#f59e0b',
        fillOpacity: 0.28,
      });
      group.addLayer(innerCore);
    });
  }, [showWeatherRadar]);

  // Render Realistic Runways & Airfield Layouts
  useEffect(() => {
    const group = runwaysLayerGroupRef.current;
    group.clearLayers();

    if (!showRunways) return;

    airbases.forEach((base) => {
      // TACAN navigation beacon perimeter ring (5 NM / 9.26 km)
      const tacanRing = L.circle([base.lat, base.lng], {
        radius: 9260,
        color: '#06b6d4',
        weight: 1,
        dashArray: '3, 6',
        fillOpacity: 0,
        opacity: 0.35,
      });
      group.addLayer(tacanRing);

      // Generate realistic runway vectors for each declared runway strip
      base.runways.forEach((rwyStr) => {
        const parsed = parseRunwayHeading(rwyStr);
        if (!parsed) return;

        const halfLengthKm = 1.6; // Standard 3.2 km military runway
        const p1 = getDestinationPoint(base.lat, base.lng, halfLengthKm, parsed.heading);
        const p2 = getDestinationPoint(base.lat, base.lng, halfLengthKm, parsed.reciprocal);

        // Asphalt strip
        const asphaltPoly = L.polyline([p1, p2], {
          color: '#0f172a',
          weight: 7,
          opacity: 0.9,
          lineCap: 'square',
        });
        group.addLayer(asphaltPoly);

        // Runway painted centerline
        const centerline = L.polyline([p1, p2], {
          color: '#f8fafc',
          weight: 1.8,
          dashArray: '5, 6',
          opacity: 0.95,
        });
        group.addLayer(centerline);

        // Extended ILS localizer approach line (8 km off threshold)
        const ilsEnd1 = getDestinationPoint(p1[0], p1[1], 8, parsed.heading);
        const ilsEnd2 = getDestinationPoint(p2[0], p2[1], 8, parsed.reciprocal);

        const ilsLine1 = L.polyline([p1, ilsEnd1], {
          color: '#38bdf8',
          weight: 1,
          dashArray: '4, 8',
          opacity: 0.4,
        });
        const ilsLine2 = L.polyline([p2, ilsEnd2], {
          color: '#38bdf8',
          weight: 1,
          dashArray: '4, 8',
          opacity: 0.4,
        });
        group.addLayer(ilsLine1);
        group.addLayer(ilsLine2);

        // Runway threshold numbers at endpoints
        const icon1 = L.divIcon({
          html: `<div class="px-1 py-0.5 rounded bg-slate-950/90 border border-slate-700 text-[8px] font-mono font-bold text-amber-300 shadow">${parsed.number1}</div>`,
          className: 'rwy-num-icon',
          iconSize: [20, 16],
        });
        const icon2 = L.divIcon({
          html: `<div class="px-1 py-0.5 rounded bg-slate-950/90 border border-slate-700 text-[8px] font-mono font-bold text-amber-300 shadow">${parsed.number2}</div>`,
          className: 'rwy-num-icon',
          iconSize: [20, 16],
        });
        group.addLayer(L.marker(p1, { icon: icon1, interactive: false }));
        group.addLayer(L.marker(p2, { icon: icon2, interactive: false }));
      });
    });
  }, [airbases, showRunways]);

  // Render Airbases Headquarters Layer
  useEffect(() => {
    const group = airbaseLayerGroupRef.current;
    group.clearLayers();

    if (!showAirbases) return;

    airbases.forEach((base) => {
      const isDefcon1 = base.readiness.includes('DEFCON-1');
      const isDefcon2 = base.readiness.includes('DEFCON-2');
      const badgeColor = isDefcon1 ? '#f43f5e' : isDefcon2 ? '#fb923c' : '#38bdf8';

      const iconHtml = `
        <div class="relative flex flex-col items-center group cursor-pointer" style="transform: translate(-50%, -50%);">
          <!-- Beacon Pulse Ring -->
          <div class="w-8 h-8 rounded-xl bg-navy-950/95 border-2 border-cyan-400 flex items-center justify-center shadow-xl shadow-cyan-500/40 group-hover:scale-110 transition-transform">
            <svg class="w-4 h-4 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div class="mt-1 px-2 py-0.5 rounded-md bg-navy-950/95 border border-cyan-500/50 text-[10px] font-mono text-cyan-200 font-bold whitespace-nowrap shadow-lg backdrop-blur-md">
            ${base.name.split('(')[0].trim()}
            <span style="color: ${badgeColor};" class="ml-1 font-extrabold">• ${base.readiness}</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'airbase-marker-icon',
        iconSize: [90, 44],
      });

      const marker = L.marker([base.lat, base.lng], { icon: customIcon });

      marker.bindPopup(`
        <div class="p-2 font-mono text-xs">
          <div class="font-bold text-cyan-400 text-sm mb-1 flex items-center gap-1.5">
            <svg class="w-4 h-4 text-cyan-400 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            ${base.name}
          </div>
          <div class="text-[11px] text-slate-300 space-y-1 mt-2">
            <div><b>Readiness Status:</b> <span class="font-bold" style="color: ${badgeColor};">${base.readiness}</span></div>
            <div><b>Elevation:</b> ${base.elevation_ft.toLocaleString()} FT (MSL)</div>
            <div><b>Fuel Reserve:</b> ${base.fuel_reserve_kL} kL Jet-A1</div>
            <div><b>Available Hangars:</b> ${base.available_hangars} Bays</div>
            <div><b>Runways:</b> ${base.runways.join(', ')}</div>
          </div>
        </div>
      `);

      group.addLayer(marker);
    });
  }, [airbases, showAirbases]);

  // Render Threat Zones with Rotating Radar Scanner Beam & Lethal WEZ Rings
  useEffect(() => {
    const group = threatLayerGroupRef.current;
    group.clearLayers();

    if (!showThreats) return;

    threatZones.forEach((threat) => {
      if (!threat.is_active) return;

      const isSam = threat.type === 'SAM_SYSTEM';
      const isRadar = threat.type === 'RADAR_DOME';
      const strokeColor = isSam ? '#ef4444' : isRadar ? '#f59e0b' : '#a855f7';
      const fillColor = isSam ? '#ef4444' : isRadar ? '#f59e0b' : '#c084fc';

      // Outer Early Warning Detection Radius (Metric meters)
      const outerCircle = L.circle([threat.lat, threat.lng], {
        radius: threat.radius_km * 1000,
        color: strokeColor,
        weight: 1.8,
        dashArray: '6, 6',
        fillColor: fillColor,
        fillOpacity: isSam ? 0.08 : 0.06,
      });

      outerCircle.on('click', () => {
        onToggleThreat(threat.id);
      });

      outerCircle.bindTooltip(`
        <div class="p-1 font-mono text-[11px]">
          <b style="color: ${strokeColor};">${threat.name}</b><br/>
          Detection Range: ${threat.radius_km} km<br/>
          Lethality: <b>${threat.lethality_level}</b><br/>
          <i>Click to deconflict / neutralize</i>
        </div>
      `, { sticky: true });

      group.addLayer(outerCircle);

      // Inner Lethal Weapon Engagement Zone (WEZ) for SAMs
      if (isSam && threat.lethal_radius_km) {
        const innerLethal = L.circle([threat.lat, threat.lng], {
          radius: threat.lethal_radius_km * 1000,
          color: '#dc2626',
          weight: 2,
          dashArray: '2, 4',
          fillColor: '#b91c1c',
          fillOpacity: 0.22,
        });

        innerLethal.on('click', () => {
          onToggleThreat(threat.id);
        });

        group.addLayer(innerLethal);
      }

      // Live Radar Scanner Sweep Beam Animation
      const sweepColor = isSam ? 'rgba(239, 68, 68, 0.45)' : 'rgba(245, 158, 11, 0.4)';
      const scannerHtml = `
        <div class="relative w-24 h-24 pointer-events-none" style="transform: translate(-50%, -50%);">
          <!-- Rotating Radar Sweep Cone -->
          <div class="absolute inset-0 rounded-full animate-radar-sweep pointer-events-none"
               style="background: conic-gradient(from 0deg, ${sweepColor} 0deg, transparent 65deg, transparent 360deg);">
          </div>
          <!-- Center Battery Core -->
          <div class="absolute inset-0 m-auto w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] shadow-lg animate-pulse"
               style="background: ${strokeColor}; color: #040812;">
            ${isSam ? 'SAM' : isRadar ? 'EW' : 'WX'}
          </div>
        </div>
      `;

      const centerMarker = L.marker([threat.lat, threat.lng], {
        icon: L.divIcon({ html: scannerHtml, className: 'threat-scanner-icon', iconSize: [96, 96] }),
      });

      centerMarker.on('click', () => onToggleThreat(threat.id));
      group.addLayer(centerMarker);
    });
  }, [threatZones, showThreats, onToggleThreat]);

  // Render Flight Corridors & Waypoints
  useEffect(() => {
    const group = flightPathsLayerGroupRef.current;
    group.clearLayers();

    if (!showRoutes) return;

    aircraft.forEach((ac) => {
      if (!ac.active_waypoints || ac.active_waypoints.length < 2) return;

      const latlngs: [number, number][] = ac.active_waypoints.map((wp) => [wp.lat, wp.lng]);
      const isSelected = selectedAircraftId === ac.id;
      const hasThreat = ac.threat_alert || ac.threat_proximity_alert;

      const pathLine = L.polyline(latlngs, {
        color: isSelected ? '#38bdf8' : hasThreat ? '#f43f5e' : '#06b6d4',
        weight: isSelected ? 3 : 1.8,
        dashArray: isSelected ? '8, 6' : '4, 4',
        opacity: isSelected ? 0.95 : 0.7,
      });

      group.addLayer(pathLine);

      // Render Waypoints
      ac.active_waypoints.forEach((wp) => {
        const wpMarker = L.circleMarker([wp.lat, wp.lng], {
          radius: 3.5,
          color: isSelected ? '#38bdf8' : '#06b6d4',
          fillColor: '#040812',
          fillOpacity: 0.9,
          weight: 1.5,
        });
        wpMarker.bindTooltip(`<div class="font-mono text-[10px]">${wp.name} (FL${Math.round(wp.alt_ft / 100)})</div>`, { permanent: false });
        group.addLayer(wpMarker);
      });
    });
  }, [aircraft, selectedAircraftId, showRoutes]);

  // Render 2-Minute Predictive Velocity Vectors (Speed Leaders)
  useEffect(() => {
    const group = velocityVectorsLayerGroupRef.current;
    group.clearLayers();

    if (!showVelocityVectors) return;

    aircraft.forEach((ac) => {
      if (ac.speed_kts <= 0) return;

      // Distance covered in 2 minutes: speed_kts * 1.852 * (2 / 60) km
      const distance2MinKm = ac.speed_kts * 1.852 * (2 / 60);
      const targetCoord = getDestinationPoint(ac.lat, ac.lng, distance2MinKm, ac.heading_deg);

      const isSelected = selectedAircraftId === ac.id;
      const leaderLine = L.polyline([[ac.lat, ac.lng], targetCoord], {
        color: isSelected ? '#38bdf8' : '#22d3ee',
        weight: isSelected ? 2 : 1.2,
        dashArray: '3, 4',
        opacity: 0.8,
      });

      group.addLayer(leaderLine);

      // Tip cross-tick indicator
      const tick = L.circleMarker(targetCoord, {
        radius: 2,
        color: isSelected ? '#38bdf8' : '#22d3ee',
        fillColor: isSelected ? '#38bdf8' : '#22d3ee',
        fillOpacity: 0.8,
        weight: 1,
      });
      group.addLayer(tick);
    });
  }, [aircraft, selectedAircraftId, showVelocityVectors]);

  // Render Combat Range Endurance Ring for Selected Aircraft
  useEffect(() => {
    const group = rangeRingLayerGroupRef.current;
    group.clearLayers();

    if (!showRangeRings || !selectedAircraftId) return;

    const selAc = aircraft.find((a) => a.id === selectedAircraftId);
    if (!selAc || !selAc.combat_radius_km) return;

    const combatRing = L.circle([selAc.lat, selAc.lng], {
      radius: selAc.combat_radius_km * 1000,
      color: '#38bdf8',
      weight: 1.8,
      dashArray: '6, 8',
      fillColor: '#0ea5e9',
      fillOpacity: 0.05,
    });

    combatRing.bindTooltip(`
      <div class="p-1 font-mono text-[10px]">
        <b>${selAc.callsign} COMBAT RADIUS</b>: ${selAc.combat_radius_km} KM
      </div>
    `, { sticky: true });

    group.addLayer(combatRing);
  }, [aircraft, selectedAircraftId, showRangeRings]);

  // Render Aircraft Markers & Tactical HUD Tags
  useEffect(() => {
    const group = aircraftLayerGroupRef.current;
    group.clearLayers();

    aircraft.forEach((ac) => {
      const isSelected = selectedAircraftId === ac.id;
      const hasAlert = ac.threat_alert || ac.threat_proximity_alert;
      const acColor = hasAlert ? '#f43f5e' : isSelected ? '#38bdf8' : '#22d3ee';
      const alertPulseClass = hasAlert ? 'animate-threat-pulse' : '';

      const iconHtml = `
        <div class="relative flex flex-col items-center cursor-pointer group" style="transform: translate(-50%, -50%);">
          <!-- Threat Alert Halo -->
          ${hasAlert ? '<div class="absolute -inset-3.5 rounded-full bg-rose-500/30 border border-rose-500 animate-ping"></div>' : ''}
          ${isSelected ? '<div class="absolute -inset-2.5 rounded-full bg-cyan-400/25 border border-cyan-400 animate-pulse"></div>' : ''}

          <!-- Directional Jet Silhouette -->
          <div class="w-8 h-8 flex items-center justify-center tactical-aircraft-marker ${alertPulseClass}"
               style="transform: rotate(${ac.heading_deg}deg);">
            <svg class="w-7 h-7 drop-shadow-lg" viewBox="0 0 24 24" fill="${acColor}" stroke="#060B15" stroke-width="1.2">
              <path d="M12 2L15 9L22 13L15 14L14 21L12 18L10 21L9 14L2 13L9 9L12 2Z"/>
            </svg>
          </div>

          <!-- Tactical HUD Tag -->
          <div class="mt-0.5 px-2 py-0.5 rounded backdrop-blur-md font-mono text-[10px] whitespace-nowrap shadow-xl border
                      ${isSelected ? 'bg-cyan-950/95 border-cyan-400 text-cyan-200' : hasAlert ? 'bg-rose-950/95 border-rose-600 text-rose-200' : 'bg-navy-950/90 border-slate-700/80 text-slate-200'}">
            <span class="font-bold">${ac.callsign}</span>
            <span class="opacity-80 ml-1">FL${Math.round(ac.altitude_ft / 100)} • ${ac.speed_kts}KT • ${Math.round(ac.fuel_pct)}%</span>
          </div>
        </div>
      `;

      const marker = L.marker([ac.lat, ac.lng], {
        icon: L.divIcon({
          html: iconHtml,
          className: 'tactical-aircraft-icon',
          iconSize: [95, 48],
        }),
      });

      marker.on('click', () => {
        onSelectAircraft(isSelected ? null : ac.id);
      });

      group.addLayer(marker);
    });
  }, [aircraft, selectedAircraftId, onSelectAircraft]);

  // Smooth Fly-To when an Aircraft is selected
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedAircraftId) return;

    const ac = aircraft.find((a) => a.id === selectedAircraftId);
    if (ac) {
      map.flyTo([ac.lat, ac.lng], Math.max(map.getZoom(), 7), {
        animate: true,
        duration: 1.0,
      });
    }
  }, [selectedAircraftId, aircraft]);

  // Reset Theater View Callback
  const handleResetTheater = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo([27.5, 76.5], 6, { animate: true, duration: 1.0 });
    onSelectAircraft(null);
  }, [onSelectAircraft]);

  const selectedAc = aircraft.find((a) => a.id === selectedAircraftId);
  const activeStyle = TILE_STYLES[mapStyle] || TILE_STYLES['satellite-hybrid'];

  return (
    <div className={`relative w-full h-[660px] rounded-2xl overflow-hidden border shadow-2xl transition-colors font-mono select-none ${
      isDaylightMode
        ? 'bg-slate-100 border-slate-300 shadow-slate-300/50'
        : 'bg-navy-950 border-cyan-900/50 shadow-cyan-950/40'
    }`}>
      {/* Real Leaflet Map Viewport Container */}
      <div ref={mapContainerRef} className="w-full h-full z-10 tactical-reticle" />

      {/* Top Left: Operational Theater HUD Header */}
      <div className="absolute top-3 left-4 z-20 flex flex-wrap items-center gap-2 pointer-events-none">
        <div className={`px-3 py-1.5 rounded-xl border backdrop-blur-md flex items-center gap-2 pointer-events-auto ${
          isDaylightMode
            ? 'bg-white/90 border-slate-300 text-slate-800 shadow-md'
            : 'bg-navy-950/90 border-cyan-500/50 text-cyan-300 shadow-lg'
        }`}>
          <Compass className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '20s' }} />
          <span className="text-xs font-bold tracking-wider uppercase">
            THEATER COP: 4D REALISTIC RADAR
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1"></span>
        </div>

        <div className={`hidden md:flex px-3 py-1.5 rounded-xl border text-xs backdrop-blur-md pointer-events-auto items-center gap-2 ${
          isDaylightMode
            ? 'bg-white/90 border-slate-300 text-slate-700 shadow-md'
            : 'bg-navy-950/90 border-slate-800 text-slate-300 shadow-lg'
        }`}>
          <span className="text-cyan-400 font-bold">{activeStyle.name}</span>
          <span className="text-slate-500">|</span>
          <span>ZOOM: {currentZoom}x</span>
          <span className="text-slate-500">|</span>
          <span>AIRBASES: {airbases.length}</span>
          <span className="text-slate-500">|</span>
          <span>TRACKS: {aircraft.length}</span>
          <span className="text-slate-500">|</span>
          <span>THREATS: {threatZones.filter((t) => t.is_active).length}</span>
        </div>
      </div>

      {/* Top Right: Realistic Map Switcher & Tactical Layer Controls */}
      <div className="absolute top-3 right-4 z-20 flex flex-wrap items-center gap-2">
        {/* Realistic Tile Selector Dropdown / Menu */}
        <div className="relative">
          <button
            onClick={() => setStyleMenuOpen(!styleMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-navy-950/90 border border-cyan-500/50 text-cyan-300 text-xs font-bold shadow-2xl backdrop-blur-md hover:border-cyan-400 transition-all"
            title="Switch Map Tile Realism"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>{activeStyle.name}</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
              {activeStyle.badge}
            </span>
          </button>

          {styleMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 p-2 rounded-xl bg-navy-950/95 border border-cyan-500/50 shadow-2xl backdrop-blur-xl z-50 space-y-1">
              <div className="px-2 py-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 mb-1">
                Realistic Base Maps & Optics
              </div>

              {(Object.keys(TILE_STYLES) as MapTileStyle[]).map((styleKey) => {
                const s = TILE_STYLES[styleKey];
                const isActive = mapStyle === styleKey;
                return (
                  <button
                    key={styleKey}
                    onClick={() => {
                      setMapStyle(styleKey);
                      setStyleMenuOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg flex items-start justify-between text-xs transition-all ${
                      isActive
                        ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-200'
                        : 'hover:bg-navy-900 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        {styleKey.includes('satellite') && <Globe className="w-3.5 h-3.5 text-cyan-400" />}
                        {styleKey === 'terrain-topo' && <Mountain className="w-3.5 h-3.5 text-emerald-400" />}
                        {styleKey === 'night-flir' && <Eye className="w-3.5 h-3.5 text-green-400" />}
                        {styleKey === 'streets' && <Navigation className="w-3.5 h-3.5 text-amber-400" />}
                        <span>{s.name}</span>
                        {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 ml-1 inline" />}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{s.description}</p>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-navy-900 border border-slate-800 text-slate-400">
                      {s.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Tactical Layer Toggles Toolbar */}
        <div className="hidden lg:flex items-center bg-navy-950/90 border border-slate-700/80 rounded-xl p-1 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-1 px-1.5 py-1 text-slate-400 border-r border-slate-700/60 mr-1">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px]">LAYERS:</span>
          </div>

          <button
            onClick={() => setShowRunways(!showRunways)}
            className={`px-2 py-1 rounded-lg text-[11px] transition-all ${
              showRunways ? 'bg-cyan-500/20 text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Realistic Runway Strips & Markings"
          >
            Runways
          </button>
          <button
            onClick={() => setShowAirbases(!showAirbases)}
            className={`px-2 py-1 rounded-lg text-[11px] transition-all ${
              showAirbases ? 'bg-cyan-500/20 text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Bases
          </button>
          <button
            onClick={() => setShowThreats(!showThreats)}
            className={`px-2 py-1 rounded-lg text-[11px] transition-all ${
              showThreats ? 'bg-rose-500/20 text-rose-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle SAM Batteries & Radar Domes"
          >
            Threats
          </button>
          <button
            onClick={() => setShowRoutes(!showRoutes)}
            className={`px-2 py-1 rounded-lg text-[11px] transition-all ${
              showRoutes ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Flight Corridors & Waypoints"
          >
            Corridors
          </button>
          <button
            onClick={() => setShowRangeRings(!showRangeRings)}
            className={`px-2 py-1 rounded-lg text-[11px] transition-all ${
              showRangeRings ? 'bg-indigo-500/20 text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Aircraft Combat Radius Rings"
          >
            Rings
          </button>
          <button
            onClick={() => setShowVelocityVectors(!showVelocityVectors)}
            className={`px-2 py-1 rounded-lg text-[11px] transition-all ${
              showVelocityVectors ? 'bg-cyan-500/20 text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle 2-Minute Velocity Speed Leaders"
          >
            Vectors
          </button>
          <button
            onClick={() => setShowTacticalGrid(!showTacticalGrid)}
            className={`px-2 py-1 rounded-lg text-[11px] transition-all ${
              showTacticalGrid ? 'bg-indigo-500/20 text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Military MGRS / Lat-Long Graticule Grid"
          >
            Grid
          </button>
          <button
            onClick={() => setShowWeatherRadar(!showWeatherRadar)}
            className={`px-2 py-1 rounded-lg text-[11px] transition-all flex items-center gap-1 ${
              showWeatherRadar ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Doppler Precipitation Storm Radar"
          >
            <CloudRain className="w-3 h-3" />
            <span>Radar WX</span>
          </button>
        </div>

        {/* Zoom & Reset Controls */}
        <div className="flex items-center bg-navy-950/90 border border-slate-700/80 rounded-xl p-1 shadow-2xl backdrop-blur-md">
          <button
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="p-1.5 text-slate-300 hover:text-cyan-400 hover:bg-navy-800 rounded-lg transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="p-1.5 text-slate-300 hover:text-cyan-400 hover:bg-navy-800 rounded-lg transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetTheater}
            className="p-1.5 text-slate-300 hover:text-cyan-400 hover:bg-navy-800 rounded-lg transition-colors"
            title="Reset Theater View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Right: Live GPS Military Cursor Coordinate Readout */}
      <div className="absolute bottom-3 right-4 z-20 pointer-events-none">
        <div className={`px-3 py-1.5 rounded-xl border text-[11px] font-mono backdrop-blur-md shadow-lg ${
          isDaylightMode
            ? 'bg-white/90 border-slate-300 text-slate-700'
            : 'bg-navy-950/90 border-slate-800 text-cyan-300'
        }`}>
          <div className="flex items-center gap-2">
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {cursorCoords
                ? `GRID: ${cursorCoords.lat.toFixed(4)}°N, ${cursorCoords.lng.toFixed(4)}°E`
                : 'GRID: 28.6139°N, 77.2090°E'}
            </span>
            <span className="text-slate-400">| MIL-STD-2525D</span>
          </div>
        </div>
      </div>

      {/* Selected Aircraft Floating Tactical Inspector Drawer */}
      {selectedAc && (
        <div className={`absolute bottom-3 left-4 right-4 md:right-auto md:w-96 p-4 rounded-2xl border backdrop-blur-xl shadow-2xl z-30 transition-all font-mono ${
          isDaylightMode
            ? 'bg-white/95 border-slate-300 text-slate-800 shadow-slate-300/80'
            : 'bg-navy-950/95 border-cyan-500/50 text-slate-100 shadow-cyan-950/60'
        }`}>
          <div className="flex items-start justify-between border-b pb-2 mb-3 border-slate-700/60">
            <div>
              <div className="flex items-center gap-2">
                <Plane className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-bold text-cyan-400">{selectedAc.callsign}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  selectedAc.threat_alert || selectedAc.threat_proximity_alert
                    ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                    : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                }`}>
                  {selectedAc.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{selectedAc.name} ({selectedAc.type})</p>
            </div>
            <button
              onClick={() => onSelectAircraft(null)}
              className="text-slate-400 hover:text-slate-200 text-sm p-1"
            >
              ✕
            </button>
          </div>

          {/* Quick Flight Metrics & Aviation Telemetry */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
            <div className="bg-navy-900/60 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">ALTITUDE</span>
              <span className="font-bold text-cyan-300">FL{Math.round(selectedAc.altitude_ft / 100)}</span>
              <span className="text-[9px] text-slate-400 block">{selectedAc.altitude_ft.toLocaleString()} FT</span>
            </div>
            <div className="bg-navy-900/60 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">SPEED</span>
              <span className="font-bold text-cyan-300">{selectedAc.speed_kts} KTS</span>
              <span className="text-[9px] text-slate-400 block">M{(selectedAc.speed_kts / 573).toFixed(2)}</span>
            </div>
            <div className="bg-navy-900/60 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">FUEL</span>
              <span className={`font-bold ${selectedAc.fuel_pct < 35 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {selectedAc.fuel_pct}%
              </span>
              <span className="text-[9px] text-slate-400 block">{selectedAc.combat_radius_km} km RAD</span>
            </div>
          </div>

          {/* Ordnance & Weapon Stores */}
          <div className="mb-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
              <Disc className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ordnance & Stores Manifest</span>
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto text-[11px]">
              {selectedAc.weapon_loadout.map((store, i) => (
                <div key={i} className="flex justify-between bg-navy-900/50 px-2 py-1 rounded border border-slate-800/80">
                  <span className="text-slate-300 truncate max-w-[210px]">{store.store}</span>
                  <span className="text-cyan-400 font-semibold">{store.weight_kg} kg</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pilot, Origin & Destination Route */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
            <span>Pilot: <b className="text-slate-200">{selectedAc.pilot}</b></span>
            <span>Dest: <b className="text-slate-200">{selectedAc.destination_base.split(' ')[0]}</b></span>
          </div>
        </div>
      )}
    </div>
  );
};
