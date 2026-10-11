export type ResourceType = 'CARGO_TRANSPORT' | 'RESCUE_HELICOPTER' | 'RECON_UAV' | 'PATROL_AIRCRAFT' | 'MEDEVAC';
export type ResourceStatus = 'AVAILABLE' | 'MAINTENANCE' | 'DEGRADED' | 'UNAVAILABLE';
export type CrewStatus = 'READY' | 'RESTING' | 'UNQUALIFIED' | 'UNAVAILABLE';
export type RequestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RequestStatus = 'UNASSIGNED' | 'PENDING_REVIEW' | 'SCHEDULED' | 'CONFLICTED' | 'COMPLETED' | 'CANCELLED';
export type RecommendationStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
export type AuditAction = 'DATA_IMPORT' | 'SCENARIO_EVALUATION' | 'RECOMMENDATION_APPROVED' | 'RECOMMENDATION_REJECTED' | 'DATA_QUALITY_ALERT' | 'SCENARIO_RESET';

export interface Resource {
  id: string;
  name: string;
  resource_type: ResourceType;
  status: ResourceStatus;
  location_base: string;
  payload_capacity_kg: number;
  range_km: number;
  max_wind_resistance_kts: number;
  min_visibility_km: number;
  capabilities: string[];
  health_score: number;
  source: string;
  last_updated: string;
}

export interface MissionRequest {
  id: string;
  title: string;
  description?: string;
  required_resource_type: ResourceType;
  required_capabilities: string[];
  origin_location: string;
  destination_location: string;
  start_time: string;
  end_time: string;
  payload_weight_kg: number;
  distance_km: number;
  priority: RequestPriority;
  status: RequestStatus;
  source: string;
  last_updated: string;
}

export interface ScheduleAssignment {
  id: string;
  recommendation_id?: string;
  request_id: string;
  resource_id: string;
  assigned_start: string;
  assigned_end: string;
  confidence_score: number;
}

export interface Approval {
  id: string;
  recommendation_id: string;
  reviewer_role: string;
  reviewer_name: string;
  decision: string;
  comments?: string;
  timestamp: string;
}

export interface Recommendation {
  id: string;
  scenario_id: string;
  title: string;
  status: RecommendationStatus;
  coverage_score: number;
  utilization_score: number;
  stability_score: number;
  total_score: number;
  explanation_text: string;
  constraint_results: Record<string, any>;
  excluded_resources: Array<{
    request_id: string;
    request_title: string;
    resource_id: string;
    resource_name: string;
    reason: string;
    failed_rules: string[];
  }>;
  created_at: string;
  assignments: ScheduleAssignment[];
  approvals: Approval[];
}

export interface PlanningScenario {
  id: string;
  name: string;
  description?: string;
  request_ids: string[];
  created_by: string;
  created_at: string;
  recommendations: Recommendation[];
}

export interface AuditEvent {
  id: string;
  action: AuditAction;
  actor_role: string;
  actor_name: string;
  related_entity_type?: string;
  related_entity_id?: string;
  details: Record<string, any>;
  comments?: string;
  timestamp: string;
}

export interface DataAlert {
  id: string;
  alert_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  entity_type: string;
  entity_id: string;
  message: string;
  timestamp: string;
}

export interface DashboardSummary {
  total_resources: number;
  available_resources: number;
  resources_requiring_review: number;
  pending_requests: number;
  active_conflicts: number;
  data_freshness_percent: number;
  stale_records_count: number;
  missing_fields_count: number;
  recent_events: AuditEvent[];
  resource_type_breakdown: Record<string, number>;
  resource_status_breakdown: Record<string, number>;
  request_status_breakdown: Record<string, number>;
}
