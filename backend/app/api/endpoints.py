from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.models import (
    Resource, MissionRequest, PlanningScenario, Recommendation,
    Approval, AuditEvent, AuditAction, RecommendationStatus, RequestStatus,
    EnvironmentalCondition, AirspaceConstraint
)
from app.schemas.schemas import (
    DashboardSummary, ResourceResponse, MissionRequestResponse,
    ScenarioResponse, ScenarioCreate, RecommendationResponse,
    ApprovalCreate, ApprovalResponse, AuditEventResponse, DataAlert,
    EnvironmentalConditionResponse, AirspaceConstraintResponse
)
from app.services.data_quality import detect_data_quality_alerts
from app.services.audit import log_audit_event
from app.services.seed import seed_database
from app.planning.scheduler import generate_feasible_scenarios

router = APIRouter()

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@router.get("/dashboard/summary", response_model=DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db)):
    resources = db.query(Resource).all()
    requests = db.query(MissionRequest).all()
    alerts = detect_data_quality_alerts(db)
    
    total_res = len(resources)
    avail_res = sum(1 for r in resources if r.status.value == "AVAILABLE")
    stale_count = sum(1 for a in alerts if a.alert_type == "STALE_DATA")
    missing_count = sum(1 for a in alerts if a.alert_type == "MISSING_FIELDS")
    conflict_count = sum(1 for a in alerts if a.severity in ["HIGH", "CRITICAL"])
    review_needed = sum(1 for a in alerts if a.severity == "CRITICAL")
    pending_reqs = sum(1 for r in requests if r.status.value in ["UNASSIGNED", "PENDING_REVIEW", "CONFLICTED"])

    freshness_percent = round(max(0.0, 100.0 - ((stale_count / max(total_res, 1)) * 100.0)), 1)

    type_breakdown = {}
    for r in resources:
        t_name = r.resource_type.value
        type_breakdown[t_name] = type_breakdown.get(t_name, 0) + 1

    status_breakdown = {}
    for r in resources:
        s_name = r.status.value
        status_breakdown[s_name] = status_breakdown.get(s_name, 0) + 1

    req_breakdown = {}
    for r in requests:
        st = r.status.value
        req_breakdown[st] = req_breakdown.get(st, 0) + 1

    recent_events = db.query(AuditEvent).order_by(AuditEvent.timestamp.desc()).limit(10).all()

    return DashboardSummary(
        total_resources=total_res,
        available_resources=avail_res,
        resources_requiring_review=review_needed,
        pending_requests=pending_reqs,
        active_conflicts=conflict_count,
        data_freshness_percent=freshness_percent,
        stale_records_count=stale_count,
        missing_fields_count=missing_count,
        recent_events=recent_events,
        resource_type_breakdown=type_breakdown,
        resource_status_breakdown=status_breakdown,
        request_status_breakdown=req_breakdown
    )

@router.get("/resources", response_model=List[ResourceResponse])
def list_resources(
    status_filter: Optional[str] = Query(None, alias="status"),
    type_filter: Optional[str] = Query(None, alias="type"),
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Resource)
    if status_filter:
        query = query.filter(Resource.status == status_filter)
    if type_filter:
        query = query.filter(Resource.resource_type == type_filter)
    if search:
        query = query.filter(Resource.name.ilike(f"%{search}%") | Resource.id.ilike(f"%{search}%") | Resource.location_base.ilike(f"%{search}%"))
    return query.all()

