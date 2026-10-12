"""
Tactical Air Operations Simulation & Dynamic Retasking Engine for SIH26250.
Provides:
- Geospatial Airbase and Waypoint coordinates
- Contested Threat Envelopes (SAM batteries, Radar domes, EW jamming, Weather hazards)
- 4D In-Flight Aircraft Tracking & Telemetry Interpolation
- Dynamic In-Flight Crisis Injection & Tactical Retasking Solver
- Multi-Source Sensor Data Fusion Integrity Monitoring
- Air Tasking Order (ATO) Briefing Manifest Generator
"""

import math
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

# Standard Tactical Coordinates for Operational Sectors
AIRBASES: Dict[str, Dict[str, Any]] = {
    "Sector-Alpha Airbase": {
        "id": "BASE-ALPHA",
        "name": "Sector-Alpha Airbase (Northern HQ)",
        "lat": 28.6139,
        "lng": 77.2090,
        "elevation_ft": 708,
        "runways": ["09/27 (Active)", "11/29 (Standby)"],
        "readiness": "DEFCON-2",
        "fuel_reserve_kL": 450.0,
        "available_hangars": 8,
    },
    "Sector-Beta Airbase": {
        "id": "BASE-BETA",
        "name": "Sector-Beta Airbase (Western Sector)",
        "lat": 26.9124,
        "lng": 75.7873,
        "elevation_ft": 1410,
        "runways": ["04/22 (Active)"],
        "readiness": "DEFCON-2",
        "fuel_reserve_kL": 380.0,
        "available_hangars": 6,
    },
    "Sector-Gamma Hub": {
        "id": "BASE-GAMMA",
        "name": "Sector-Gamma Hub (Central Logistics)",
        "lat": 23.2599,
        "lng": 77.4126,
        "elevation_ft": 1640,
        "runways": ["12/30 (Active)", "18/36 (Maint)"],
        "readiness": "DEFCON-3",
        "fuel_reserve_kL": 620.0,
        "available_hangars": 12,
    },
    "Coastal Station Delta": {
        "id": "BASE-DELTA",
        "name": "Coastal Station Delta (Naval Air Station)",
        "lat": 18.9220,
        "lng": 72.8347,
        "elevation_ft": 39,
        "runways": ["09/27 (Active - High Winds)"],
        "readiness": "DEFCON-3",
        "fuel_reserve_kL": 290.0,
        "available_hangars": 4,
    },
    "Highland Outpost Echo": {
        "id": "BASE-ECHO",
        "name": "Highland Outpost Echo (High Altitude FOB)",
        "lat": 34.1526,
        "lng": 77.5771,
        "elevation_ft": 10682,
        "runways": ["07/25 (Tactical Strips)"],
        "readiness": "DEFCON-1",
        "fuel_reserve_kL": 190.0,
        "available_hangars": 3,
    },
    "Forward Base Foxtrot": {
        "id": "BASE-FOXTROT",
        "name": "Forward Base Foxtrot (Tactical Border Outpost)",
        "lat": 31.6340,
        "lng": 74.8723,
        "elevation_ft": 750,
        "runways": ["14/32 (Alert QRA Active)"],
        "readiness": "DEFCON-1",
        "fuel_reserve_kL": 210.0,
        "available_hangars": 4,
    },
}

