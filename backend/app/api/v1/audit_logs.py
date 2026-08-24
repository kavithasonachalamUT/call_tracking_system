from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.db.database import get_db
from app.models.user import User
from app.schemas.audit_log import (
    AuditActionEnum,
    AuditEntityTypeEnum,
    AuditLogCreate,
    AuditLogResponse,
)
from app.services import audit_log as audit_service

router = APIRouter()


@router.post("", response_model=AuditLogResponse, status_code=status.HTTP_201_CREATED, summary="Create an audit log entry (Admin/System only)")
def create_audit_log(
    audit_in: AuditLogCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    log = audit_service.create_audit_log(db=db, audit_in=audit_in)
    return audit_service.get_audit_log(db=db, audit_log_id=log.id, current_user=admin_user)


@router.get("", response_model=List[AuditLogResponse], summary="List audit logs with filtering, search, and pagination")
def list_audit_logs(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Max number of items to return"),
    action: Optional[AuditActionEnum] = Query(None, description="Filter by action"),
    entity_type: Optional[AuditEntityTypeEnum] = Query(None, description="Filter by entity type"),
    entity_id: Optional[int] = Query(None, description="Filter by entity ID"),
    user_id: Optional[int] = Query(None, description="Filter by user ID (Admin only)"),
    search: Optional[str] = Query(None, description="Search description, action, entity type, or values"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return audit_service.get_audit_logs(
        db=db,
        current_user=current_user,
        skip=skip,
        limit=limit,
        action=action.value if action else None,
        entity_type=entity_type.value if entity_type else None,
        entity_id=entity_id,
        user_id=user_id,
        search=search,
    )


@router.get("/{audit_log_id}", response_model=AuditLogResponse, summary="Get audit log entry by ID")
def get_audit_log(
    audit_log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return audit_service.get_audit_log(db=db, audit_log_id=audit_log_id, current_user=current_user)
