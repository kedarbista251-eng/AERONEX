"""
Dynamic replanning and predictive readiness for the AeroSync demonstrator.

Non-combat scope: disruptions are generic operational events (weather, airspace
closure, resource/crew loss, priority change). Nothing here models weapons,
targets or threats. Every retasking result is a *proposal* that still needs
human review through the normal recommendation approval flow.
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from app.models.models import (
    Resource, ResourceStatus, CrewReadiness, CrewStatus, MaintenanceRecord,
    EnvironmentalCondition, AirspaceConstraint, MissionRequest, RequestPriority,
    RequestStatus, PlanningScenario, Recommendation, RecommendationStatus,
    ScheduleAssignment, AuditAction,
)
from app.planning.rules_engine import evaluate_hard_constraints_for_pair
from app.planning.scheduler import generate_feasible_scenarios
from app.services.audit import log_audit_event

DISRUPTION_TYPES = [
    "WEATHER_DEGRADATION", "AIRSPACE_CLOSURE", "RESOURCE_UNAVAILABLE",
    "CREW_UNAVAILABLE", "PRIORITY_CHANGE",
]


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def apply_disruption(db: Session, dtype: str, params: Dict[str, Any]) -> str:
    """Mutates the fused operational picture. Returns a human readable summary."""
    now = datetime.now(timezone.utc)
    if dtype == "WEATHER_DEGRADATION":
        region = params["region"]
        wind = float(params.get("wind_speed_kts", 60))
        vis = float(params.get("visibility_km", 0.5))
        wx = db.query(EnvironmentalCondition).filter(EnvironmentalCondition.location_region == region).first()
        if not wx:
            wx = EnvironmentalCondition(id=f"wx-{uuid.uuid4().hex[:6]}", location_region=region)
            db.add(wx)
        wx.wind_speed_kts, wx.visibility_km = wind, vis
        wx.hazard_level = "SEVERE"
        wx.precipitation = "STORM"
        wx.source = "MET_SERVICE_SYS"
        wx.last_updated = now
        summary = f"Weather at {region} degraded: wind {wind} kts, visibility {vis} km."
    elif dtype == "AIRSPACE_CLOSURE":
        zone = params["zone_name"]
        hours = float(params.get("duration_hours", 24))
        db.add(AirspaceConstraint(
            id=f"air-{uuid.uuid4().hex[:6]}", zone_name=zone, restriction_type="NO_FLY",
            start_time=now - timedelta(hours=1), end_time=now + timedelta(hours=hours),
            is_active=True, reason=params.get("reason", "OPERATIONAL_CLOSURE"),
            source="AIRSPACE_MGMT_SYS", last_updated=now,
        ))
        summary = f"Airspace zone {zone} closed (NO_FLY) for {hours:g}h."
    elif dtype == "RESOURCE_UNAVAILABLE":
        res = db.query(Resource).filter(Resource.id == params["resource_id"]).first()
        if not res:
            raise ValueError("Resource not found")
        res.status = ResourceStatus.UNAVAILABLE
        res.last_updated = now
        summary = f"Resource {res.name} ({res.id}) reported UNAVAILABLE."
    elif dtype == "CREW_UNAVAILABLE":
        crew = db.query(CrewReadiness).filter(CrewReadiness.resource_id == params["resource_id"]).first()
        if not crew:
            raise ValueError("Crew record not found")
        crew.crew_status = CrewStatus.UNAVAILABLE
        crew.last_updated = now
        summary = f"Crew of {params['resource_id']} reported UNAVAILABLE."
    elif dtype == "PRIORITY_CHANGE":
        req = db.query(MissionRequest).filter(MissionRequest.id == params["request_id"]).first()
        if not req:
            raise ValueError("Request not found")
        old = req.priority.value
        req.priority = RequestPriority(params["priority"])
        req.last_updated = now
        summary = f"Request {req.id} priority changed {old} -> {req.priority.value}."
    else:
        raise ValueError(f"Unsupported disruption type {dtype}")
    db.commit()
    return summary


def _approved_assignments(db: Session) -> List[ScheduleAssignment]:
    return (
        db.query(ScheduleAssignment)
        .join(Recommendation, ScheduleAssignment.recommendation_id == Recommendation.id)
        .filter(Recommendation.status == RecommendationStatus.APPROVED)
        .all()
    )


def build_retasking(db: Session, trigger: str) -> Dict[str, Any]:
    """
    Re-validates every approved (SCHEDULED) assignment against the updated picture.
    Broken assignments flip to CONFLICTED and a new scenario is generated
    for them, returning a before/after diff for the reviewer.
    """
    broken = []
    for a in _approved_assignments(db):
        req, res = a.request, a.resource
        if not req or not res or req.status != RequestStatus.SCHEDULED:
            continue
        ok, rules = evaluate_hard_constraints_for_pair(res, req, db)
        if not ok:
            broken.append((a, req, res, [r.reason for r in rules if not r.passed]))

    result: Dict[str, Any] = {
        "trigger": trigger, "affected_count": len(broken), "scenario_id": None,
        "recommendation_id": None, "changes": [], "message": "",
    }
    if not broken:
        result["message"] = "No approved assignments are invalidated by this event. Existing plan remains valid."
        return result

    for _, req, _, _ in broken:
        req.status = RequestStatus.CONFLICTED
    db.commit()

    req_ids = [b[1].id for b in broken]
    scenario = PlanningScenario(
        id=f"scen-rt-{uuid.uuid4().hex[:8]}",
        name=f"Dynamic Retasking: {trigger[:60]}",
        description=f"Auto-generated after disruption. {trigger}",
        request_ids=req_ids, created_by="AeroSync Retasking Engine",
        created_at=datetime.now(timezone.utc),
    )
    db.add(scenario)
    db.commit()
    recs = generate_feasible_scenarios(scenario_id=scenario.id, db=db, request_ids=req_ids)
    best = max(recs, key=lambda r: r.total_score) if recs else None
    proposed = {x.request_id: x for x in best.assignments} if best else {}

    for a, req, res, reasons in broken:
        new = proposed.get(req.id)
        result["changes"].append({
            "request_id": req.id, "request_title": req.title, "priority": req.priority.value,
            "previous_resource_id": res.id, "previous_resource_name": res.name,
            "invalidated_because": reasons,
            "proposed_resource_id": new.resource_id if new else None,
            "proposed_resource_name": new.resource.name if new else None,
            "status": "REASSIGNED" if new else "NO_FEASIBLE_RESOURCE",
        })
    result["scenario_id"] = scenario.id
    result["recommendation_id"] = best.id if best else None
    unresolved = sum(1 for c in result["changes"] if c["status"] != "REASSIGNED")
    result["message"] = (
        f"{len(broken)} scheduled mission(s) invalidated; {len(broken) - unresolved} have a proposed "
        f"alternative, {unresolved} need manual escalation. Proposal awaits human review."
    )
    log_audit_event(
        db=db, action=AuditAction.RETASKING_PROPOSED, actor_role="Engine",
        actor_name="AeroSync Retasking Engine", related_entity_type="PlanningScenario",
        related_entity_id=scenario.id,
        details={"affected": req_ids, "unresolved": unresolved}, comments=result["message"],
    )
    return result


def forecast_readiness(db: Session, horizon_hours: int = 24) -> Dict[str, Any]:
    """
    Transparent, explainable readiness forecast (no black box): combines health
    score, upcoming maintenance, crew duty fatigue trajectory and weather headroom.
    """
    now = datetime.now(timezone.utc)
    resources = db.query(Resource).all()
    wx = db.query(EnvironmentalCondition).all()
    worst_wind = max([w.wind_speed_kts for w in wx], default=0.0)
    worst_vis = min([w.visibility_km for w in wx], default=99.0)
    maint = db.query(MaintenanceRecord).filter(MaintenanceRecord.is_completed == False).all()  # noqa: E712
    crews = {c.resource_id: c for c in db.query(CrewReadiness).all()}

    items: List[Dict[str, Any]] = []
    hourly = [0.0] * horizon_hours
    for r in resources:
        drivers: List[str] = []
        score = r.health_score
        if r.health_score < 80:
            drivers.append(f"Health score low ({r.health_score:.0f})")
        windows = [(_aware(m.start_time), _aware(m.end_time)) for m in maint if m.resource_id == r.id]
        crew = crews.get(r.id)
        duty = crew.consecutive_duty_hours if crew else 0.0
        crew_ready = bool(crew and crew.crew_status == CrewStatus.READY)
        if not crew_ready:
            drivers.append("Crew not READY")
        if worst_wind > r.max_wind_resistance_kts * 0.85:
            score -= 15
            drivers.append(f"Wind {worst_wind:.0f} kts near limit {r.max_wind_resistance_kts:.0f}")
        if worst_vis < r.min_visibility_km * 1.5:
            score -= 10
            drivers.append(f"Visibility {worst_vis:.1f} km near minimum")
        usable = 0
        for h in range(horizon_hours):
            t = now + timedelta(hours=h)
            up = r.status in (ResourceStatus.AVAILABLE, ResourceStatus.DEGRADED) and crew_ready
            if any(s <= t < e for s, e in windows):
                up = False
            if duty + h > 12:  # fatigue cap grows if crew stays on duty
                up = False
            if up:
                usable += 1
                hourly[h] += 1
        if usable < horizon_hours and windows:
            drivers.append("Maintenance window within horizon")
        if duty > 9:
            drivers.append(f"Crew duty hours {duty:.1f}h approaching 12h cap")
        coverage = usable / horizon_hours * 100
        readiness = round(max(0.0, min(100.0, 0.5 * score + 0.5 * coverage)), 1)
        level = "LOW" if readiness >= 75 else "MODERATE" if readiness >= 50 else "HIGH"
        items.append({
            "resource_id": r.id, "name": r.name, "resource_type": r.resource_type.value,
            "forecast_readiness": readiness, "usable_hours": usable, "risk_level": level,
            "drivers": drivers or ["No risk drivers identified"],
        })
    items.sort(key=lambda i: i["forecast_readiness"])

    demand = [0] * horizon_hours
    for q in db.query(MissionRequest).filter(
        MissionRequest.status.notin_([RequestStatus.COMPLETED, RequestStatus.CANCELLED])
    ).all():
        s, e = _aware(q.start_time), _aware(q.end_time)
        for h in range(horizon_hours):
            t = now + timedelta(hours=h)
            if s <= t < e:
                demand[h] += 1
    series = [
        {"hour": h, "label": (now + timedelta(hours=h)).strftime("%H:00"),
         "available": int(hourly[h]), "demand": demand[h], "shortfall": demand[h] > hourly[h]}
        for h in range(horizon_hours)
    ]
    return {
        "generated_at": now.isoformat(), "horizon_hours": horizon_hours,
        "resources": items, "fleet_series": series,
        "shortfall_hours": sum(1 for s in series if s["shortfall"]),
    }