@router.get("/requests", response_model=List[MissionRequestResponse])
def list_requests(
    status_filter: Optional[str] = Query(None, alias="status"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    db: Session = Depends(get_db)
):
    query = db.query(MissionRequest)
    if status_filter:
        query = query.filter(MissionRequest.status == status_filter)
    if priority_filter:
        query = query.filter(MissionRequest.priority == priority_filter)
    return query.order_by(MissionRequest.created_at.desc()).all()

@router.get("/alerts", response_model=List[DataAlert])
def list_alerts(db: Session = Depends(get_db)):
    return detect_data_quality_alerts(db)

@router.get("/audit", response_model=List[AuditEventResponse])
def list_audit_events(
    limit: int = 50,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(AuditEvent)
    if search:
        query = query.filter(AuditEvent.actor_name.ilike(f"%{search}%") | AuditEvent.comments.ilike(f"%{search}%") | AuditEvent.related_entity_id.ilike(f"%{search}%"))
    return query.order_by(AuditEvent.timestamp.desc()).limit(limit).all()

@router.post("/data/import")
def import_data(db: Session = Depends(get_db)):
    seed_database(db, force_reset=False)
    log_audit_event(
        db=db,
        action=AuditAction.DATA_IMPORT,
        actor_role="Planner User",
        actor_name="Data Sync Agent",
        details={"source": "EXTERNAL_OPS_FEED"},
        comments="Manual sync of operational telemetry feeds completed."
    )
    return {"message": "Data imported and refreshed successfully."}

@router.post("/scenarios", response_model=ScenarioResponse)
def create_scenario(payload: ScenarioCreate, db: Session = Depends(get_db)):
    req_ids = payload.request_ids
    if not req_ids:
        unassigned = db.query(MissionRequest).filter(MissionRequest.status.in_([RequestStatus.UNASSIGNED, RequestStatus.PENDING_REVIEW])).all()
        req_ids = [r.id for r in unassigned]

    scenario_id = f"scen-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    scenario = PlanningScenario(
        id=scenario_id,
        name=payload.name,
        description=payload.description,
        request_ids=req_ids,
        created_by="Mission Planner Alpha",
        created_at=datetime.now(timezone.utc)
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)

    log_audit_event(
        db=db,
        action=AuditAction.SCENARIO_EVALUATION,
        actor_role="Planner",
        actor_name="Mission Planner Alpha",
        related_entity_type="PlanningScenario",
        related_entity_id=scenario.id,
        details={"request_count": len(req_ids)},
        comments=f"Planning scenario '{scenario.name}' created with {len(req_ids)} candidate requests."
    )

    return scenario

@router.get("/scenarios", response_model=List[ScenarioResponse])
def list_scenarios(db: Session = Depends(get_db)):
    return db.query(PlanningScenario).order_by(PlanningScenario.created_at.desc()).all()

@router.get("/scenarios/{scenario_id}", response_model=ScenarioResponse)
def get_scenario(scenario_id: str, db: Session = Depends(get_db)):
    scenario = db.query(PlanningScenario).filter(PlanningScenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario

@router.post("/scenarios/{scenario_id}/evaluate", response_model=List[RecommendationResponse])
def evaluate_scenario(scenario_id: str, db: Session = Depends(get_db)):
    scenario = db.query(PlanningScenario).filter(PlanningScenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    recs = generate_feasible_scenarios(scenario_id=scenario.id, db=db, request_ids=scenario.request_ids)

    log_audit_event(
        db=db,
        action=AuditAction.SCENARIO_EVALUATION,
        actor_role="Engine",
        actor_name="AeroSync Deterministic Rules Engine",
        related_entity_type="PlanningScenario",
        related_entity_id=scenario.id,
        details={"recommendations_generated": len(recs)},
        comments=f"Evaluated scenario '{scenario.name}' against 100% hard constraints. Generated {len(recs)} recommendation alternatives."
    )

    return recs

@router.get("/scenarios/{scenario_id}/recommendations", response_model=List[RecommendationResponse])
def get_scenario_recommendations(scenario_id: str, db: Session = Depends(get_db)):
    recs = db.query(Recommendation).filter(Recommendation.scenario_id == scenario_id).all()
    return recs

@router.post("/recommendations/{recommendation_id}/review", response_model=ApprovalResponse)
def review_recommendation(
    recommendation_id: str,
    payload: ApprovalCreate,
    db: Session = Depends(get_db)
):
    rec = db.query(Recommendation).filter(Recommendation.id == recommendation_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    decision_upper = payload.decision.upper()
    if decision_upper not in ["APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Decision must be APPROVED or REJECTED")

    approval_id = f"appr-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    approval = Approval(
        id=approval_id,
        recommendation_id=rec.id,
        reviewer_role=payload.reviewer_role,
        reviewer_name=payload.reviewer_name,
        decision=decision_upper,
        comments=payload.comments,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(approval)

    # Update recommendation status
    rec.status = RecommendationStatus.APPROVED if decision_upper == "APPROVED" else RecommendationStatus.REJECTED

    if decision_upper == "APPROVED":
        # Apply schedule assignments to Requests
        for assign in rec.assignments:
            req = db.query(MissionRequest).filter(MissionRequest.id == assign.request_id).first()
            if req:
                req.status = RequestStatus.SCHEDULED

        log_action = AuditAction.RECOMMENDATION_APPROVED
    else:
        log_action = AuditAction.RECOMMENDATION_REJECTED

    db.commit()
    db.refresh(approval)

    log_audit_event(
        db=db,
        action=log_action,
        actor_role=payload.reviewer_role,
        actor_name=payload.reviewer_name,
        related_entity_type="Recommendation",
        related_entity_id=rec.id,
        details={"decision": decision_upper, "option_title": rec.title},
        comments=payload.comments or f"Recommendation {rec.title} was {decision_upper.lower()}."
    )

    return approval

@router.post("/reset")
def reset_demo(db: Session = Depends(get_db)):
    seed_database(db, force_reset=True)
    log_audit_event(
        db=db,
        action=AuditAction.SCENARIO_RESET,
        actor_role="System",
        actor_name="Demo Controller",
        details={},
        comments="Demonstration scenario and synthetic database reset to initial state."
    )
    return {"message": "Demonstration scenario successfully reset to baseline state."}


# =========================================================================
# TACTICAL AIR OPERATIONS & DYNAMIC RETASKING ENDPOINTS (SIH26250)
# =========================================================================
from app.services.tactical_sim import (
    get_live_tactical_cop,
    inject_tactical_crisis,
    commit_tactical_retasking,
    get_multi_source_fusion_status,
    generate_ato_briefing,
    THREAT_ZONES
)

@router.get("/tactical/cop")
def get_tactical_cop(sim_time: float = Query(0.0, description="Simulation time in hours (0.0 to 4.0)")):
    """Returns real-time 4D Common Operational Picture (COP) with aircraft, airbases, and threat zones."""
    return get_live_tactical_cop(sim_time_hours=sim_time)

@router.get("/tactical/threats")
def list_threat_zones():
    """Lists all active and standby contested threat envelopes."""
    return THREAT_ZONES

@router.post("/tactical/threats/{threat_id}/toggle")
def toggle_threat_zone(threat_id: str, db: Session = Depends(get_db)):
    """Toggles active state of a threat envelope (SAM, radar, jamming)."""
    target = next((t for t in THREAT_ZONES if t["id"] == threat_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Threat zone not found")
    target["is_active"] = not target["is_active"]
    
    log_audit_event(
        db=db,
        action=AuditAction.DISRUPTION_INJECTED,
        actor_role="Tactical Officer",
        actor_name="Threat Injection Panel",
        related_entity_type="ThreatZone",
        related_entity_id=threat_id,
        details={"threat_name": target["name"], "is_active": target["is_active"]},
        comments=f"Threat zone '{target['name']}' state toggled to {target['is_active']}."
    )
    return target

@router.post("/tactical/inject-crisis")
def inject_crisis(crisis_type: str = Query("SAM_RADAR_ACTIVATED"), db: Session = Depends(get_db)):
    """Triggers in-flight disruption and produces immediate AI Retasking recommendation."""
    plan = inject_tactical_crisis(crisis_type=crisis_type)
    
    log_audit_event(
        db=db,
        action=AuditAction.DISRUPTION_INJECTED,
        actor_role="Tactical Simulator",
        actor_name="Chaos Disruption Engine",
        related_entity_type="FlightRetasking",
        related_entity_id=plan.get("incident_id"),
        details={"crisis_type": crisis_type, "urgency": plan.get("urgency")},
        comments=f"Tactical crisis injected: {plan.get('crisis_summary')}"
    )
    return plan

@router.post("/tactical/retask/commit")
def commit_retask(approved: bool = Query(True), reviewer: str = Query("Commander Alpha"), db: Session = Depends(get_db)):
    """Applies dynamic retasking plan to flight telemetry with commander approval."""
    result = commit_tactical_retasking(approved=approved, reviewer=reviewer)
    
    log_audit_event(
        db=db,
        action=AuditAction.RETASKING_PROPOSED if not approved else AuditAction.RECOMMENDATION_APPROVED,
        actor_role="Commander",
        actor_name=reviewer,
        related_entity_type="FlightRetasking",
        details=result,
        comments=result.get("message", "Retasking decision recorded.")
    )
    return result

@router.get("/tactical/fusion")
def get_sensor_fusion():
    """Returns multi-source data fusion feed statuses and detected inconsistencies."""
    return get_multi_source_fusion_status()

@router.get("/tactical/ato/{mission_id}")
def get_mission_ato(mission_id: str):
    """Generates military-grade Air Tasking Order (ATO) Briefing Sheet."""
    return generate_ato_briefing(mission_id=mission_id)

