import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import Base, get_db
from app.services.seed import seed_database
from app.services.data_quality import detect_data_quality_alerts
from app.models.models import Resource, ResourceStatus, MissionRequest, RequestStatus, MaintenanceRecord
from app.planning.rules_engine import evaluate_hard_constraints_for_pair
from app.planning.scheduler import generate_feasible_scenarios

TEST_DB_FILE = "./test_aerosync.db"
SQLALCHEMY_TEST_DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"

engine = create_engine(SQLALCHEMY_TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_database(db, force_reset=True)
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)

def test_api_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "AeroSync" in data["service"]

def test_dashboard_summary():
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["total_resources"] >= 20
    assert data["pending_requests"] >= 10
    assert "resource_type_breakdown" in data

def test_list_resources_and_filtering():
    response = client.get("/api/resources")
    assert response.status_code == 200
    resources = response.json()
    assert len(resources) >= 20

    # Filter by type
    filtered = client.get("/api/resources?type=RESCUE_HELICOPTER").json()
    assert all(r["resource_type"] == "RESCUE_HELICOPTER" for r in filtered)

def test_stale_data_detection():
    db = TestingSessionLocal()
    alerts = detect_data_quality_alerts(db)
    db.close()
    stale_alerts = [a for a in alerts if a.alert_type == "STALE_DATA"]
    assert len(stale_alerts) >= 1
    assert any("RES-C130-03" in a.message for a in stale_alerts)

def test_maintenance_conflict_detection():
    db = TestingSessionLocal()
    res = db.query(Resource).filter(Resource.id == "RES-HELO-02").first()
    req = db.query(MissionRequest).filter(MissionRequest.id == "REQ-2026-001").first()
    
    # RES-HELO-02 has active maintenance overlapping with REQ-2026-001
    is_eligible, rules = evaluate_hard_constraints_for_pair(res, req, db)
    db.close()
    
    assert is_eligible is False
    maint_rule = next(r for r in rules if r.rule_name == "MAINTENANCE_SCHEDULE_OVERLAP")
    assert maint_rule.passed is False

def test_infeasible_request_handling():
    db = TestingSessionLocal()
    res = db.query(Resource).filter(Resource.id == "RES-C17-04").first()
    req = db.query(MissionRequest).filter(MissionRequest.id == "REQ-2026-011").first() # Payload 60,000kg!
    
    is_eligible, rules = evaluate_hard_constraints_for_pair(res, req, db)
    db.close()
    
    assert is_eligible is False
    payload_rule = next(r for r in rules if r.rule_name == "PAYLOAD_CAPACITY")
    assert payload_rule.passed is False

def test_scenario_creation_and_evaluation():
    # 1. Create Scenario
    scen_resp = client.post("/api/scenarios", json={
        "name": "Test Evacuation Scenario",
        "description": "Evaluating emergency air transport"
    })
    assert scen_resp.status_code == 200
    scen_data = scen_resp.json()
    scen_id = scen_data["id"]

    # 2. Evaluate Scenario
    eval_resp = client.post(f"/api/scenarios/{scen_id}/evaluate")
    assert eval_resp.status_code == 200
    recs = eval_resp.json()
    assert len(recs) >= 1
    assert recs[0]["coverage_score"] > 0
    assert len(recs[0]["explanation_text"]) > 20

def test_approval_workflow_and_audit():
    # 1. Create & Evaluate
    scen_id = client.post("/api/scenarios", json={"name": "Approval Test"}).json()["id"]
    recs = client.post(f"/api/scenarios/{scen_id}/evaluate").json()
    rec_id = recs[0]["id"]

    # 2. Approve Recommendation
    appr_resp = client.post(f"/api/recommendations/{rec_id}/review", json={
        "reviewer_role": "Commander",
        "reviewer_name": "General Vance",
        "decision": "APPROVED",
        "comments": "Approved based on optimal coverage score."
    })
    assert appr_resp.status_code == 200
    assert appr_resp.json()["decision"] == "APPROVED"

    # 3. Verify Audit Event Logged
    audit_resp = client.get("/api/audit")
    assert audit_resp.status_code == 200
    audits = audit_resp.json()
    assert any(a["action"] == "RECOMMENDATION_APPROVED" for a in audits)

def test_reset_scenario():
    response = client.post("/api/reset")
    assert response.status_code == 200
    assert "reset" in response.json()["message"].lower()

