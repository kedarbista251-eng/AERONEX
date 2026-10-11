from datetime import datetime, timezone
import enum
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Enum, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

# Enums
class ResourceType(str, enum.Enum):
    CARGO_TRANSPORT = "CARGO_TRANSPORT"
    RESCUE_HELICOPTER = "RESCUE_HELICOPTER"
    RECON_UAV = "RECON_UAV"
    PATROL_AIRCRAFT = "PATROL_AIRCRAFT"
    MEDEVAC = "MEDEVAC"

class ResourceStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    MAINTENANCE = "MAINTENANCE"
    DEGRADED = "DEGRADED"
    UNAVAILABLE = "UNAVAILABLE"

class CrewStatus(str, enum.Enum):
    READY = "READY"
    RESTING = "RESTING"
    UNQUALIFIED = "UNQUALIFIED"
    UNAVAILABLE = "UNAVAILABLE"

class RequestPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class RequestStatus(str, enum.Enum):
    UNASSIGNED = "UNASSIGNED"
    PENDING_REVIEW = "PENDING_REVIEW"
    SCHEDULED = "SCHEDULED"
    CONFLICTED = "CONFLICTED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class RecommendationStatus(str, enum.Enum):
    PENDING_REVIEW = "PENDING_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class AuditAction(str, enum.Enum):
    DATA_IMPORT = "DATA_IMPORT"
    SCENARIO_EVALUATION = "SCENARIO_EVALUATION"
    RECOMMENDATION_APPROVED = "RECOMMENDATION_APPROVED"
    RECOMMENDATION_REJECTED = "RECOMMENDATION_REJECTED"
    DATA_QUALITY_ALERT = "DATA_QUALITY_ALERT"
    SCENARIO_RESET = "SCENARIO_RESET"
    DISRUPTION_INJECTED = "DISRUPTION_INJECTED"
    RETASKING_PROPOSED = "RETASKING_PROPOSED"

# Models
class Resource(Base):
    __tablename__ = "resources"

    id = Column(String, primary_key=True, index=True) # e.g. RES-C130-01
    name = Column(String, nullable=False)
    resource_type = Column(Enum(ResourceType), nullable=False, index=True)
    status = Column(Enum(ResourceStatus), nullable=False, default=ResourceStatus.AVAILABLE)
    location_base = Column(String, nullable=False)
    payload_capacity_kg = Column(Float, nullable=False, default=5000.0)
    range_km = Column(Float, nullable=False, default=2000.0)
    max_wind_resistance_kts = Column(Float, nullable=False, default=45.0)
    min_visibility_km = Column(Float, nullable=False, default=1.5)
    capabilities = Column(JSON, nullable=False, default=list) # e.g. ["NIGHT_FLIGHT", "HEAVY_LIFT", "MEDICAL_ICU"]
    health_score = Column(Float, nullable=False, default=100.0)
    
    source = Column(String, nullable=False, default="FLEET_MANAGEMENT_SYS")
    last_updated = Column(DateTime, nullable=False, default=utc_now)
    created_at = Column(DateTime, nullable=False, default=utc_now)

    crew_records = relationship("CrewReadiness", back_populates="resource", cascade="all, delete-orphan")
    maintenance_records = relationship("MaintenanceRecord", back_populates="resource", cascade="all, delete-orphan")
    schedule_assignments = relationship("ScheduleAssignment", back_populates="resource")


class CrewReadiness(Base):
    __tablename__ = "crew_readiness"

    id = Column(String, primary_key=True, index=True)
    resource_id = Column(String, ForeignKey("resources.id"), nullable=False, index=True)
    pilot_name = Column(String, nullable=False)
    co_pilot_name = Column(String, nullable=True)
    crew_status = Column(Enum(CrewStatus), nullable=False, default=CrewStatus.READY)
    certifications = Column(JSON, nullable=False, default=list)
    last_rest_start = Column(DateTime, nullable=True)
    last_rest_end = Column(DateTime, nullable=True)
    consecutive_duty_hours = Column(Float, nullable=False, default=0.0)
    
    source = Column(String, nullable=False, default="CREW_ROSTER_SYS")
    last_updated = Column(DateTime, nullable=False, default=utc_now)

    resource = relationship("Resource", back_populates="crew_records")


