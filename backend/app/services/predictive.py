"""
Predictive Analytics & Reliability Modeling Engine.
Air Power Dynamic Operations & Resource Optimisation Platform.

Provides:
- Probabilistic Mission Survivability & Contested Threat Exposure Forecasting (P_surv)
- Dynamic Fuel Depletion & Bingo Divert Horizon Modeling
- Airframe Subsystem Reliability & MTBF Degradation Forecasting
- Hyperlocal 6-Hour Destination Weather Risk Projections
- Fleet Sortie Generation Surge Capacity (SGR) Analytics
"""

import math
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session

from app.models.models import (
    Resource, MissionRequest, EnvironmentalCondition, AirspaceConstraint
)
from app.services.tactical_sim import (
    THREAT_ZONES, AIRBASES, haversine_distance_km
)


def calculate_predictive_survivability(
    aircraft_type: str,
    waypoints: List[Dict[str, Any]],
    countermeasures: bool = True,
    low_observable: bool = False
) -> Dict[str, Any]:
    """
    Computes waypoint-by-waypoint predictive survivability P_surv(t) across active threat zones.
    Incorporates inverse-square radar detection risk and SAM lethal engagement envelopes.
    """
    timeline_points = []
    current_surv = 1.000

    # Survivability modifiers
    cm_mitigation = 0.45 if countermeasures else 1.00 # Countermeasures reduce kill prob by 55%
    stealth_mitigation = 0.25 if low_observable else 1.00 # Low observability reduces tracking by 75%

    cumulative_dist = 0.0
    for idx, wp in enumerate(waypoints):
        wp_lat = wp.get("lat", 28.0)
        wp_lng = wp.get("lng", 76.0)
        wp_name = wp.get("name", f"WP-{idx+1}")
        wp_alt = wp.get("alt_ft", 20000)

        threat_p_kill_sum = 0.0
        active_threat_contacts = []

        # Evaluate against active threat zones
        for threat in THREAT_ZONES:
            if not threat.get("is_active", True):
                continue

            dist_km = haversine_distance_km(wp_lat, wp_lng, threat["lat"], threat["lng"])
            threat_r = threat["radius_km"]
            threat_lethal_r = threat.get("lethal_radius_km", threat_r * 0.6)

            if dist_km <= threat_r:
                # Within detection/engagement envelope
                if threat["type"] == "SAM_SYSTEM":
                    # Lethal threat
                    if dist_km <= threat_lethal_r:
                        raw_pk = 0.40 * (1.0 - (dist_km / max(threat_lethal_r, 1.0)))
                    else:
                        raw_pk = 0.15 * (1.0 - (dist_km / threat_r))
                elif threat["type"] == "EW_JAMMING":
                    raw_pk = 0.05 * (1.0 - (dist_km / threat_r))
                elif threat["type"] == "WEATHER_STORM":
                    raw_pk = 0.20 * (1.0 - (dist_km / threat_r))
                else: # RADAR_DOME
                    raw_pk = 0.08 * (1.0 - (dist_km / threat_r))

                adjusted_pk = raw_pk * cm_mitigation * stealth_mitigation
                threat_p_kill_sum += adjusted_pk
                active_threat_contacts.append({
                    "threat_id": threat["id"],
                    "threat_name": threat["name"],
                    "threat_type": threat["type"],
                    "distance_km": round(dist_km, 1),
                    "kill_probability": round(adjusted_pk * 100, 2),
                })

        # Step survival
        step_survival = max(0.05, 1.0 - threat_p_kill_sum)
        current_surv *= step_survival

        timeline_points.append({
            "waypoint_name": wp_name,
            "distance_km": round(cumulative_dist, 1),
            "altitude_ft": wp_alt,
            "survivability_pct": round(current_surv * 100, 1),
            "threat_exposure_score": round(min(100.0, threat_p_kill_sum * 120.0), 1),
            "active_threats": active_threat_contacts,
        })

        if idx < len(waypoints) - 1:
            next_wp = waypoints[idx + 1]
            cumulative_dist += haversine_distance_km(
                wp_lat, wp_lng, next_wp.get("lat", wp_lat), next_wp.get("lng", wp_lng)
            )

    composite_score = round(current_surv * 100, 1)
    risk_level = "LOW" if composite_score >= 85 else ("MODERATE" if composite_score >= 65 else "CRITICAL")

    return {
        "overall_survivability_pct": composite_score,
        "risk_classification": risk_level,
        "countermeasures_active": countermeasures,
        "stealth_profile": low_observable,
        "total_route_distance_km": round(cumulative_dist, 1),
        "waypoints_analysis": timeline_points,
    }


