from datetime import datetime, timezone, timedelta
from typing import List
from sqlalchemy.orm import Session
from app.models.models import (
    Base, Resource, ResourceType, ResourceStatus, CrewReadiness, CrewStatus,
    MaintenanceRecord, EnvironmentalCondition, AirspaceConstraint,
    MissionRequest, RequestPriority, RequestStatus, PlanningScenario,
    Recommendation, ScheduleAssignment, Approval, AuditEvent, AuditAction,
    RecommendationStatus
)

from app.services.audit import log_audit_event

def utc_now():
    return datetime.now(timezone.utc)

def seed_database(db: Session, force_reset: bool = True):
    """
    Seeds the database with 20+ resources, crew, maintenance, weather, airspace, and 12+ mission requests.
    Includes stale and incomplete data examples for data quality demonstration.
    """
    Base.metadata.create_all(bind=db.get_bind())
    if force_reset:
        db.query(Approval).delete()

        db.query(ScheduleAssignment).delete()
        db.query(Recommendation).delete()
        db.query(PlanningScenario).delete()
        db.query(MissionRequest).delete()
        db.query(AirspaceConstraint).delete()
        db.query(EnvironmentalCondition).delete()
        db.query(MaintenanceRecord).delete()
        db.query(CrewReadiness).delete()
        db.query(Resource).delete()
        db.query(AuditEvent).delete()
        db.commit()

    now = utc_now()
    stale_time = now - timedelta(hours=36) # Older than 24h threshold to trigger stale alert

    # 1. Populate 20 Fictional Resources
    resources_data = [
        # Cargo Transports
        {"id": "RES-C130-01", "name": "SkyLighter Alpha", "type": ResourceType.CARGO_TRANSPORT, "status": ResourceStatus.AVAILABLE, "base": "Sector-Alpha Airbase", "payload": 18000.0, "range": 3800.0, "wind": 50.0, "vis": 1.0, "caps": ["NIGHT_FLIGHT", "HEAVY_LIFT", "LONG_RANGE"], "health": 98.0, "source": "TELEMETRY_MAIN", "upd": now},
        {"id": "RES-C130-02", "name": "SkyLighter Bravo", "type": ResourceType.CARGO_TRANSPORT, "status": ResourceStatus.AVAILABLE, "base": "Sector-Beta Airbase", "payload": 18000.0, "range": 3800.0, "wind": 50.0, "vis": 1.0, "caps": ["NIGHT_FLIGHT", "HEAVY_LIFT"], "health": 92.0, "source": "TELEMETRY_MAIN", "upd": now},
        {"id": "RES-C130-03", "name": "SkyLighter Charlie", "type": ResourceType.CARGO_TRANSPORT, "status": ResourceStatus.DEGRADED, "base": "Sector-Gamma Hub", "payload": 15000.0, "range": 3000.0, "wind": 40.0, "vis": 2.0, "caps": ["HEAVY_LIFT"], "health": 74.0, "source": "TELEMETRY_LEGACY", "upd": stale_time}, # STALE RECORD
        {"id": "RES-C17-04", "name": "Titan Heavy-01", "type": ResourceType.CARGO_TRANSPORT, "status": ResourceStatus.AVAILABLE, "base": "Sector-Alpha Airbase", "payload": 45000.0, "range": 4400.0, "wind": 55.0, "vis": 1.0, "caps": ["NIGHT_FLIGHT", "HEAVY_LIFT", "EXTENDED_FUEL"], "health": 96.0, "source": "TELEMETRY_MAIN", "upd": now},
        
        # Rescue Helicopters
        {"id": "RES-HELO-01", "name": "Guardian Rescue-01", "type": ResourceType.RESCUE_HELICOPTER, "status": ResourceStatus.AVAILABLE, "base": "Coastal Station Delta", "payload": 2500.0, "range": 800.0, "wind": 45.0, "vis": 0.8, "caps": ["HOIST", "NIGHT_FLIGHT", "WATER_RESCUE"], "health": 99.0, "source": "TELEMETRY_MAIN", "upd": now},
        {"id": "RES-HELO-02", "name": "Guardian Rescue-02", "type": ResourceType.RESCUE_HELICOPTER, "status": ResourceStatus.AVAILABLE, "base": "Coastal Station Delta", "payload": 2500.0, "range": 800.0, "wind": 45.0, "vis": 0.8, "caps": ["HOIST", "NIGHT_FLIGHT"], "health": 85.0, "source": "TELEMETRY_MAIN", "upd": now}, # WILL HAVE MAINT OVERLAP (CONFLICT DEMO)
        {"id": "RES-HELO-03", "name": "Guardian Rescue-03", "type": ResourceType.RESCUE_HELICOPTER, "status": ResourceStatus.MAINTENANCE, "base": "Sector-Beta Airbase", "payload": 2200.0, "range": 750.0, "wind": 40.0, "vis": 1.5, "caps": ["HOIST"], "health": 60.0, "source": "MAINT_SYSTEM", "upd": now},
        {"id": "RES-HELO-04", "name": "Mountain Falcon-01", "type": ResourceType.RESCUE_HELICOPTER, "status": ResourceStatus.AVAILABLE, "base": "Highland Outpost Echo", "payload": 3000.0, "range": 950.0, "wind": 50.0, "vis": 0.5, "caps": ["HOIST", "HIGH_ALTITUDE", "NIGHT_FLIGHT"], "health": 94.0, "source": "TELEMETRY_MAIN", "upd": now},

        # Recon UAVs
        {"id": "RES-UAV-01", "name": "Shadow Eye-01", "type": ResourceType.RECON_UAV, "status": ResourceStatus.AVAILABLE, "base": "Forward Base Foxtrot", "payload": 400.0, "range": 1500.0, "wind": 30.0, "vis": 0.0, "caps": ["THERMAL_IMAGING", "LONG_ENDURANCE", "LIDAR"], "health": 97.0, "source": "UAV_TELEMETRY", "upd": now},
        {"id": "RES-UAV-02", "name": "Shadow Eye-02", "type": ResourceType.RECON_UAV, "status": ResourceStatus.AVAILABLE, "base": "Forward Base Foxtrot", "payload": 400.0, "range": 1500.0, "wind": 30.0, "vis": 0.0, "caps": ["THERMAL_IMAGING", "LONG_ENDURANCE"], "health": 91.0, "source": "UAV_TELEMETRY", "upd": now},
        {"id": "RES-UAV-03", "name": "Sentinel Drone-03", "type": ResourceType.RECON_UAV, "status": ResourceStatus.UNAVAILABLE, "base": "Sector-Gamma Hub", "payload": 200.0, "range": 800.0, "wind": 25.0, "vis": 0.0, "caps": ["OPTICAL_SURVEY"], "health": 30.0, "source": "UAV_TELEMETRY", "upd": now},
        {"id": "RES-UAV-04", "name": "Sentinel Drone-04", "type": ResourceType.RECON_UAV, "status": ResourceStatus.AVAILABLE, "base": "Sector-Alpha Airbase", "payload": 500.0, "range": 1800.0, "wind": 35.0, "vis": 0.0, "caps": ["THERMAL_IMAGING", "OPTICAL_SURVEY"], "health": 88.0, "source": "UAV_TELEMETRY", "upd": now},

        # Patrol Aircraft
        {"id": "RES-PAT-01", "name": "Coastal Overwatch-01", "type": ResourceType.PATROL_AIRCRAFT, "status": ResourceStatus.AVAILABLE, "base": "Coastal Station Delta", "payload": 5000.0, "range": 2800.0, "wind": 45.0, "vis": 1.2, "caps": ["RADAR_SURVEILLANCE", "MARITIME_SEARCH"], "health": 95.0, "source": "TELEMETRY_MAIN", "upd": now},
        {"id": "RES-PAT-02", "name": "Coastal Overwatch-02", "type": ResourceType.PATROL_AIRCRAFT, "status": ResourceStatus.AVAILABLE, "base": "Coastal Station Delta", "payload": 5000.0, "range": 2800.0, "wind": 45.0, "vis": 1.2, "caps": ["RADAR_SURVEILLANCE", "NIGHT_FLIGHT"], "health": 93.0, "source": "TELEMETRY_MAIN", "upd": now},
        {"id": "RES-PAT-03", "name": "Northern Patrol-01", "type": ResourceType.PATROL_AIRCRAFT, "status": ResourceStatus.AVAILABLE, "base": "Highland Outpost Echo", "payload": 4500.0, "range": 2600.0, "wind": 45.0, "vis": 1.0, "caps": ["RADAR_SURVEILLANCE", "COLD_WEATHER"], "health": 89.0, "source": "TELEMETRY_MAIN", "upd": now},
        {"id": "RES-PAT-04", "name": "Northern Patrol-02", "type": ResourceType.PATROL_AIRCRAFT, "status": ResourceStatus.DEGRADED, "base": "Sector-Gamma Hub", "payload": 4000.0, "range": 2200.0, "wind": 35.0, "vis": 2.0, "caps": ["RADAR_SURVEILLANCE"], "health": 72.0, "source": "TELEMETRY_MAIN", "upd": now},

        # Medevac
        {"id": "RES-MED-01", "name": "Lifeguard Medevac-01", "type": ResourceType.MEDEVAC, "status": ResourceStatus.AVAILABLE, "base": "Sector-Alpha Airbase", "payload": 1800.0, "range": 1200.0, "wind": 40.0, "vis": 1.0, "caps": ["MEDICAL_ICU", "NIGHT_FLIGHT", "RAPID_DISPATCH"], "health": 99.0, "source": "MEDEVAC_DISPATCH", "upd": now},
        {"id": "RES-MED-02", "name": "Lifeguard Medevac-02", "type": ResourceType.MEDEVAC, "status": ResourceStatus.AVAILABLE, "base": "Sector-Beta Airbase", "payload": 1800.0, "range": 1200.0, "wind": 40.0, "vis": 1.0, "caps": ["MEDICAL_ICU", "RAPID_DISPATCH"], "health": 96.0, "source": "MEDEVAC_DISPATCH", "upd": now},
        {"id": "RES-MED-03", "name": "AeroRescue Medevac-03", "type": ResourceType.MEDEVAC, "status": ResourceStatus.AVAILABLE, "base": "Highland Outpost Echo", "payload": 1600.0, "range": 1100.0, "wind": 38.0, "vis": 1.5, "caps": ["MEDICAL_ICU"], "health": 91.0, "source": "MEDEVAC_DISPATCH", "upd": now},
        {"id": "RES-MED-04", "name": "AeroRescue Medevac-04", "type": ResourceType.MEDEVAC, "status": ResourceStatus.AVAILABLE, "base": "Coastal Station Delta", "payload": 1600.0, "range": 1100.0, "wind": 38.0, "vis": 1.5, "caps": ["MEDICAL_ICU"], "health": 87.0, "source": "MEDEVAC_DISPATCH", "upd": now},
    ]

    for item in resources_data:
        r = Resource(
            id=item["id"],
            name=item["name"],
            resource_type=item["type"],
            status=item["status"],
            location_base=item["base"],
            payload_capacity_kg=item["payload"],
            range_km=item["range"],
            max_wind_resistance_kts=item["wind"],
            min_visibility_km=item["vis"],
            capabilities=item["caps"],
            health_score=item["health"],
            source=item["source"],
            last_updated=item["upd"],
            created_at=now - timedelta(days=30)
        )
        db.add(r)
    db.flush()

    # 2. Crew Readiness Records
    pilots = [
        ("RES-C130-01", "Capt. Vance Miller", "Lt. Sarah Jenkins", CrewStatus.READY, ["NIGHT_FLIGHT", "HEAVY_LIFT"], 4.5),
        ("RES-C130-02", "Capt. David Miller", "Lt. Alex Chen", CrewStatus.READY, ["HEAVY_LIFT"], 3.0),
        ("RES-C130-03", "Capt. Robert Lang", "Lt. Emma Watson", CrewStatus.RESTING, ["HEAVY_LIFT"], 0.0),
        ("RES-C17-04", "Capt. James Sterling", "Lt. Maya Lin", CrewStatus.READY, ["NIGHT_FLIGHT", "HEAVY_LIFT"], 6.0),
        
        ("RES-HELO-01", "Lt. Cdr. Eric Vance", "Ensign Pete Mitchell", CrewStatus.READY, ["HOIST", "NIGHT_FLIGHT"], 2.0),
        ("RES-HELO-02", "Capt. Jessica Taylor", "Lt. Tom Davis", CrewStatus.READY, ["HOIST"], 14.5), # HIGH DUTY HOURS (>12h FATIGUE ALERT)
        ("RES-HELO-03", "Capt. Michael Ross", "Lt. Donna Paul", CrewStatus.UNAVAILABLE, ["HOIST"], 0.0),
        ("RES-HELO-04", "Lt. Marcus Brody", "Lt. Sean Bean", CrewStatus.READY, ["HOIST", "HIGH_ALTITUDE"], 5.0),

        ("RES-UAV-01", "Operator Alan Turing", None, CrewStatus.READY, ["THERMAL_IMAGING"], 4.0),
        ("RES-UAV-02", "Operator Grace Hopper", None, CrewStatus.READY, ["THERMAL_IMAGING"], 3.5),
        ("RES-PAT-01", "Capt. John Matrix", "Lt. Ben Richards", CrewStatus.READY, ["RADAR_SURVEILLANCE"], 5.0),
        ("RES-MED-01", "Dr. Beverly Crusher", "Paramedic McCoy", CrewStatus.READY, ["MEDICAL_ICU"], 3.0),
    ]

    for idx, (res_id, p_name, co_name, status, certs, duty) in enumerate(pilots):
        c = CrewReadiness(
            id=f"crew-{idx+1:02d}",
            resource_id=res_id,
            pilot_name=p_name,
            co_pilot_name=co_name,
            crew_status=status,
            certifications=certs,
            consecutive_duty_hours=duty,
            source="CREW_ROSTER_SYS",
            last_updated=now - timedelta(hours=idx)
        )
        db.add(c)
    db.flush()

    # 3. Maintenance Records
    maints = [
        # RES-HELO-02 has urgent maintenance overlapping with mission window (Demonstration Scenario!)
        {
            "id": "maint-demo-01",
            "res_id": "RES-HELO-02",
            "title": "Emergency Hydraulic Pump Inspection",
            "desc": "Scheduled maintenance due to hydraulic pressure fluctuation alert.",
            "start": now + timedelta(hours=1),
            "end": now + timedelta(hours=8),
            "completed": False,
            "lead": "Tech Chief Williams"
        },
        {
            "id": "maint-02",
            "res_id": "RES-HELO-03",
            "title": "Scheduled Rotor Assembly Overhaul",
            "desc": "500-hour rotor head disassembly and NDT inspection.",
            "start": now - timedelta(hours=12),
            "end": now + timedelta(hours=36),
            "completed": False,
            "lead": "Tech Chief Garcia"
        },
        {
            "id": "maint-03",
            "res_id": "RES-UAV-03",
            "title": "Avionics Firmware Flashing & Calibration",
            "desc": "System replacement following comm link error.",
            "start": now - timedelta(hours=2),
            "end": now + timedelta(hours=10),
            "completed": False,
            "lead": "Tech Eng. Zhao"
        }
    ]

    for m in maints:
        mr = MaintenanceRecord(
            id=m["id"],
            resource_id=m["res_id"],
            title=m["title"],
            description=m["desc"],
            start_time=m["start"],
            end_time=m["end"],
            is_completed=m["completed"],
            technician_lead=m["lead"],
            source="MAINT_LOGISTICS_SYS",
            last_updated=now
        )
        db.add(mr)
    db.flush()

    # 4. Environmental Conditions
    weathers = [
        {"id": "env-01", "region": "Sector-Alpha Airbase", "wind": 18.0, "vis": 12.0, "precip": "NONE", "temp": 24.0, "hazard": "LOW"},
        {"id": "env-02", "region": "Sector-Beta Airbase", "wind": 22.0, "vis": 8.0, "precip": "LIGHT_RAIN", "temp": 18.0, "hazard": "LOW"},
        {"id": "env-03", "region": "Coastal Station Delta", "wind": 48.0, "vis": 0.6, "precip": "STORM", "temp": 14.0, "hazard": "SEVERE"}, # SEVERE WEATHER WARNING
        {"id": "env-04", "region": "Highland Outpost Echo", "wind": 28.0, "vis": 4.0, "precip": "FOG", "temp": 2.0, "hazard": "MODERATE"},
        {"id": "env-05", "region": "Forward Base Foxtrot", "wind": 12.0, "vis": 15.0, "precip": "NONE", "temp": 28.0, "hazard": "LOW"},
        {"id": "env-06", "region": "Sector-Gamma Hub", "wind": 15.0, "vis": 10.0, "precip": "NONE", "temp": 22.0, "hazard": "LOW"},
    ]

    for w in weathers:
        ec = EnvironmentalCondition(
            id=w["id"],
            location_region=w["region"],
            wind_speed_kts=w["wind"],
            visibility_km=w["vis"],
            precipitation=w["precip"],
            temperature_celsius=w["temp"],
            hazard_level=w["hazard"],
            source="MET_SERVICE_SYS",
            recorded_at=now,
            last_updated=now
        )
        db.add(ec)
    db.flush()

    # 5. Airspace Restrictions
    airspaces = [
        {
            "id": "airspace-01",
            "zone": "Coastal Station Delta",
            "type": "NO_FLY",
            "min_alt": 0.0,
            "max_alt": 25000.0,
            "start": now - timedelta(hours=2),
            "end": now + timedelta(hours=14),
            "active": True,
            "reason": "Severe storm Squall Line and Lightning Cell"
        },
        {
            "id": "airspace-02",
            "zone": "Sector-Gamma Hub",
            "type": "ALTITUDE_RESTRICTED",
            "min_alt": 10000.0,
            "max_alt": 30000.0,
            "start": now - timedelta(hours=5),
            "end": now + timedelta(hours=20),
            "active": True,
            "reason": "Civilian Traffic Air Corridor Calibration"
        }
    ]

    for a in airspaces:
        ac = AirspaceConstraint(
            id=a["id"],
            zone_name=a["zone"],
            restriction_type=a["type"],
            min_altitude_ft=a["min_alt"],
            max_altitude_ft=a["max_alt"],
            start_time=a["start"],
            end_time=a["end"],
            is_active=a["active"],
            reason=a["reason"],
            source="AIRSPACE_MGMT_SYS",
            last_updated=now
        )
        db.add(ac)
    db.flush()

    # 6. 12 Abstract Planning Requests
    requests_data = [
        # Demo Request 1: Needs Rescue Helo at Coastal Station Delta (Triggers conflict with RES-HELO-02 under maintenance)
        {
            "id": "REQ-2026-001",
            "title": "Offshore Emergency Evacuation Alpha",
            "desc": "Emergency airlift request for medical supply transport to island relief station.",
            "type": ResourceType.RESCUE_HELICOPTER,
            "caps": ["HOIST", "NIGHT_FLIGHT"],
            "origin": "Sector-Alpha Airbase",
            "dest": "Highland Outpost Echo",
            "start": now + timedelta(hours=2),
            "end": now + timedelta(hours=6),
            "payload": 2000.0,
            "dist": 450.0,
            "priority": RequestPriority.CRITICAL,
            "status": RequestStatus.UNASSIGNED
        },
        {
            "id": "REQ-2026-002",
            "title": "Inter-Hub Cargo Logistics Shuttling",
            "desc": "Routine heavy logistics transport of generator parts between central airbases.",
            "type": ResourceType.CARGO_TRANSPORT,
            "caps": ["HEAVY_LIFT"],
            "origin": "Sector-Alpha Airbase",
            "dest": "Sector-Beta Airbase",
            "start": now + timedelta(hours=4),
            "end": now + timedelta(hours=10),
            "payload": 12000.0,
            "dist": 1200.0,
            "priority": RequestPriority.HIGH,
            "status": RequestStatus.UNASSIGNED
        },
        {
            "id": "REQ-2026-003",
            "title": "Perimeter Environmental Reconnaissance",
            "desc": "Thermal aerial survey of northern flood plains.",
            "type": ResourceType.RECON_UAV,
            "caps": ["THERMAL_IMAGING", "LONG_ENDURANCE"],
            "origin": "Forward Base Foxtrot",
            "dest": "Forward Base Foxtrot",
            "start": now + timedelta(hours=3),
            "end": now + timedelta(hours=9),
            "payload": 150.0,
            "dist": 600.0,
            "priority": RequestPriority.MEDIUM,
            "status": RequestStatus.UNASSIGNED
        },
        {
            "id": "REQ-2026-004",
            "title": "Critical ICU Patient Transfer",
            "desc": "Urgent air ambulance transit for specialized medical patient.",
            "type": ResourceType.MEDEVAC,
            "caps": ["MEDICAL_ICU", "RAPID_DISPATCH"],
            "origin": "Sector-Beta Airbase",
            "dest": "Sector-Alpha Airbase",
            "start": now + timedelta(hours=1),
            "end": now + timedelta(hours=4),
            "payload": 800.0,
            "dist": 500.0,
            "priority": RequestPriority.CRITICAL,
            "status": RequestStatus.UNASSIGNED
        },
        {
            "id": "REQ-2026-005",
            "title": "Highland Search Patrol Sweep",
            "desc": "Overwatch sweep across mountainous pass following severe fog report.",
            "type": ResourceType.PATROL_AIRCRAFT,
            "caps": ["RADAR_SURVEILLANCE"],
            "origin": "Highland Outpost Echo",
            "dest": "Highland Outpost Echo",
            "start": now + timedelta(hours=5),
            "end": now + timedelta(hours=11),
            "payload": 1200.0,
            "dist": 1400.0,
            "priority": RequestPriority.MEDIUM,
            "status": RequestStatus.UNASSIGNED
        },
        {
            "id": "REQ-2026-006",
            "title": "Heavy Infrastructure Freight Relay",
            "desc": "Bulk transport of emergency shelter modules and water purification units.",
            "type": ResourceType.CARGO_TRANSPORT,
            "caps": ["HEAVY_LIFT", "NIGHT_FLIGHT"],
            "origin": "Sector-Alpha Airbase",
            "dest": "Forward Base Foxtrot",
            "start": now + timedelta(hours=6),
            "end": now + timedelta(hours=14),
            "payload": 25000.0,
            "dist": 2200.0,
            "priority": RequestPriority.HIGH,
            "status": RequestStatus.UNASSIGNED
        },
        {
            "id": "REQ-2026-007",
            "title": "High-Altitude Rescue Support",
            "desc": "Standby rescue helicopter coverage for alpine survey team.",
            "type": ResourceType.RESCUE_HELICOPTER,
            "caps": ["HOIST", "HIGH_ALTITUDE"],
            "origin": "Highland Outpost Echo",
            "dest": "Highland Outpost Echo",
            "start": now + timedelta(hours=4),
            "end": now + timedelta(hours=8),
            "payload": 1500.0,
            "dist": 300.0,
            "priority": RequestPriority.HIGH,
            "status": RequestStatus.UNASSIGNED
        },
        {
            "id": "REQ-2026-008",
            "title": "Coastal Maritime Radar Patrol",
            "desc": "Overwatch monitoring along coastal shipping channel.",
            "type": ResourceType.PATROL_AIRCRAFT,
            "caps": ["RADAR_SURVEILLANCE", "MARITIME_SEARCH"],
            "origin": "Sector-Alpha Airbase",
            "dest": "Sector-Beta Airbase",
            "start": now + timedelta(hours=8),
            "end": now + timedelta(hours=16),
            "payload": 2000.0,
            "dist": 1800.0,
            "priority": RequestPriority.LOW,
            "status": RequestStatus.UNASSIGNED
        },
        {
            "id": "REQ-2026-009",
            "title": "Optical Mapping UAV Sortie",
            "desc": "High resolution survey mapping of agricultural reservoir lines.",
            "type": ResourceType.RECON_UAV,
            "caps": ["OPTICAL_SURVEY"],
            "origin": "Sector-Alpha Airbase",
            "dest": "Sector-Gamma Hub",
            "start": now + timedelta(hours=2),
            "end": now + timedelta(hours=5),
            "payload": 100.0,
            "dist": 400.0,
            "priority": RequestPriority.LOW,
            "status": RequestStatus.UNASSIGNED
        },
        {
            "id": "REQ-2026-010",
            "title": "Emergency Organ Transport Sprint",
            "desc": "Time-critical rapid dispatch medevac flight.",
            "type": ResourceType.MEDEVAC,
            "caps": ["MEDICAL_ICU", "RAPID_DISPATCH"],
            "origin": "Sector-Beta Airbase",
            "dest": "Forward Base Foxtrot",
            "start": now + timedelta(hours=3),
            "end": now + timedelta(hours=6),
            "payload": 500.0,
            "dist": 800.0,
            "priority": RequestPriority.CRITICAL,
            "status": RequestStatus.UNASSIGNED
        },
        {
            "id": "REQ-2026-011",
            "title": "Infeasible Special Cargo Transport",
            "desc": "Request requiring 60,000kg payload capacity beyond all available fleet limits (Demonstrates explicit INFEASIBLE engine output).",
            "type": ResourceType.CARGO_TRANSPORT,
            "caps": ["HEAVY_LIFT", "EXTENDED_FUEL"],
            "origin": "Sector-Alpha Airbase",
            "dest": "Sector-Gamma Hub",
            "start": now + timedelta(hours=5),
            "end": now + timedelta(hours=9),
            "payload": 60000.0, # Exceeds 45,000kg max!
            "dist": 5000.0,
            "priority": RequestPriority.LOW,
            "status": RequestStatus.UNASSIGNED
        },
        {
            "id": "REQ-2026-012",
            "title": "Restricted Airspace Coastal Sortie",
            "desc": "Patrol flight into Coastal Station Delta during active NO-FLY storm restriction.",
            "type": ResourceType.PATROL_AIRCRAFT,
            "caps": ["RADAR_SURVEILLANCE"],
            "origin": "Coastal Station Delta",
            "dest": "Sector-Beta Airbase",
            "start": now + timedelta(hours=2),
            "end": now + timedelta(hours=6),
            "payload": 1000.0,
            "dist": 900.0,
            "priority": RequestPriority.MEDIUM,
            "status": RequestStatus.UNASSIGNED
        }
    ]

    for req in requests_data:
        mr = MissionRequest(
            id=req["id"],
            title=req["title"],
            description=req["desc"],
            required_resource_type=req["type"],
            required_capabilities=req["caps"],
            origin_location=req["origin"],
            destination_location=req["dest"],
            start_time=req["start"],
            end_time=req["end"],
            payload_weight_kg=req["payload"],
            distance_km=req["dist"],
            priority=req["priority"],
            status=req["status"],
            source="OPS_PLANNING_SYS",
            created_at=now,
            last_updated=now
        )
        db.add(mr)
    db.flush()

    # 7. Initial Seed Audit Event
    log_audit_event(
        db=db,
        action=AuditAction.DATA_IMPORT,
        actor_role="System Admin",
        actor_name="Demo Seed Script",
        related_entity_type="Dataset",
        related_entity_id="SEED-INIT-2026",
        details={"resources_loaded": len(resources_data), "requests_loaded": len(requests_data)},
        comments="Initial synthetic operational dataset successfully seeded."
    )

    db.commit()
    return True
