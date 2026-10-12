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

// Tactical Air Operations & Dynamic Retasking Types (SIH26250)
export interface Airbase {
  id: string;
  name: string;
  lat: number;
  lng: number;
  elevation_ft: number;
  runways: string[];
  readiness: string;
  fuel_reserve_kL: number;
  available_hangars: number;
}

export interface ThreatZone {
  id: string;
  name: string;
  type: 'SAM_SYSTEM' | 'RADAR_DOME' | 'EW_JAMMING' | 'WEATHER_STORM';
  lat: number;
  lng: number;
  radius_km: number;
  lethal_radius_km: number;
  lethality_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  min_alt_ft: number;
  max_alt_ft: number;
  is_active: boolean;
  radar_freq_ghz?: string;
  detected_via?: string;
  notes?: string;
}

export interface Waypoint {
  name: string;
  lat: number;
  lng: number;
  alt_ft: number;
}

export interface WeaponStore {
  station: string;
  store: string;
  qty: number;
  weight_kg: number;
}

export interface AircraftTelemetry {
  id: string;
  callsign: string;
  name: string;
  type: ResourceType;
  status: string;
  origin_base: string;
  destination_base: string;
  altitude_ft: number;
  speed_kts: number;
  heading_deg: number;
  fuel_pct: number;
  fuel_burn_rate_kgh: number;
  combat_radius_km: number;
  mission_id: string;
  pilot: string;
  weapon_loadout: WeaponStore[];
  waypoints: Waypoint[];
  evasion_waypoints?: Waypoint[];
  is_retasked?: boolean;
  threat_alert?: boolean;
  threat_proximity_alert?: boolean;
  proximate_threat_name?: string;
  lat: number;
  lng: number;
  active_waypoints?: Waypoint[];
}

export interface CrisisState {
  is_crisis_active: boolean;
  crisis_type?: string | null;
  target_aircraft_id?: string | null;
  threat_id?: string | null;
  injected_at?: string | null;
  retasking_plan?: RetaskingPlan | null;
}

export interface RetaskingPlan {
  incident_id: string;
  crisis_summary: string;
  threat_entity: string;
  urgency: string;
  affected_aircraft: {
    id: string;
    callsign: string;
    pilot: string;
    current_fuel_pct: number;
  };
  recommendation_title: string;
  action_type: string;
  delta_metrics: {
    original_distance_km: number;
    retasked_distance_km: number;
    distance_delta_km: number;
    fuel_burn_delta_kg: number;
    fuel_pct_cost: number;
    eta_delay_minutes: number;
    threat_exposure_reduction_pct: number;
    survivability_score_before: number;
    survivability_score_after: number;
  };
  decision_radar_scores: {
    survivability: number;
    mission_success_prob: number;
    fuel_feasibility: number;
    crew_duty_compliance: number;
    airspace_deconfliction: number;
  };
  xai_rationale: string;
  evasion_waypoints?: Waypoint[];
  can_auto_commit: boolean;
}

export interface TacticalCOPResponse {
  timestamp: string;
  sim_time_hours: number;
  airbases: Airbase[];
  threat_zones: ThreatZone[];
  aircraft: AircraftTelemetry[];
  crisis_state: CrisisState;
  defcon_level: string;
}

export interface FusionStream {
  id: string;
  name: string;
  provider: string;
  status: 'OPTIMAL' | 'HIGH_ALERT' | 'STALE_WARNING' | 'DEGRADED';
  latency_ms: number;
  sync_rate_hz: number;
  integrity_score: number;
  records_per_min: number;
  last_packet: string;
}

export interface FusionInconsistency {
  id: string;
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  source_pair: string[];
  target_resource: string;
  description: string;
  auto_resolved: boolean;
}

export interface FusionResponse {
  fusion_engine: string;
  composite_integrity_pct: number;
  active_stream_count: number;
  streams: FusionStream[];
  inconsistencies: FusionInconsistency[];
  last_audit_sync: string;
}

export interface ATOBriefingResponse {
  ato_number: string;
  zulu_effective: string;
  security_classification: string;
  mission_task: {
    mission_id: string;
    callsign: string;
    aircraft_type: string;
    tail_number: string;
    pilot_in_command: string;
    departure_base: string;
    destination_base: string;
    alternate_recovery_base: string;
  };
  flight_corridor: {
    flight_level: string;
    cruising_speed_kts: number;
    assigned_squawk_code: string;
    tactical_freq_mhz: string;
    bingo_fuel_pct: number;
    combat_radius_km: number;
  };
  ordnance_and_stores: WeaponStore[];
  threat_environment: {
    threat_warning_level: string;
    rules_of_engagement: string;
    active_threats_along_sector: Array<{
      threat: string;
      type: string;
      lethality: string;
    }>;
  };
  special_instructions_spins: string[];
  authorized_by: string;
}