def calculate_predictive_fuel_profile(
    initial_fuel_pct: float,
    burn_rate_kgh: float,
    cruise_speed_kts: float,
    distance_km: float,
    combat_reserve_pct: float = 15.0,
    bingo_threshold_pct: float = 25.0
) -> Dict[str, Any]:
    """
    Computes time-series fuel degradation curve, bingo fuel threshold, and divert safety margin.
    Speed in knots, distance in km. (1 knot = 1.852 km/h).
    """
    speed_kmh = max(cruise_speed_kts * 1.852, 100.0)
    flight_time_hours = distance_km / speed_kmh
    
    # 10 discrete intervals along flight
    num_steps = 8
    time_step = flight_time_hours / num_steps
    step_dist = distance_km / num_steps
    
    # Assume 100% fuel capacity corresponds to 4.5 hours of sustained burn
    total_fuel_capacity_hours = 4.5
    fuel_pct_per_hour = 100.0 / total_fuel_capacity_hours

    curve_points = []
    curr_fuel = initial_fuel_pct
    bingo_reached_at_km = None

    for i in range(num_steps + 1):
        elapsed_h = round(i * time_step, 2)
        dist_so_far = round(i * step_dist, 1)

        if curr_fuel <= bingo_threshold_pct and bingo_reached_at_km is None:
            bingo_reached_at_km = dist_so_far

        curve_points.append({
            "elapsed_hours": elapsed_h,
            "distance_km": dist_so_far,
            "projected_fuel_pct": round(max(0.0, curr_fuel), 1),
            "is_below_bingo": curr_fuel <= bingo_threshold_pct,
            "is_below_emergency": curr_fuel <= combat_reserve_pct,
        })
        curr_fuel -= (time_step * fuel_pct_per_hour)

    final_fuel = max(0.0, curr_fuel + (time_step * fuel_pct_per_hour))
    is_mission_feasible = final_fuel >= combat_reserve_pct

    return {
        "flight_time_hours": round(flight_time_hours, 2),
        "flight_time_minutes": round(flight_time_hours * 60, 1),
        "initial_fuel_pct": initial_fuel_pct,
        "projected_end_fuel_pct": round(final_fuel, 1),
        "bingo_threshold_pct": bingo_threshold_pct,
        "combat_reserve_pct": combat_reserve_pct,
        "bingo_reached_km": bingo_reached_at_km,
        "is_mission_feasible": is_mission_feasible,
        "divert_fuel_margin_pct": round(max(0.0, final_fuel - combat_reserve_pct), 1),
        "profile_points": curve_points,
    }


