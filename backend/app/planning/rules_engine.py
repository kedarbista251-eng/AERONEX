from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.models import (
    Resource, MissionRequest, MaintenanceRecord, CrewReadiness,
    EnvironmentalCondition, AirspaceConstraint, ResourceStatus, CrewStatus
)

class ConstraintRuleResult:
    def __init__(self, rule_name: str, passed: bool, reason: str, metadata: Dict[str, Any] = None):
        self.rule_name = rule_name
        self.passed = passed
        self.reason = reason
        self.metadata = metadata or {}

    def to_dict(self):
        return {
            "rule_name": self.rule_name,
            "passed": self.passed,
            "reason": self.reason,
            "metadata": self.metadata
        }

def evaluate_hard_constraints_for_pair(
    resource: Resource,
    request: MissionRequest,
    db: Session
) -> Tuple[bool, List[ConstraintRuleResult]]:
    """
    Evaluates all hard constraints for assigning a specific resource to a specific mission request.
    Returns (is_eligible, list_of_rule_results).
    """
    results: List[ConstraintRuleResult] = []
    is_eligible = True

    req_start = request.start_time if request.start_time.tzinfo else request.start_time.replace(tzinfo=timezone.utc)
    req_end = request.end_time if request.end_time.tzinfo else request.end_time.replace(tzinfo=timezone.utc)

    # 1. Resource Status Check
    if resource.status in [ResourceStatus.UNAVAILABLE, ResourceStatus.MAINTENANCE]:
        results.append(ConstraintRuleResult(
            rule_name="RESOURCE_STATUS_CHECK",
            passed=False,
            reason=f"Resource {resource.name} is currently in {resource.status} state."
        ))
        is_eligible = False
    else:
        results.append(ConstraintRuleResult(
            rule_name="RESOURCE_STATUS_CHECK",
            passed=True,
            reason=f"Resource {resource.name} status is {resource.status}."
        ))

    # 2. Resource Type & Capability Match
    if resource.resource_type != request.required_resource_type:
        results.append(ConstraintRuleResult(
            rule_name="RESOURCE_TYPE_MATCH",
            passed=False,
            reason=f"Required type {request.required_resource_type.value} does not match resource type {resource.resource_type.value}."
        ))
        is_eligible = False
    else:
        results.append(ConstraintRuleResult(
            rule_name="RESOURCE_TYPE_MATCH",
            passed=True,
            reason=f"Resource type {resource.resource_type.value} matches requirement."
        ))

    # Capability check
    req_caps = set(request.required_capabilities or [])
    res_caps = set(resource.capabilities or [])
    missing_caps = req_caps - res_caps
    if missing_caps:
        results.append(ConstraintRuleResult(
            rule_name="CAPABILITY_REQUIREMENTS",
            passed=False,
            reason=f"Resource missing required capabilities: {list(missing_caps)}."
        ))
        is_eligible = False
    else:
        results.append(ConstraintRuleResult(
            rule_name="CAPABILITY_REQUIREMENTS",
            passed=True,
            reason="All required capabilities are satisfied."
        ))

    # 3. Payload & Range Specs
    if resource.payload_capacity_kg < request.payload_weight_kg:
        results.append(ConstraintRuleResult(
            rule_name="PAYLOAD_CAPACITY",
            passed=False,
            reason=f"Request payload {request.payload_weight_kg} kg exceeds resource max capacity {resource.payload_capacity_kg} kg."
        ))
        is_eligible = False
    else:
        results.append(ConstraintRuleResult(
            rule_name="PAYLOAD_CAPACITY",
            passed=True,
            reason=f"Payload {request.payload_weight_kg} kg within max capacity {resource.payload_capacity_kg} kg."
        ))

    if resource.range_km < request.distance_km:
        results.append(ConstraintRuleResult(
            rule_name="OPERATIONAL_RANGE",
            passed=False,
            reason=f"Request distance {request.distance_km} km exceeds maximum range {resource.range_km} km."
        ))
        is_eligible = False
    else:
        results.append(ConstraintRuleResult(
            rule_name="OPERATIONAL_RANGE",
            passed=True,
            reason=f"Distance {request.distance_km} km within operational range {resource.range_km} km."
        ))

    # 4. Maintenance Window Conflict
    maint_records = db.query(MaintenanceRecord).filter(
        MaintenanceRecord.resource_id == resource.id,
        MaintenanceRecord.is_completed == False
    ).all()

    has_maint_conflict = False
    for m in maint_records:
        m_start = m.start_time if m.start_time.tzinfo else m.start_time.replace(tzinfo=timezone.utc)
        m_end = m.end_time if m.end_time.tzinfo else m.end_time.replace(tzinfo=timezone.utc)
        # Check overlap: max(req_start, m_start) < min(req_end, m_end)
        if max(req_start, m_start) < min(req_end, m_end):
            results.append(ConstraintRuleResult(
                rule_name="MAINTENANCE_SCHEDULE_OVERLAP",
                passed=False,
                reason=f"Maintenance window '{m.title}' ({m_start.strftime('%Y-%m-%d %H:%M')} to {m_end.strftime('%H:%M')}) overlaps request window."
            ))
            has_maint_conflict = True
            is_eligible = False
            break
    if not has_maint_conflict:
        results.append(ConstraintRuleResult(
            rule_name="MAINTENANCE_SCHEDULE_OVERLAP",
            passed=True,
            reason="No overlapping maintenance window."
        ))

    # 5. Crew Readiness Check
    crew = db.query(CrewReadiness).filter(CrewReadiness.resource_id == resource.id).first()
    if not crew or crew.crew_status != CrewStatus.READY:
        status_name = crew.crew_status.value if crew else "NO_CREW"
        results.append(ConstraintRuleResult(
            rule_name="CREW_READINESS",
            passed=False,
            reason=f"Assigned crew status is '{status_name}' (requires READY)."
        ))
        is_eligible = False
    elif crew.consecutive_duty_hours > 12.0:
        results.append(ConstraintRuleResult(
            rule_name="CREW_FATIGUE_LIMIT",
            passed=False,
            reason=f"Pilot {crew.pilot_name} duty hours ({crew.consecutive_duty_hours}h) exceed safe max of 12 hours."
        ))
        is_eligible = False
    else:
        results.append(ConstraintRuleResult(
            rule_name="CREW_READINESS",
            passed=True,
            reason=f"Crew {crew.pilot_name} is READY (Duty hours: {crew.consecutive_duty_hours}h)."
        ))

    # 6. Environmental Conditions (Weather at Origin/Destination)
    weather = db.query(EnvironmentalCondition).filter(
        EnvironmentalCondition.location_region.in_([request.origin_location, request.destination_location])
    ).all()
    weather_ok = True
    for w in weather:
        if w.wind_speed_kts > resource.max_wind_resistance_kts:
            results.append(ConstraintRuleResult(
                rule_name="ENVIRONMENTAL_WIND_LIMIT",
                passed=False,
                reason=f"Region {w.location_region} wind speed ({w.wind_speed_kts} kts) exceeds aircraft max limit ({resource.max_wind_resistance_kts} kts)."
            ))
            weather_ok = False
            is_eligible = False
        if w.visibility_km < resource.min_visibility_km:
            results.append(ConstraintRuleResult(
                rule_name="ENVIRONMENTAL_VISIBILITY_LIMIT",
                passed=False,
                reason=f"Region {w.location_region} visibility ({w.visibility_km} km) below aircraft min requirement ({resource.min_visibility_km} km)."
            ))
            weather_ok = False
            is_eligible = False
    if weather_ok:
        results.append(ConstraintRuleResult(
            rule_name="ENVIRONMENTAL_CONDITIONS",
            passed=True,
            reason="Weather conditions at origin & destination are within operating limits."
        ))

    # 7. Airspace Restriction Check
    airspaces = db.query(AirspaceConstraint).filter(AirspaceConstraint.is_active == True).all()
    airspace_ok = True
    for a in airspaces:
        a_start = a.start_time if a.start_time.tzinfo else a.start_time.replace(tzinfo=timezone.utc)
        a_end = a.end_time if a.end_time.tzinfo else a.end_time.replace(tzinfo=timezone.utc)
        # Check if request overlaps active restriction and touches zone
        if max(req_start, a_start) < min(req_end, a_end):
            if a.zone_name in [request.origin_location, request.destination_location] and a.restriction_type == "NO_FLY":
                results.append(ConstraintRuleResult(
                    rule_name="AIRSPACE_RESTRICTION",
                    passed=False,
                    reason=f"Zone {a.zone_name} has active NO-FLY restriction ({a.reason})."
                ))
                airspace_ok = False
                is_eligible = False
                break
    if airspace_ok:
        results.append(ConstraintRuleResult(
            rule_name="AIRSPACE_RESTRICTIONS",
            passed=True,
            reason="No active airspace prohibitions along route."
        ))

    return is_eligible, results