# Dynamic Contested Threat Envelopes (Mutable in memory for hackathon demo)
THREAT_ZONES: List[Dict[str, Any]] = [
    {
        "id": "THR-SAM-01",
        "name": "Hostile S-400 Long-Range SAM Envelope",
        "type": "SAM_SYSTEM",
        "lat": 31.9500,
        "lng": 75.6000,
        "radius_km": 195.0,
        "lethal_radius_km": 120.0,
        "lethality_level": "CRITICAL",
        "min_alt_ft": 1000,
        "max_alt_ft": 65000,
        "is_active": True,
        "radar_freq_ghz": "10.4 (X-Band Active)",
        "detected_via": "ELINT Ground Sensor Grid",
        "notes": "Engagement envelope active. No unescorted transit authorized.",
    },
    {
        "id": "THR-RADAR-02",
        "name": "Early Warning Surveillance Radar Dome",
        "type": "RADAR_DOME",
        "lat": 27.8000,
        "lng": 74.4000,
        "radius_km": 240.0,
        "lethal_radius_km": 0.0,
        "lethality_level": "HIGH",
        "min_alt_ft": 3000,
        "max_alt_ft": 80000,
        "is_active": True,
        "radar_freq_ghz": "3.1 (S-Band Sweep)",
        "detected_via": "AWACS Overwatch Track",
        "notes": "Detection cone over western airspace. Stealth or low-level evasion recommended.",
    },
    {
        "id": "THR-EW-03",
        "name": "Electronic Warfare Jamming Sector",
        "type": "EW_JAMMING",
        "lat": 25.1000,
        "lng": 76.5000,
        "radius_km": 130.0,
        "lethal_radius_km": 0.0,
        "lethality_level": "MEDIUM",
        "min_alt_ft": 0,
        "max_alt_ft": 40000,
        "is_active": False,
        "radar_freq_ghz": "GPS L1/L2 Denied",
        "detected_via": "SIGINT Intercept",
        "notes": "Standby jamming emitter. Degrades GNSS positioning and VHF comms.",
    },
    {
        "id": "THR-WX-04",
        "name": "Severe Squall Line & Microburst Front",
        "type": "WEATHER_STORM",
        "lat": 19.3000,
        "lng": 73.2000,
        "radius_km": 160.0,
        "lethal_radius_km": 90.0,
        "lethality_level": "HIGH",
        "min_alt_ft": 0,
        "max_alt_ft": 45000,
        "is_active": True,
        "radar_freq_ghz": "Doppler 5.6 GHz Reflectivity: 55 dBZ",
        "detected_via": "Met Doppler Radar Feed",
        "notes": "Extreme windshear and lightning cells along Coastal Station Delta approaches.",
    },
]