def test_tactical_endpoints():
    # 1. Test COP
    cop_resp = client.get("/api/tactical/cop?sim_time=1.5")
    assert cop_resp.status_code == 200
    cop = cop_resp.json()
    assert len(cop["airbases"]) >= 5
    assert len(cop["threat_zones"]) >= 3
    assert len(cop["aircraft"]) >= 4

    # 2. Test Threat List & Toggle
    threats_resp = client.get("/api/tactical/threats")
    assert threats_resp.status_code == 200
    th_id = threats_resp.json()[0]["id"]
    toggle_resp = client.post(f"/api/tactical/threats/{th_id}/toggle")
    assert toggle_resp.status_code == 200

    # 3. Test Crisis Injection & Retasking
    crisis_resp = client.post("/api/tactical/inject-crisis?crisis_type=SAM_RADAR_ACTIVATED")
    assert crisis_resp.status_code == 200
    plan = crisis_resp.json()
    assert plan["delta_metrics"]["threat_exposure_reduction_pct"] == 100.0
    assert "survivability_score_after" in plan["delta_metrics"]

    # 4. Commit Retask
    commit_resp = client.post("/api/tactical/retask/commit?approved=true&reviewer=Air%20Marshal%20Singh")
    assert commit_resp.status_code == 200
    assert commit_resp.json()["status"] == "RETASKING_COMMITTED"

    # 5. Test Sensor Fusion
    fusion_resp = client.get("/api/tactical/fusion")
    assert fusion_resp.status_code == 200
    assert fusion_resp.json()["composite_integrity_pct"] > 90.0

    # 6. Test ATO Briefing
    ato_resp = client.get("/api/tactical/ato/REQ-2026-002")
    assert ato_resp.status_code == 200
    assert "GARUDA-01" in ato_resp.json()["mission_task"]["callsign"]


def test_weapon_and_threat_constraint_rules():
    db = TestingSessionLocal()
    res = db.query(Resource).filter(Resource.id == "RES-C130-01").first()
    req = db.query(MissionRequest).filter(MissionRequest.id == "REQ-2026-002").first()

    is_eligible, rules = evaluate_hard_constraints_for_pair(res, req, db)
    db.close()

    rule_names = [r.rule_name for r in rules]
    assert "WEAPON_LOADOUT_COMPATIBILITY" in rule_names
    assert "CONTESTED_THREAT_ENVELOPE" in rule_names

    weapon_rule = next(r for r in rules if r.rule_name == "WEAPON_LOADOUT_COMPATIBILITY")
    assert weapon_rule.passed is True


def test_predictive_analytics_endpoints():
    # 1. Fleet Readiness
    fleet_resp = client.get("/api/predictive/fleet-readiness")
    assert fleet_resp.status_code == 200
    fleet_data = fleet_resp.json()
    assert fleet_data["total_airframes_monitored"] >= 20
    assert "surge_capacity_pct" in fleet_data
    assert len(fleet_data["sector_weather_horizons"]) >= 4

    # 2. Survivability Curve
    surv_resp = client.get("/api/predictive/survivability?countermeasures=true&stealth=false")
    assert surv_resp.status_code == 200
    surv_data = surv_resp.json()
    assert "overall_survivability_pct" in surv_data
    assert len(surv_data["waypoints_analysis"]) >= 4

    # 3. Dynamic Fuel Profile
    fuel_resp = client.get("/api/predictive/fuel-profile?initial_fuel=90&burn_rate_kgh=2000&distance_km=600")
    assert fuel_resp.status_code == 200
    fuel_data = fuel_resp.json()
    assert fuel_data["is_mission_feasible"] is True
    assert len(fuel_data["profile_points"]) >= 8

    # 4. Weather Horizon
    wx_resp = client.get("/api/predictive/weather-horizon?region=Sector-Alpha%20Airbase")
    assert wx_resp.status_code == 200
    wx_data = wx_resp.json()
    assert len(wx_data["hourly_projections"]) == 7

    # 5. What-If Simulation
    sim_resp = client.post("/api/predictive/what-if-simulation", json={
        "aircraft_type": "CARGO_TRANSPORT",
        "distance_km": 500,
        "initial_fuel_pct": 80,
        "countermeasures": True,
        "stealth": False,
        "environment_stress": "NORMAL"
    })
    assert sim_resp.status_code == 200
    sim_data = sim_resp.json()
    assert "composite_feasibility_score" in sim_data
    assert sim_data["composite_feasibility_score"] > 50


