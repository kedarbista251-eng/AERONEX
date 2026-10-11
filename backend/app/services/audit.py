import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.models import AuditEvent, AuditAction

def log_audit_event(
    db: Session,
    action: AuditAction,
    actor_role: str = "System",
    actor_name: str = "AeroSync Engine",
    related_entity_type: Optional[str] = None,
    related_entity_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    comments: Optional[str] = None
) -> AuditEvent:
    event = AuditEvent(
        id=f"audit-{uuid.uuid4().hex[:8]}",
        action=action,
        actor_role=actor_role,
        actor_name=actor_name,
        related_entity_type=related_entity_type,
        related_entity_id=related_entity_id,
        details=details or {},
        comments=comments,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event
