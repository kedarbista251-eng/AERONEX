from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, ConfigDict
from app.models.models import (
    ResourceType, ResourceStatus, CrewStatus, RequestPriority, RequestStatus,
    RecommendationStatus, AuditAction
)

# Base Schema Config
class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

# Resource Schemas
class ResourceBase(BaseModel):
    id: str
    name: str
    resource_type: ResourceType
    status: ResourceStatus
    location_base: str
    payload_capacity_kg: float
    range_km: float
    max_wind_resistance_kts: float
    min_visibility_km: float
    capabilities: List[str]
    health_score: float
    source: str
    last_updated: datetime

class ResourceResponse(ResourceBase, ORMBase):
    pass

# Crew Readiness Schemas
class CrewReadinessBase(BaseModel):
    id: str
    resource_id: str
    pilot_name: str
    co_pilot_name: Optional[str] = None
    crew_status: CrewStatus
    certifications: List[str]
    consecutive_duty_hours: float
    source: str
    last_updated: datetime

class CrewReadinessResponse(CrewReadinessBase, ORMBase):
    pass

# Maintenance Record Schemas
class MaintenanceRecordBase(BaseModel):
    id: str
    resource_id: str
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    is_completed: bool
    technician_lead: Optional[str] = None
    source: str
    last_updated: datetime

class MaintenanceRecordResponse(MaintenanceRecordBase, ORMBase):
    pass

# Environmental Condition Schemas
class EnvironmentalConditionResponse(ORMBase):
    id: str
    location_region: str
    wind_speed_kts: float
    visibility_km: float
    precipitation: str
    temperature_celsius: float
    hazard_level: str
    source: str
    last_updated: datetime

# Airspace Constraint Schemas
class AirspaceConstraintResponse(ORMBase):
    id: str
    zone_name: str
    restriction_type: str
    min_altitude_ft: float
    max_altitude_ft: float
    start_time: datetime
    end_time: datetime
    is_active: bool
    reason: str
    source: str
    last_updated: datetime

# Mission Request Schemas
class MissionRequestBase(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    required_resource_type: ResourceType
    required_capabilities: List[str]
    origin_location: str
    destination_location: str
    start_time: datetime
    end_time: datetime
    payload_weight_kg: float
    distance_km: float
    priority: RequestPriority
    status: RequestStatus
    source: str
    last_updated: datetime

class MissionRequestResponse(MissionRequestBase, ORMBase):
    pass

# Schedule Assignment Schemas
class ScheduleAssignmentResponse(ORMBase):
    id: str
    recommendation_id: Optional[str] = None
    request_id: str
    resource_id: str
    assigned_start: datetime
    assigned_end: datetime
    confidence_score: float

# Scenario & Recommendation Schemas
class ScenarioCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    request_ids: Optional[List[str]] = None # If null, evaluates all UNASSIGNED/PENDING requests

class ApprovalCreate(BaseModel):
    reviewer_role: str = "Mission Reviewer"
    reviewer_name: str = "Commander Alpha"
    decision: str # "APPROVED" or "REJECTED"
    comments: Optional[str] = ""

class ApprovalResponse(ORMBase):
    id: str
    recommendation_id: str
    reviewer_role: str
    reviewer_name: str
    decision: str
    comments: Optional[str] = None
    timestamp: datetime

class RecommendationResponse(ORMBase):
    id: str
    scenario_id: str
    title: str
    status: RecommendationStatus
    coverage_score: float
    utilization_score: float
    stability_score: float
    total_score: float
    explanation_text: str
    constraint_results: Dict[str, Any]
    excluded_resources: List[Dict[str, Any]]
    created_at: datetime
    assignments: List[ScheduleAssignmentResponse] = []
    approvals: List[ApprovalResponse] = []

class ScenarioResponse(ORMBase):
    id: str
    name: str
    description: Optional[str] = None
    request_ids: List[str]
    created_by: str
    created_at: datetime
    recommendations: List[RecommendationResponse] = []

# Audit Schemas
class AuditEventResponse(ORMBase):
    id: str
    action: AuditAction
    actor_role: str
    actor_name: str
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None
    details: Dict[str, Any]
    comments: Optional[str] = None
    timestamp: datetime

# Dashboard Summary & Data Quality Alert Schemas
class DataAlert(BaseModel):
    id: str
    alert_type: str # STALE_DATA, MISSING_FIELDS, MAINTENANCE_OVERLAP, CREW_UNAVAIL, WEATHER_HAZARD
    severity: str # LOW, MEDIUM, HIGH, CRITICAL
    entity_type: str
    entity_id: str
    message: str
    timestamp: datetime

class DashboardSummary(BaseModel):
    total_resources: int
    available_resources: int
    resources_requiring_review: int
    pending_requests: int
    active_conflicts: int
    data_freshness_percent: float
    stale_records_count: int
    missing_fields_count: int
    recent_events: List[AuditEventResponse]
    resource_type_breakdown: Dict[str, int]
    resource_status_breakdown: Dict[str, int]
    request_status_breakdown: Dict[str, int]