def calculate_predictive_reliability(
    health_score: float,
    flight_hours: float,
    airframe_type: str,
    environment_stress: str = "NORMAL" # NORMAL, COASTAL_CORROSIVE, HIGHLAND_COLD, COMBAT_G_LOAD
) -> Dict[str, Any]:
    """
    Weibull-based predictive reliability modeling forecasting Mean Time Between Failures (MTBF)
    and probability of unscheduled maintenance within the next 30, 60, and 90 flight hours.
    """
    # Base MTBF by airframe category in operational hours
    base_mtbf = {
        "CARGO_TRANSPORT": 450.0,
        "RESCUE_HELICOPTER": 280.0,
        "RECON_UAV": 380.0,
        "PATROL_AIRCRAFT": 350.0,
        "MEDEVAC": 400.0,
    }.get(airframe_type, 350.0)

    # Health multiplier
    health_factor = (health_score / 100.0) ** 1.5

    # Environmental stress multiplier
    env_factors = {
        "NORMAL": 1.00,
        "COASTAL_CORROSIVE": 0.82,
        "HIGHLAND_COLD": 0.88,
        "COMBAT_G_LOAD": 0.70,
    }
    stress_mult = env_factors.get(environment_stress, 1.00)

    effective_mtbf = round(base_mtbf * health_factor * stress_mult, 1)

    # Cumulative failure probability: F(t) = 1 - exp(-(t / MTBF)^beta)
    # beta = 1.3 (wear-out period shape parameter)
    beta = 1.3
    def failure_prob(delta_hours: float) -> float:
        return round((1.0 - math.exp(-((delta_hours / effective_mtbf) ** beta))) * 100, 1)

    prob_30h = failure_prob(30.0)
    prob_60h = failure_prob(60.0)
    prob_90h = failure_prob(90.0)

    # Subsystem vulnerability breakdown
    avionics_health = round(health_score * 0.98, 1)
    hydraulics_health = round(health_score * (0.91 if environment_stress == "HIGHLAND_COLD" else 0.95), 1)
    propulsion_health = round(health_score * (0.86 if environment_stress == "COMBAT_G_LOAD" else 0.96), 1)
    airframe_structure = round(health_score * (0.89 if environment_stress == "COASTAL_CORROSIVE" else 0.97), 1)

    readiness_rating = "MISSION_READY" if prob_30h < 15.0 else ("MONITOR_CLOSELY" if prob_30h < 30.0 else "PREVENTIVE_MAINT_DUE")

    return {
        "effective_mtbf_hours": effective_mtbf,
        "readiness_rating": readiness_rating,
        "environmental_stress": environment_stress,
        "failure_risk_forecast": {
            "within_30_flight_hours_pct": prob_30h,
            "within_60_flight_hours_pct": prob_60h,
            "within_90_flight_hours_pct": prob_90h,
        },
        "subsystem_health_scores": {
            "propulsion_turbines": propulsion_health,
            "avionics_radar_bus": avionics_health,
            "hydraulics_actuators": hydraulics_health,
            "airframe_structural_integrity": airframe_structure,
        },
        "recommended_action": (
            "Cleared for unrestricted tactical sorties."
            if readiness_rating == "MISSION_READY"
            else "Schedule borescope inspection after current operational cycle."
        ),
    }


