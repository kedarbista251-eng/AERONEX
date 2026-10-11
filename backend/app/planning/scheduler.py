import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.models import (
    Resource, MissionRequest, PlanningScenario, Recommendation,
    ScheduleAssignment, RecommendationStatus, RequestStatus
)
from app.planning.rules_engine import evaluate_hard_constraints_for_pair
from app.services.explanation import generate_recommendation_explanation

def generate_feasible_scenarios(
    scenario_id: str,
    db: Session,
    request_ids: Optional[List[str]] = None
) -> List[Recommendation]:
    """
    Generates multiple feasible schedule alternatives for a given planning scenario.
    Enforces hard constraints, prevents double booking, scores alternatives,
    and returns Recommendation objects ready for human review.
    """
    # 1. Fetch Requests
    if request_ids:
        requests = db.query(MissionRequest).filter(MissionRequest.id.in_(request_ids)).all()
    else:
        requests = db.query(MissionRequest).filter(
            MissionRequest.status.in_([RequestStatus.UNASSIGNED, RequestStatus.PENDING_REVIEW, RequestStatus.CONFLICTED])
        ).all()

    if not requests:
        # Fetch all requests as fallback if none pending
        requests = db.query(MissionRequest).all()

    resources = db.query(Resource).all()

    # Sort requests by priority (CRITICAL -> HIGH -> MEDIUM -> LOW)
    priority_map = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}
    requests_sorted = sorted(requests, key=lambda r: priority_map.get(r.priority.value, 1), reverse=True)

    # 2. Build Eligibility Matrix & Exclusions
    eligibility_map: Dict[str, List[Tuple[Resource, List[Any]]]] = {} # req_id -> [(res, constraint_results)]
    excluded_resources: List[Dict[str, Any]] = []

    for req in requests_sorted:
        eligibility_map[req.id] = []
        for res in resources:
            is_eligible, rules_eval = evaluate_hard_constraints_for_pair(res, req, db)
            rule_dicts = [r.to_dict() for r in rules_eval]
            if is_eligible:
                eligibility_map[req.id].append((res, rule_dicts))
            else:
                failed_rules = [r for r in rules_eval if not r.passed]
                reason_str = "; ".join([r.reason for r in failed_rules])
                excluded_resources.append({
                    "request_id": req.id,
                    "request_title": req.title,
                    "resource_id": res.id,
                    "resource_name": res.name,
                    "reason": reason_str,
                    "failed_rules": [r.rule_name for r in failed_rules]
                })

    # 3. Strategy 1: Optimal Primary Assignment (Sort candidates by health_score & exact payload match)
    assignments_opt_1 = []
    used_resource_windows_1 = [] # [(res_id, start_time, end_time)]

    for req in requests_sorted:
        candidates = eligibility_map.get(req.id, [])
        # Sort by health_score descending
        candidates_sorted = sorted(candidates, key=lambda tuple_: tuple_[0].health_score, reverse=True)

        assigned_res = None
        for res, _ in candidates_sorted:
            # Check overlap with already assigned requests for this resource
            req_start = req.start_time if req.start_time.tzinfo else req.start_time.replace(tzinfo=timezone.utc)
            req_end = req.end_time if req.end_time.tzinfo else req.end_time.replace(tzinfo=timezone.utc)

            has_overlap = False
            for assigned_res_id, a_start, a_end in used_resource_windows_1:
                if assigned_res_id == res.id:
                    if max(req_start, a_start) < min(req_end, a_end):
                        has_overlap = True
                        break
            if not has_overlap:
                assigned_res = res
                used_resource_windows_1.append((res.id, req_start, req_end))
                break

        if assigned_res:
            assignments_opt_1.append({
                "request": req,
                "resource": assigned_res,
                "confidence": 0.96
            })

    # 4. Strategy 2: Distributed Load Strategy (Prioritize least recently used / lowest current assignments count)
    assignments_opt_2 = []
    used_resource_windows_2 = []
    resource_assignment_counts = {r.id: 0 for r in resources}

    for req in requests_sorted:
        candidates = eligibility_map.get(req.id, [])
        candidates_sorted = sorted(candidates, key=lambda tuple_: resource_assignment_counts[tuple_[0].id])

        assigned_res = None
        for res, _ in candidates_sorted:
            req_start = req.start_time if req.start_time.tzinfo else req.start_time.replace(tzinfo=timezone.utc)
            req_end = req.end_time if req.end_time.tzinfo else req.end_time.replace(tzinfo=timezone.utc)

            has_overlap = False
            for assigned_res_id, a_start, a_end in used_resource_windows_2:
                if assigned_res_id == res.id:
                    if max(req_start, a_start) < min(req_end, a_end):
                        has_overlap = True
                        break
            if not has_overlap:
                assigned_res = res
                used_resource_windows_2.append((res.id, req_start, req_end))
                resource_assignment_counts[res.id] += 1
                break

        if assigned_res:
            assignments_opt_2.append({
                "request": req,
                "resource": assigned_res,
                "confidence": 0.91
            })

    # Build Recommendations DB objects
    recommendations: List[Recommendation] = []
    total_req_count = max(len(requests), 1)

    # --- Recommendation Option A ---
    cov_1 = round((len(assignments_opt_1) / total_req_count) * 100.0, 1)
    util_1 = round((len(used_resource_windows_1) / max(len(resources), 1)) * 100.0, 1)
    stab_1 = 94.5 if cov_1 > 70 else 60.0
    tot_1 = round((cov_1 * 0.5) + (util_1 * 0.3) + (stab_1 * 0.2), 1)

    rec_1_id = f"rec-opt-a-{uuid.uuid4().hex[:6]}"
    explanation_1 = generate_recommendation_explanation(
        option_title="Option A (Optimal Health & Capability Fit)",
        coverage_percent=cov_1,
        total_requests=len(requests),
        assigned_requests=len(assignments_opt_1),
        excluded_count=len(excluded_resources),
        assignments=assignments_opt_1,
        excluded=excluded_resources
    )

    rec_1 = Recommendation(
        id=rec_1_id,
        scenario_id=scenario_id,
        title="Option A (Optimal Health & Coverage)",
        status=RecommendationStatus.PENDING_REVIEW,
        coverage_score=cov_1,
        utilization_score=util_1,
        stability_score=stab_1,
        total_score=tot_1,
        explanation_text=explanation_1,
        constraint_results={"total_evaluated": len(requests) * len(resources), "eligible_pairs": sum(len(v) for v in eligibility_map.values())},
        excluded_resources=excluded_resources[:15], # top exclusions
        created_at=datetime.now(timezone.utc)
    )
    db.add(rec_1)
    db.flush()

    for item in assignments_opt_1:
        req = item["request"]
        res = item["resource"]
        assign = ScheduleAssignment(
            id=f"assign-{uuid.uuid4().hex[:8]}",
            recommendation_id=rec_1.id,
            request_id=req.id,
            resource_id=res.id,
            assigned_start=req.start_time,
            assigned_end=req.end_time,
            confidence_score=item["confidence"]
        )
        db.add(assign)

    recommendations.append(rec_1)

    # --- Recommendation Option B ---
    if len(assignments_opt_2) > 0:
        cov_2 = round((len(assignments_opt_2) / total_req_count) * 100.0, 1)
        util_2 = round((len(used_resource_windows_2) / max(len(resources), 1)) * 100.0, 1)
        stab_2 = 88.0
        tot_2 = round((cov_2 * 0.5) + (util_2 * 0.3) + (stab_2 * 0.2), 1)

        rec_2_id = f"rec-opt-b-{uuid.uuid4().hex[:6]}"
        explanation_2 = generate_recommendation_explanation(
            option_title="Option B (Balanced Fleet Load Distribution)",
            coverage_percent=cov_2,
            total_requests=len(requests),
            assigned_requests=len(assignments_opt_2),
            excluded_count=len(excluded_resources),
            assignments=assignments_opt_2,
            excluded=excluded_resources
        )

        rec_2 = Recommendation(
            id=rec_2_id,
            scenario_id=scenario_id,
            title="Option B (Balanced Fleet Spread)",
            status=RecommendationStatus.PENDING_REVIEW,
            coverage_score=cov_2,
            utilization_score=util_2,
            stability_score=stab_2,
            total_score=tot_2,
            explanation_text=explanation_2,
            constraint_results={"total_evaluated": len(requests) * len(resources), "eligible_pairs": sum(len(v) for v in eligibility_map.values())},
            excluded_resources=excluded_resources[:15],
            created_at=datetime.now(timezone.utc)
        )
        db.add(rec_2)
        db.flush()

        for item in assignments_opt_2:
            req = item["request"]
            res = item["resource"]
            assign = ScheduleAssignment(
                id=f"assign-{uuid.uuid4().hex[:8]}",
                recommendation_id=rec_2.id,
                request_id=req.id,
                resource_id=res.id,
                assigned_start=req.start_time,
                assigned_end=req.end_time,
                confidence_score=item["confidence"]
            )
            db.add(assign)

        recommendations.append(rec_2)

    db.commit()
    return recommendations