class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    id = Column(String, primary_key=True, index=True)
    resource_id = Column(String, ForeignKey("resources.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False, index=True)
    is_completed = Column(Boolean, nullable=False, default=False)
    technician_lead = Column(String, nullable=True)
    
    source = Column(String, nullable=False, default="MAINT_LOGISTICS_SYS")
    last_updated = Column(DateTime, nullable=False, default=utc_now)

    resource = relationship("Resource", back_populates="maintenance_records")


class EnvironmentalCondition(Base):
    __tablename__ = "environmental_conditions"

    id = Column(String, primary_key=True, index=True)
    location_region = Column(String, nullable=False, index=True)
    wind_speed_kts = Column(Float, nullable=False, default=15.0)
    visibility_km = Column(Float, nullable=False, default=10.0)
    precipitation = Column(String, nullable=False, default="NONE") # NONE, RAIN, SNOW, FOG, STORM
    temperature_celsius = Column(Float, nullable=False, default=20.0)
    hazard_level = Column(String, nullable=False, default="LOW") # LOW, MODERATE, SEVERE
    
    source = Column(String, nullable=False, default="MET_SERVICE_SYS")
    recorded_at = Column(DateTime, nullable=False, default=utc_now)
    last_updated = Column(DateTime, nullable=False, default=utc_now)


class AirspaceConstraint(Base):
    __tablename__ = "airspace_constraints"

    id = Column(String, primary_key=True, index=True)
    zone_name = Column(String, nullable=False, index=True)
    restriction_type = Column(String, nullable=False, default="NO_FLY") # NO_FLY, ALTITUDE_RESTRICTED, HAZARD
    min_altitude_ft = Column(Float, nullable=False, default=0.0)
    max_altitude_ft = Column(Float, nullable=False, default=50000.0)
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False, index=True)
    is_active = Column(Boolean, nullable=False, default=True)
    reason = Column(String, nullable=False, default="WEATHER_HAZARD")
    
    source = Column(String, nullable=False, default="AIRSPACE_MGMT_SYS")
    last_updated = Column(DateTime, nullable=False, default=utc_now)


class MissionRequest(Base):
    __tablename__ = "mission_requests"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    required_resource_type = Column(Enum(ResourceType), nullable=False)
    required_capabilities = Column(JSON, nullable=False, default=list)
    origin_location = Column(String, nullable=False)
    destination_location = Column(String, nullable=False)
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False, index=True)
    payload_weight_kg = Column(Float, nullable=False, default=0.0)
    distance_km = Column(Float, nullable=False, default=500.0)
    priority = Column(Enum(RequestPriority), nullable=False, default=RequestPriority.MEDIUM)
    status = Column(Enum(RequestStatus), nullable=False, default=RequestStatus.UNASSIGNED)
    
    source = Column(String, nullable=False, default="OPS_PLANNING_SYS")
    created_at = Column(DateTime, nullable=False, default=utc_now)
    last_updated = Column(DateTime, nullable=False, default=utc_now)

    assignments = relationship("ScheduleAssignment", back_populates="request")


class PlanningScenario(Base):
    __tablename__ = "planning_scenarios"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    request_ids = Column(JSON, nullable=False, default=list) # List of mission request IDs evaluated
    created_by = Column(String, nullable=False, default="Planner User")
    created_at = Column(DateTime, nullable=False, default=utc_now)

    recommendations = relationship("Recommendation", back_populates="scenario", cascade="all, delete-orphan")


class ScheduleAssignment(Base):
    __tablename__ = "schedule_assignments"

    id = Column(String, primary_key=True, index=True)
    recommendation_id = Column(String, ForeignKey("recommendations.id"), nullable=True)
    request_id = Column(String, ForeignKey("mission_requests.id"), nullable=False, index=True)
    resource_id = Column(String, ForeignKey("resources.id"), nullable=False, index=True)
    assigned_start = Column(DateTime, nullable=False)
    assigned_end = Column(DateTime, nullable=False)
    confidence_score = Column(Float, nullable=False, default=0.95)
    
    created_at = Column(DateTime, nullable=False, default=utc_now)

    request = relationship("MissionRequest", back_populates="assignments")
    resource = relationship("Resource", back_populates="schedule_assignments")
    recommendation = relationship("Recommendation", back_populates="assignments")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(String, primary_key=True, index=True)
    scenario_id = Column(String, ForeignKey("planning_scenarios.id"), nullable=False, index=True)
    title = Column(String, nullable=False) # e.g. "Option A (Optimal Coverage)"
    status = Column(Enum(RecommendationStatus), nullable=False, default=RecommendationStatus.PENDING_REVIEW)
    coverage_score = Column(Float, nullable=False, default=0.0) # 0.0 - 100.0
    utilization_score = Column(Float, nullable=False, default=0.0)
    stability_score = Column(Float, nullable=False, default=0.0)
    total_score = Column(Float, nullable=False, default=0.0)
    
    explanation_text = Column(Text, nullable=False)
    constraint_results = Column(JSON, nullable=False, default=dict) # Details of passed/failed constraints
    excluded_resources = Column(JSON, nullable=False, default=list) # [{resource_id, reason}]
    
    created_at = Column(DateTime, nullable=False, default=utc_now)

    scenario = relationship("PlanningScenario", back_populates="recommendations")
    assignments = relationship("ScheduleAssignment", back_populates="recommendation", cascade="all, delete-orphan")
    approvals = relationship("Approval", back_populates="recommendation", cascade="all, delete-orphan")


class Approval(Base):
    __tablename__ = "approvals"

    id = Column(String, primary_key=True, index=True)
    recommendation_id = Column(String, ForeignKey("recommendations.id"), nullable=False, index=True)
    reviewer_role = Column(String, nullable=False, default="Mission Reviewer") # "Planner" or "Reviewer"
    reviewer_name = Column(String, nullable=False, default="Commander Alpha")
    decision = Column(String, nullable=False) # "APPROVED" or "REJECTED"
    comments = Column(Text, nullable=True)
    timestamp = Column(DateTime, nullable=False, default=utc_now)

    recommendation = relationship("Recommendation", back_populates="approvals")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String, primary_key=True, index=True)
    action = Column(Enum(AuditAction), nullable=False)
    actor_role = Column(String, nullable=False, default="System")
    actor_name = Column(String, nullable=False, default="AeroSync Engine")
    related_entity_type = Column(String, nullable=True) # e.g. "Recommendation", "Resource"
    related_entity_id = Column(String, nullable=True)
    details = Column(JSON, nullable=False, default=dict)
    comments = Column(Text, nullable=True)
    timestamp = Column(DateTime, nullable=False, default=utc_now)