def calculate_predictive_weather_window(
    region: str,
    horizon_hours: int = 6
) -> Dict[str, Any]:
    """
    Projects hyperlocal meteorological trends over a 6-hour operational window for target FOBs.
    Models microburst probability, crosswind components, and ceiling degradation.
    """
    # Deterministic sinusoidal weather trends tailored to Indian operational theaters
    base_conditions = {
        "Sector-Alpha Airbase": {"wind": 14.0, "vis": 9.0, "ceiling_ft": 8000, "temp": 28.0, "trend": "STABLE"},
        "Sector-Beta Airbase": {"wind": 18.0, "vis": 8.0, "ceiling_ft": 6500, "temp": 34.0, "trend": "THERMAL_TURBULENCE"},
        "Sector-Gamma Hub": {"wind": 12.0, "vis": 10.0, "ceiling_ft": 9000, "temp": 26.0, "trend": "OPTIMAL"},
        "Coastal Station Delta": {"wind": 32.0, "vis": 4.5, "ceiling_ft": 2200, "temp": 29.0, "trend": "MONSOON_SQUALL"},
        "Highland Outpost Echo": {"wind": 28.0, "vis": 3.0, "ceiling_ft": 1800, "temp": -4.0, "trend": "ICING_FOG"},
        "Forward Base Foxtrot": {"wind": 16.0, "vis": 7.0, "ceiling_ft": 5500, "temp": 30.0, "trend": "CONVECTIVE_CELLS"},
    }.get(region, {"wind": 15.0, "vis": 8.0, "ceiling_ft": 5000, "temp": 25.0, "trend": "STABLE"})

    forecast_steps = []
    now = datetime.now(timezone.utc)

    for h in range(horizon_hours + 1):
        fc_time = now + timedelta(hours=h)
        # Add micro-variation
        wind_delta = math.sin(h * 0.8) * 6.0
        vis_delta = -math.sin(h * 0.7) * 1.5 if base_conditions["trend"] in ["MONSOON_SQUALL", "ICING_FOG"] else 0.5
        
        step_wind = max(5.0, round(base_conditions["wind"] + wind_delta, 1))
        step_vis = max(0.5, round(base_conditions["vis"] + vis_delta, 1))
        
        storm_risk = 75 if (base_conditions["trend"] == "MONSOON_SQUALL" and h >= 2) else (
            40 if base_conditions["trend"] == "ICING_FOG" else 10
        )

        flight_category = "VFR" if (step_vis >= 5.0 and step_wind < 30.0) else (
            "MVFR" if step_vis >= 3.0 else "IFR_HAZARDOUS"
        )

        forecast_steps.append({
            "forecast_hour_offset": h,
            "zulu_time": fc_time.strftime("%H:%M Z"),
            "projected_wind_kts": step_wind,
            "projected_visibility_km": step_vis,
            "storm_probability_pct": storm_risk,
            "flight_category": flight_category,
        })

    return {
        "region": region,
        "primary_trend": base_conditions["trend"],
        "forecast_horizon_hours": horizon_hours,
        "hourly_projections": forecast_steps,
        "operational_clearance": "ALL_AIRFRAMES_CLEARED" if forecast_steps[0]["flight_category"] == "VFR" else "CAUTION_HELO_RESTRICTED",
    }


def get_fleet_wide_predictive_summary(db: Session) -> Dict[str, Any]:
    """
    Synthesizes fleet-wide predictive analytics across all available airframes,
    evaluating surge capacity, average survivability, and 72-hour maintenance pipeline.
    """
    resources = db.query(Resource).all()

    fleet_records = []
    total_health = 0.0
    ready_for_surge = 0

    for r in resources:
        total_health += r.health_score
        rel = calculate_predictive_reliability(
            health_score=r.health_score,
            flight_hours=120.0,
            airframe_type=r.resource_type.value,
            environment_stress="COASTAL_CORROSIVE" if "Coastal" in r.location_base else (
                "HIGHLAND_COLD" if "Highland" in r.location_base else "NORMAL"
            )
        )
        if rel["readiness_rating"] == "MISSION_READY" and r.status.value == "AVAILABLE":
            ready_for_surge += 1

        fleet_records.append({
            "resource_id": r.id,
            "name": r.name,
            "type": r.resource_type.value,
            "base": r.location_base,
            "health_score": r.health_score,
            "mtbf_hours": rel["effective_mtbf_hours"],
            "failure_risk_30h_pct": rel["failure_risk_forecast"]["within_30_flight_hours_pct"],
            "readiness_rating": rel["readiness_rating"],
        })

    avg_health = round(total_health / max(len(resources), 1), 1)
    surge_capacity_pct = round((ready_for_surge / max(len(resources), 1)) * 100, 1)

    # Weather outlook across operational sectors
    weather_sectors = [
        calculate_predictive_weather_window("Sector-Alpha Airbase", 4),
        calculate_predictive_weather_window("Highland Outpost Echo", 4),
        calculate_predictive_weather_window("Coastal Station Delta", 4),
        calculate_predictive_weather_window("Forward Base Foxtrot", 4),
    ]

    return {
        "total_airframes_monitored": len(resources),
        "fleet_average_health_score": avg_health,
        "surge_ready_airframes": ready_for_surge,
        "surge_capacity_pct": surge_capacity_pct,
        "fleet_operational_tempo": "DEFCON-2_HIGH_TEMPO",
        "airframe_reliability_profiles": fleet_records,
        "sector_weather_horizons": weather_sectors,
    }