# Simulated Active Aircraft Telemetry Profiles
AIRCRAFT_TELEMETRY: List[Dict[str, Any]] = [
    {
        "id": "RES-C130-01",
        "callsign": "GARUDA-01",
        "name": "SkyLighter Alpha",
        "type": "CARGO_TRANSPORT",
        "status": "AIRBORNE",
        "origin_base": "Sector-Alpha Airbase",
        "destination_base": "Sector-Beta Airbase",
        "altitude_ft": 24000,
        "speed_kts": 330,
        "heading_deg": 222,
        "fuel_pct": 84.5,
        "fuel_burn_rate_kgh": 2100,
        "combat_radius_km": 1900,
        "mission_id": "REQ-2026-002",
        "pilot": "Capt. Vance Miller",
        "weapon_loadout": [
            {"station": "Cargo Bay 1-4", "store": "Heavy Logistics Equipment & Spares", "qty": 1, "weight_kg": 12000},
            {"station": "Pylon Ext L/R", "store": "Auxiliary External Fuel Tanks (1300 gal)", "qty": 2, "weight_kg": 1800},
            {"station": "Defensive Suite", "store": "Chaff / Flare Countermeasure Dispensers", "qty": 4, "weight_kg": 120},
        ],
        "waypoints": [
            {"name": "BASE-ALPHA", "lat": 28.6139, "lng": 77.2090, "alt_ft": 1000},
            {"name": "WAYPOINT-BRAVO", "lat": 27.9500, "lng": 76.6000, "alt_ft": 24000},
            {"name": "WAYPOINT-CHARLIE", "lat": 27.3500, "lng": 76.1000, "alt_ft": 24000},
            {"name": "BASE-BETA", "lat": 26.9124, "lng": 75.7873, "alt_ft": 1500},
        ],
        "evasion_waypoints": [
            {"name": "BASE-ALPHA", "lat": 28.6139, "lng": 77.2090, "alt_ft": 1000},
            {"name": "CORRIDOR-EAST-1", "lat": 27.6000, "lng": 77.6000, "alt_ft": 26000},
            {"name": "CORRIDOR-EAST-2", "lat": 26.8000, "lng": 76.9000, "alt_ft": 26000},
            {"name": "BASE-BETA", "lat": 26.9124, "lng": 75.7873, "alt_ft": 1500},
        ],
        "is_retasked": False,
        "threat_alert": False,
    },
    {
        "id": "RES-HELO-01",
        "callsign": "CHETAK-RESCUE",
        "name": "Guardian Rescue-01",
        "type": "RESCUE_HELICOPTER",
        "status": "AIRBORNE",
        "origin_base": "Sector-Alpha Airbase",
        "destination_base": "Highland Outpost Echo",
        "altitude_ft": 11500,
        "speed_kts": 140,
        "heading_deg": 355,
        "fuel_pct": 72.0,
        "fuel_burn_rate_kgh": 750,
        "combat_radius_km": 400,
        "mission_id": "REQ-2026-001",
        "pilot": "Lt. Maya Lin",
        "weapon_loadout": [
            {"station": "Cabin Utility", "store": "Dual Rescue Hoist & Litter Stretcher Bay", "qty": 1, "weight_kg": 350},
            {"station": "Nose Gimbal", "store": "High-Definition FLIR Thermal Search Turret", "qty": 1, "weight_kg": 85},
            {"station": "Cabin Sponson", "store": "Inflatable Ocean Survival Rafts", "qty": 2, "weight_kg": 140},
        ],
        "waypoints": [
            {"name": "BASE-ALPHA", "lat": 28.6139, "lng": 77.2090, "alt_ft": 1000},
            {"name": "RIDGE-NORTH", "lat": 31.1000, "lng": 77.1000, "alt_ft": 9000},
            {"name": "VALLEY-PASS", "lat": 32.8000, "lng": 77.3000, "alt_ft": 12000},
            {"name": "BASE-ECHO", "lat": 34.1526, "lng": 77.5771, "alt_ft": 10682},
        ],
        "evasion_waypoints": None,
        "is_retasked": False,
        "threat_alert": False,
    },
    {
        "id": "RES-UAV-01",
        "callsign": "NETRA-EYE-1",
        "name": "Shadow Eye-01",
        "type": "RECON_UAV",
        "status": "ON_PATROL",
        "origin_base": "Forward Base Foxtrot",
        "destination_base": "Forward Base Foxtrot",
        "altitude_ft": 48000,
        "speed_kts": 195,
        "heading_deg": 45,
        "fuel_pct": 91.2,
        "fuel_burn_rate_kgh": 380,
        "combat_radius_km": 1500,
        "mission_id": "REQ-2026-003",
        "pilot": "Drone Capt. Rajesh Varma",
        "weapon_loadout": [
            {"station": "Centerline Pod", "store": "Synthetic Aperture Radar (SAR) Recon Pod", "qty": 1, "weight_kg": 180},
            {"station": "Wing Pylons", "store": "Multi-Spectral Optical Telemetry Link", "qty": 2, "weight_kg": 90},
            {"station": "Avionics Bay", "store": "Satellite Data Relay & Anti-Jam Transceiver", "qty": 1, "weight_kg": 45},
        ],
        "waypoints": [
            {"name": "BASE-FOXTROT", "lat": 31.6340, "lng": 74.8723, "alt_ft": 1000},
            {"name": "PATROL-ORBIT-A", "lat": 32.4000, "lng": 75.3000, "alt_ft": 48000},
            {"name": "PATROL-ORBIT-B", "lat": 32.7000, "lng": 74.9000, "alt_ft": 48000},
            {"name": "PATROL-ORBIT-C", "lat": 32.1000, "lng": 74.4000, "alt_ft": 48000},
            {"name": "BASE-FOXTROT", "lat": 31.6340, "lng": 74.8723, "alt_ft": 1000},
        ],
        "evasion_waypoints": None,
        "is_retasked": False,
        "threat_alert": False,
    },
    {
        "id": "RES-PAT-01",
        "callsign": "TRISHUL-PATROL",
        "name": "Coastal Overwatch-01",
        "type": "PATROL_AIRCRAFT",
        "status": "AIRBORNE",
        "origin_base": "Coastal Station Delta",
        "destination_base": "Coastal Station Delta",
        "altitude_ft": 18000,
        "speed_kts": 290,
        "heading_deg": 185,
        "fuel_pct": 76.0,
        "fuel_burn_rate_kgh": 1650,
        "combat_radius_km": 1400,
        "mission_id": "REQ-2026-005",
        "pilot": "W/Cdr. Anita Nair",
        "weapon_loadout": [
            {"station": "Lower Fuselage", "store": "Maritime 360-Deg Surveillance Radar Dome", "qty": 1, "weight_kg": 650},
            {"station": "Internal Bay", "store": "Acoustic Sonobuoy Active/Passive Dispensers", "qty": 36, "weight_kg": 720},
            {"station": "Wing Pylon 1/2", "store": "Lightweight Anti-Submarine Torpedoes (Sim)", "qty": 2, "weight_kg": 600},
        ],
        "waypoints": [
            {"name": "BASE-DELTA", "lat": 18.9220, "lng": 72.8347, "alt_ft": 500},
            {"name": "PATROL-OFFSHORE-1", "lat": 17.5000, "lng": 71.9000, "alt_ft": 18000},
            {"name": "PATROL-OFFSHORE-2", "lat": 16.2000, "lng": 72.4000, "alt_ft": 18000},
            {"name": "BASE-DELTA", "lat": 18.9220, "lng": 72.8347, "alt_ft": 500},
        ],
        "evasion_waypoints": None,
        "is_retasked": False,
        "threat_alert": False,
    },
    {
        "id": "RES-MED-01",
        "callsign": "SANJEEVANI-01",
        "name": "Lifeguard Medevac-01",
        "type": "MEDEVAC",
        "status": "ALERT_STANDBY",
        "origin_base": "Sector-Beta Airbase",
        "destination_base": "Sector-Alpha Airbase",
        "altitude_ft": 0,
        "speed_kts": 0,
        "heading_deg": 0,
        "fuel_pct": 98.0,
        "fuel_burn_rate_kgh": 850,
        "combat_radius_km": 600,
        "mission_id": "REQ-2026-004",
        "pilot": "Sqn Ldr. K. Sharma",
        "weapon_loadout": [
            {"station": "Cabin Care Bay", "store": "Critical Care Life Support / ICU Monitoring", "qty": 2, "weight_kg": 400},
            {"station": "Internal Rack", "store": "Emergency Oxygen Banks & Cryo Storage", "qty": 1, "weight_kg": 180},
            {"station": "Avionics Pod", "store": "Rapid Medical Dispatch Telemetry Link", "qty": 1, "weight_kg": 50},
        ],
        "waypoints": [
            {"name": "BASE-BETA", "lat": 26.9124, "lng": 75.7873, "alt_ft": 0},
            {"name": "MED-CORRIDOR-1", "lat": 27.6000, "lng": 76.4000, "alt_ft": 15000},
            {"name": "BASE-ALPHA", "lat": 28.6139, "lng": 77.2090, "alt_ft": 0},
        ],
        "evasion_waypoints": None,
        "is_retasked": False,
        "threat_alert": False,
    },
]

