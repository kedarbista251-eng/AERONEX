from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from app.models.models import (
    Resource, CrewReadiness, MaintenanceRecord, EnvironmentalCondition,
    AirspaceConstraint, MissionRequest, ResourceStatus, CrewStatus
)
from app.schemas.schemas import DataAlert
from app.core.config import settings

def detect_data_quality_alerts(db: Session) -> List[DataAlert]:
    alerts: List[DataAlert] = []
    now = datetime.now(timezone.utc)
    stale_cutoff = now - timedelta(hours=settings.STALE_DATA_THRESHOLD_HOURS)

    # 1. Stale Resources
    resources = db.query(Resource).all()
    for r in resources:
        if r.last_updated:
            last_upd = r.last_updated if r.last_updated.tzinfo else r.last_updated.replace(tzinfo=timezone.utc)
            if last_upd < stale_cutoff:
                alerts.append(DataAlert(
                    id=f"alert-stale-res-{r.id}",
                    alert_type="STALE_DATA",
                    severity="MEDIUM",
                    entity_type="Resource",
                    entity_id=r.id,
                    message=f"Resource {r.name} ({r.id}) telemetry hasn't updated in > {settings.STALE_DATA_THRESHOLD_HOURS} hours (Last updated: {r.last_updated.strftime('%Y-%m-%d %H:%M UTC')}).",
                    timestamp=now
                ))

        # Check for missing crucial fields
        if not r.location_base or r.payload_capacity_kg <= 0 or r.range_km <= 0:
            alerts.append(DataAlert(
                id=f"alert-missing-res-{r.id}",
                alert_type="MISSING_FIELDS",
                severity="HIGH",
                entity_type="Resource",
                entity_id=r.id,
                message=f"Resource {r.name} ({r.id}) has incomplete specs: location base or payload/range capacity missing.",
                timestamp=now
            ))

    # 2. Maintenance Overlaps with AVAILABLE status
    maint_records = db.query(MaintenanceRecord).filter(MaintenanceRecord.is_completed == False).all()
    for m in maint_records:
        r = db.query(Resource).filter(Resource.id == m.resource_id).first()
        if r:
            start_t = m.start_time if m.start_time.tzinfo else m.start_time.replace(tzinfo=timezone.utc)
            end_t = m.end_time if m.end_time.tzinfo else m.end_time.replace(tzinfo=timezone.utc)
            if start_t <= now <= end_t and r.status == ResourceStatus.AVAILABLE:
                alerts.append(DataAlert(
                    id=f"alert-maint-conflict-{m.id}",
                    alert_type="MAINTENANCE_OVERLAP",
                    severity="CRITICAL",
                    entity_type="MaintenanceRecord",
                    entity_id=m.id,
                    message=f"Conflicting Record: Resource {r.name} ({r.id}) is marked AVAILABLE during active maintenance window '{m.title}' ({start_t.strftime('%H:%M')} - {end_t.strftime('%H:%M')}).",
                    timestamp=now
                ))

    # 3. Crew Readiness Conflicts & Excessive Duty Hours
    crew_records = db.query(CrewReadiness).all()
    for c in crew_records:
        if c.consecutive_duty_hours > 12.0:
            alerts.append(DataAlert(
                id=f"alert-crew-duty-{c.id}",
                alert_type="CREW_UNAVAIL",
                severity="HIGH",
                entity_type="CrewReadiness",
                entity_id=c.id,
                message=f"Crew fatigue warning: Pilot {c.pilot_name} assigned to {c.resource_id} has accumulated {c.consecutive_duty_hours} consecutive duty hours (> 12h limit).",
                timestamp=now
            ))
        if c.last_updated:
            last_upd = c.last_updated if c.last_updated.tzinfo else c.last_updated.replace(tzinfo=timezone.utc)
            if last_upd < stale_cutoff:
                alerts.append(DataAlert(
                    id=f"alert-stale-crew-{c.id}",
                    alert_type="STALE_DATA",
                    severity="LOW",
                    entity_type="CrewReadiness",
                    entity_id=c.id,
                    message=f"Crew record for {c.pilot_name} ({c.id}) has not been updated in over {settings.STALE_DATA_THRESHOLD_HOURS} hours.",
                    timestamp=now
                ))

    # 4. Severe Environmental & Weather Warnings
    weathers = db.query(EnvironmentalCondition).filter(EnvironmentalCondition.hazard_level.in_(["MODERATE", "SEVERE"])).all()
    for w in weathers:
        alerts.append(DataAlert(
            id=f"alert-weather-{w.id}",
            alert_type="WEATHER_HAZARD",
            severity="HIGH" if w.hazard_level == "SEVERE" else "MEDIUM",
            entity_type="EnvironmentalCondition",
            entity_id=w.id,
            message=f"Adverse weather in region {w.location_region}: Wind {w.wind_speed_kts} kts, Visibility {w.visibility_km} km, Precip: {w.precipitation}.",
            timestamp=now
        ))

    # 5. Airspace Restrictions
    airspaces = db.query(AirspaceConstraint).filter(AirspaceConstraint.is_active == True).all()
    for a in airspaces:
        start_t = a.start_time if a.start_time.tzinfo else a.start_time.replace(tzinfo=timezone.utc)
        end_t = a.end_time if a.end_time.tzinfo else a.end_time.replace(tzinfo=timezone.utc)
        if start_t <= now <= end_t:
            alerts.append(DataAlert(
                id=f"alert-airspace-{a.id}",
                alert_type="AIRSPACE_RESTRICTION",
                severity="HIGH",
                entity_type="AirspaceConstraint",
                entity_id=a.id,
                message=f"Active Airspace restriction in zone '{a.zone_name}' ({a.restriction_type}) due to: {a.reason}.",
                timestamp=now
            ))

    return alerts