# Track crisis simulation state
CRISIS_STATE: Dict[str, Any] = {
    "is_crisis_active": False,
    "crisis_type": None,
    "target_aircraft_id": None,
    "threat_id": None,
    "injected_at": None,
    "retasking_plan": None,
}


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance in km between two lat/lng pairs."""
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    return 2.0 * r * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


def interpolate_position(waypoints: List[Dict[str, Any]], progress_ratio: float) -> Dict[str, Any]:
    """
    Interpolates current lat, lng, altitude and heading along waypoints based on progress_ratio (0.0 to 1.0).
    """
    if not waypoints or len(waypoints) == 1:
        pt = waypoints[0] if waypoints else {"lat": 28.6, "lng": 77.2, "alt_ft": 0}
        return {"lat": pt["lat"], "lng": pt["lng"], "alt_ft": pt.get("alt_ft", 0), "heading": 0.0}

    # Calculate segment lengths
    total_dist = 0.0
    segments = []
    for i in range(len(waypoints) - 1):
        p1 = waypoints[i]
        p2 = waypoints[i + 1]
        dist = haversine_distance_km(p1["lat"], p1["lng"], p2["lat"], p2["lng"])
        if dist < 0.001:
            dist = 0.001
        segments.append((dist, p1, p2))
        total_dist += dist

    if total_dist <= 0:
        return {"lat": waypoints[0]["lat"], "lng": waypoints[0]["lng"], "alt_ft": 0, "heading": 0.0}

    target_dist = max(0.0, min(1.0, progress_ratio)) * total_dist
    accum = 0.0

    for dist, p1, p2 in segments:
        if accum + dist >= target_dist or dist == segments[-1][0]:
            seg_progress = (target_dist - accum) / dist
            cur_lat = p1["lat"] + (p2["lat"] - p1["lat"]) * seg_progress
            cur_lng = p1["lng"] + (p2["lng"] - p1["lng"]) * seg_progress
            cur_alt = p1.get("alt_ft", 0) + (p2.get("alt_ft", 0) - p1.get("alt_ft", 0)) * seg_progress

            # Heading calculation
            dlon = math.radians(p2["lng"] - p1["lng"])
            y = math.sin(dlon) * math.cos(math.radians(p2["lat"]))
            x = math.cos(math.radians(p1["lat"])) * math.sin(math.radians(p2["lat"])) - math.sin(math.radians(p1["lat"])) * math.cos(math.radians(p2["lat"])) * math.cos(dlon)
            heading = (math.degrees(math.atan2(y, x)) + 360) % 360

            return {"lat": round(cur_lat, 4), "lng": round(cur_lng, 4), "alt_ft": round(cur_alt), "heading": round(heading, 1)}
        accum += dist

    last = waypoints[-1]
    return {"lat": last["lat"], "lng": last["lng"], "alt_ft": last.get("alt_ft", 0), "heading": 0.0}


def get_live_tactical_cop(sim_time_hours: float = 0.0) -> Dict[str, Any]:
    """
    Returns full Common Operational Picture (COP):
    Airbases, Active Threats, and Aircraft interpolated at sim_time_hours (0.0 to 4.0).
    """
    aircraft_list = []
    # Base progress speed: planes traverse routes over ~2 to 3 hours
    for ac in AIRCRAFT_TELEMETRY:
        ac_data = dict(ac)
        is_crisis_target = CRISIS_STATE["is_crisis_active"] and CRISIS_STATE["target_aircraft_id"] == ac["id"]
        
        # Determine waypoints based on retasking state
        active_waypoints = ac["waypoints"]
        if ac.get("is_retasked") and ac.get("evasion_waypoints"):
            active_waypoints = ac["evasion_waypoints"]

        if ac["status"] == "ALERT_STANDBY":
            # Plane stays grounded unless simulated time > 1.0 (scramble)
            if sim_time_hours > 0.5:
                progress = min(1.0, (sim_time_hours - 0.5) / 2.0)
                pos = interpolate_position(active_waypoints, progress)
                ac_data["status"] = "AIRBORNE (SCRAMBLED)"
                ac_data["altitude_ft"] = pos["alt_ft"]
                ac_data["speed_kts"] = 310
                ac_data["heading_deg"] = pos["heading"]
                ac_data["lat"] = pos["lat"]
                ac_data["lng"] = pos["lng"]
                ac_data["fuel_pct"] = max(40.0, ac["fuel_pct"] - (sim_time_hours * 12.0))
            else:
                ac_data["lat"] = active_waypoints[0]["lat"]
                ac_data["lng"] = active_waypoints[0]["lng"]
                ac_data["altitude_ft"] = 0
                ac_data["speed_kts"] = 0
                ac_data["heading_deg"] = 0
        else:
            # Airborne planes progress along track
            nominal_rate = 0.35 # fraction of route per hour
            progress = (0.2 + (sim_time_hours * nominal_rate)) % 1.0
            pos = interpolate_position(active_waypoints, progress)
            ac_data["lat"] = pos["lat"]
            ac_data["lng"] = pos["lng"]
            ac_data["altitude_ft"] = pos["alt_ft"]
            ac_data["heading_deg"] = pos["heading"]
            ac_data["fuel_pct"] = max(20.0, round(ac["fuel_pct"] - (sim_time_hours * 14.5), 1))

        # Check threat proximity
        ac_data["threat_proximity_alert"] = False
        ac_data["proximate_threat_name"] = None
        for th in THREAT_ZONES:
            if th["is_active"]:
                dist = haversine_distance_km(ac_data["lat"], ac_data["lng"], th["lat"], th["lng"])
                if dist <= th["radius_km"]:
                    ac_data["threat_proximity_alert"] = True
                    ac_data["proximate_threat_name"] = th["name"]
                    break

        if is_crisis_target:
            ac_data["threat_alert"] = True

        ac_data["active_waypoints"] = active_waypoints
        aircraft_list.append(ac_data)

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "sim_time_hours": sim_time_hours,
        "airbases": list(AIRBASES.values()),
        "threat_zones": THREAT_ZONES,
        "aircraft": aircraft_list,
        "crisis_state": CRISIS_STATE,
        "defcon_level": "DEFCON-2 (TACTICAL OPERATIONS READINESS)",
    }


def inject_tactical_crisis(crisis_type: str = "SAM_RADAR_ACTIVATED") -> Dict[str, Any]:
    """
    Triggers dynamic in-flight disruption and produces immediate AI Retasking Solution.
    """
    CRISIS_STATE["is_crisis_active"] = True
    CRISIS_STATE["crisis_type"] = crisis_type
    CRISIS_STATE["injected_at"] = datetime.now(timezone.utc).isoformat()

    if crisis_type == "SAM_RADAR_ACTIVATED":
        # Target Garuda-01 along Sector-Alpha -> Sector-Beta corridor
        CRISIS_STATE["target_aircraft_id"] = "RES-C130-01"
        CRISIS_STATE["threat_id"] = "THR-SAM-01"
        target_ac = next(a for a in AIRCRAFT_TELEMETRY if a["id"] == "RES-C130-01")
        target_ac["threat_alert"] = True

        # Activate the SAM threat zone
        sam_th = next(t for t in THREAT_ZONES if t["id"] == "THR-SAM-01")
        sam_th["is_active"] = True

        retasking_plan = {
            "incident_id": f"INC-CRISIS-{int(datetime.now().timestamp())}",
            "crisis_summary": "Enemy S-400 Long-Range SAM Radar lock detected along Flight GARUDA-01 primary waypoint track (WAYPOINT-BRAVO).",
            "threat_entity": sam_th["name"],
            "urgency": "IMMEDIATE (BREAK-AWAY ROUTE REQUIRED)",
            "affected_aircraft": {
                "id": target_ac["id"],
                "callsign": target_ac["callsign"],
                "pilot": target_ac["pilot"],
                "current_fuel_pct": target_ac["fuel_pct"],
            },
            "recommendation_title": "Tactical Route Alpha-East Bypass (Evasive Corridor)",
            "action_type": "DYNAMIC_IN_FLIGHT_REROUTING",
            "delta_metrics": {
                "original_distance_km": 420.0,
                "retasked_distance_km": 472.0,
                "distance_delta_km": 52.0,
                "fuel_burn_delta_kg": 340.0,
                "fuel_pct_cost": 3.4,
                "eta_delay_minutes": 8.5,
                "threat_exposure_reduction_pct": 100.0, # 100% outside lethal envelope
                "survivability_score_before": 22.0,
                "survivability_score_after": 98.4,
            },
            "decision_radar_scores": {
                "survivability": 98.4,
                "mission_success_prob": 96.0,
                "fuel_feasibility": 91.5,
                "crew_duty_compliance": 99.0,
                "airspace_deconfliction": 95.0,
            },
            "xai_rationale": (
                "AI Divert Engine has plotted a dogleg vector through CORRIDOR-EAST-1/2, maintaining a 28 km safety margin outside "
                "the S-400 missile lethal envelope (120 km). Aircraft possesses sufficient fuel reserve (84.5% vs 31.0% bingo minimum). "
                "No friendly traffic conflicts detected along eastern flight level FL260."
            ),
            "evasion_waypoints": target_ac["evasion_waypoints"],
            "can_auto_commit": True,
        }
        CRISIS_STATE["retasking_plan"] = retasking_plan
        return retasking_plan

    elif crisis_type == "RUNWAY_DENIAL":
        CRISIS_STATE["target_aircraft_id"] = "RES-UAV-01"
        CRISIS_STATE["threat_id"] = "BASE-FOXTROT"
        uav_ac = next(a for a in AIRCRAFT_TELEMETRY if a["id"] == "RES-UAV-01")

        retasking_plan = {
            "incident_id": f"INC-CRISIS-{int(datetime.now().timestamp())}",
            "crisis_summary": "Forward Base Foxtrot Runway 14/32 closed due to hostile drone breach and runway cratering.",
            "threat_entity": "Forward Base Foxtrot Runway Denial",
            "urgency": "DIVERT_ALTERNATE_AIRBASE",
            "affected_aircraft": {
                "id": uav_ac["id"],
                "callsign": uav_ac["callsign"],
                "pilot": uav_ac["pilot"],
                "current_fuel_pct": uav_ac["fuel_pct"],
            },
            "recommendation_title": "Emergency Recovery Diversion to Sector-Alpha Airbase",
            "action_type": "DIVERT_RECOVERY_BASE",
            "delta_metrics": {
                "original_distance_km": 0.0,
                "retasked_distance_km": 410.0,
                "distance_delta_km": 410.0,
                "fuel_burn_delta_kg": 620.0,
                "fuel_pct_cost": 18.2,
                "eta_delay_minutes": 55.0,
                "threat_exposure_reduction_pct": 100.0,
                "survivability_score_before": 15.0,
                "survivability_score_after": 97.0,
            },
            "decision_radar_scores": {
                "survivability": 97.0,
                "mission_success_prob": 92.0,
                "fuel_feasibility": 88.0,
                "crew_duty_compliance": 98.0,
                "airspace_deconfliction": 96.0,
            },
            "xai_rationale": (
                "Sector-Alpha Airbase selected as secondary recovery base with 8 available hangars and runway 09 fully operational. "
                "UAV endurance remaining (91.2%) permits transit with 52% reserve margin upon touchdown."
            ),
            "evasion_waypoints": [
                {"name": "BASE-FOXTROT", "lat": 31.6340, "lng": 74.8723, "alt_ft": 48000},
                {"name": "DIVERT-WAYPOINT-1", "lat": 30.2000, "lng": 76.1000, "alt_ft": 35000},
                {"name": "BASE-ALPHA", "lat": 28.6139, "lng": 77.2090, "alt_ft": 1000},
            ],
            "can_auto_commit": True,
        }
        CRISIS_STATE["retasking_plan"] = retasking_plan
        return retasking_plan

    else:
        # Default fallback
        CRISIS_STATE["target_aircraft_id"] = "RES-C130-01"
        sam_th = next(t for t in THREAT_ZONES if t["id"] == "THR-SAM-01")
        sam_th["is_active"] = True
        return inject_tactical_crisis("SAM_RADAR_ACTIVATED")


def commit_tactical_retasking(approved: bool = True, reviewer: str = "Commander Alpha") -> Dict[str, Any]:
    """
    Applies the retasking plan to the live telemetry model, resolving the crisis.
    """
    if not CRISIS_STATE["is_crisis_active"] or not CRISIS_STATE["retasking_plan"]:
        return {"status": "NO_ACTIVE_CRISIS", "message": "No active crisis to commit."}

    target_id = CRISIS_STATE["target_aircraft_id"]
    plan = CRISIS_STATE["retasking_plan"]

    if approved:
        target_ac = next((a for a in AIRCRAFT_TELEMETRY if a["id"] == target_id), None)
        if target_ac:
            target_ac["is_retasked"] = True
            target_ac["threat_alert"] = False
            if plan.get("evasion_waypoints"):
                target_ac["evasion_waypoints"] = plan["evasion_waypoints"]

        CRISIS_STATE["is_crisis_active"] = False
        CRISIS_STATE["retasking_plan"] = None

        return {
            "status": "RETASKING_COMMITTED",
            "message": f"Retasking order approved by {reviewer}. New flight waypoints transmitted via Link-16 datalink.",
            "aircraft_id": target_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    else:
        CRISIS_STATE["is_crisis_active"] = False
        CRISIS_STATE["retasking_plan"] = None
        return {
            "status": "RETASKING_REJECTED",
            "message": f"Retasking order rejected by {reviewer}. Aircraft retains original flight plan at commander discretion.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


def get_multi_source_fusion_status() -> Dict[str, Any]:
    """
    Monitors all 5 ingested intelligence streams and detects sensor spoofing/inconsistencies.
    """
    now = datetime.now(timezone.utc)
    streams = [
        {
            "id": "STREAM-RADAR-ADSB",
            "name": "Link-16 Tactical Data Link & ADS-B Ground Radar",
            "provider": "Air Defence Ground Environment System (ADGES)",
            "status": "OPTIMAL",
            "latency_ms": 38,
            "sync_rate_hz": 10.0,
            "integrity_score": 99.8,
            "records_per_min": 1420,
            "last_packet": now.isoformat(),
        },
        {
            "id": "STREAM-MET-DOPPLER",
            "name": "Doppler Weather Radar & Satellite Reflectivity",
            "provider": "Military Meteorological Network (MMN)",
            "status": "OPTIMAL",
            "latency_ms": 120,
            "sync_rate_hz": 0.5,
            "integrity_score": 97.4,
            "records_per_min": 60,
            "last_packet": (now - timedelta(seconds=12)).isoformat(),
        },
        {
            "id": "STREAM-EW-SIGINT",
            "name": "Tactical ELINT / SIGINT Threat Intelligence",
            "provider": "Electronic Support Measures (ESM) Overwatch",
            "status": "HIGH_ALERT",
            "latency_ms": 65,
            "sync_rate_hz": 2.0,
            "integrity_score": 98.9,
            "records_per_min": 310,
            "last_packet": (now - timedelta(seconds=2)).isoformat(),
        },
        {
            "id": "STREAM-ARMORY-DEPOT",
            "name": "Armament & Munitions Logistics Inventory",
            "provider": "Air Force Central Armaments Depot (AFCAD)",
            "status": "OPTIMAL",
            "latency_ms": 240,
            "sync_rate_hz": 0.2,
            "integrity_score": 99.1,
            "records_per_min": 24,
            "last_packet": (now - timedelta(seconds=45)).isoformat(),
        },
        {
            "id": "STREAM-MAINT-HUMS",
            "name": "Health & Usage Monitoring System (HUMS Telemetry)",
            "provider": "Fleet Maintenance Automated Diagnostics (FMAD)",
            "status": "STALE_WARNING",
            "latency_ms": 1850,
            "sync_rate_hz": 0.1,
            "integrity_score": 91.2,
            "records_per_min": 18,
            "last_packet": (now - timedelta(minutes=4)).isoformat(),
        },
    ]

    # Inconsistency checks
    inconsistencies = [
        {
            "id": "INC-FUSION-01",
            "type": "TELEMETRY_LATENCY_DESYNC",
            "severity": "WARNING",
            "source_pair": ["FMAD Telemetry", "ADGES Radar Track"],
            "target_resource": "RES-C130-03 (SkyLighter Charlie)",
            "description": "HUMS sensor packet is 4 minutes delayed relative to live radar track. Flagged for planner verification.",
            "auto_resolved": False,
        },
        {
            "id": "INC-FUSION-02",
            "type": "RADAR_WEATHER_CORRELATION",
            "severity": "INFO",
            "source_pair": ["MMN Weather", "Coastal Delta Tower"],
            "target_resource": "Coastal Station Delta Runway",
            "description": "55 dBZ storm reflectivity verified by both satellite IR and ground microbarograph sensor.",
            "auto_resolved": True,
        },
    ]

    return {
        "fusion_engine": "AeroSync Multi-Source Data Fusion Grid v2.6",
        "composite_integrity_pct": 97.3,
        "active_stream_count": len(streams),
        "streams": streams,
        "inconsistencies": inconsistencies,
        "last_audit_sync": now.isoformat(),
    }


def generate_ato_briefing(mission_id: str = "REQ-2026-002") -> Dict[str, Any]:
    """
    Generates a military-grade Air Tasking Order (ATO) Briefing Sheet.
    """
    now = datetime.now(timezone.utc)
    ac = next((a for a in AIRCRAFT_TELEMETRY if a.get("mission_id") == mission_id), AIRCRAFT_TELEMETRY[0])

    return {
        "ato_number": f"ATO-2026-{now.strftime('%j')}-042",
        "zulu_effective": now.strftime("%d%H%MZ %b %Y"),
        "security_classification": "TACTICAL SECRET // NON-COMBAT DEMONSTRATOR",
        "mission_task": {
            "mission_id": mission_id,
            "callsign": ac["callsign"],
            "aircraft_type": ac["type"],
            "tail_number": ac["id"],
            "pilot_in_command": ac["pilot"],
            "departure_base": ac["origin_base"],
            "destination_base": ac["destination_base"],
            "alternate_recovery_base": "Sector-Gamma Hub",
        },
        "flight_corridor": {
            "flight_level": f"FL{ac['altitude_ft'] // 100}",
            "cruising_speed_kts": ac["speed_kts"],
            "assigned_squawk_code": "4271 (MODE-S ENCRYPTED)",
            "tactical_freq_mhz": "243.0 UHF / 121.5 VHF Guard",
            "bingo_fuel_pct": 30.0,
            "combat_radius_km": ac["combat_radius_km"],
        },
        "ordnance_and_stores": ac["weapon_loadout"],
        "threat_environment": {
            "threat_warning_level": "ORANGE (CONTESTED EW / RADAR COVERAGE)",
            "rules_of_engagement": "ROE-ALPHA: Stand-off evasion mandatory. Maintain minimum 25 km separation from active SAM envelopes.",
            "active_threats_along_sector": [
                {"threat": t["name"], "type": t["type"], "lethality": t["lethality_level"]}
                for t in THREAT_ZONES if t["is_active"]
            ],
        },
        "special_instructions_spins": [
            "1. Comms silence in effect across Sector-Gamma boundary except via encrypted Link-16.",
            "2. In event of GNSS jamming, revert to Inertial Navigation System (INS) Waypoint Fixes.",
            "3. Emergency divert authorized to Sector-Gamma Hub runway 12 without prior clearance.",
        ],
        "authorized_by": "Air Operations Center (AOC) / Chief Operations Officer",
    }
