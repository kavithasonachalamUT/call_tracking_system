from typing import List, Optional
from sqlalchemy import or_
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.api.deps import get_accessible_agent_ids
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.audit_log import AuditLogCreate, AuditLogResponse


def create_audit_log(db: Session, audit_in: AuditLogCreate) -> AuditLog:
    action_str = audit_in.action.value if hasattr(audit_in.action, 'value') else audit_in.action
    entity_type_str = audit_in.entity_type.value if hasattr(audit_in.entity_type, 'value') else audit_in.entity_type

    db_log = AuditLog(
        user_id=audit_in.user_id,
        action=action_str,
        entity_type=entity_type_str,
        entity_id=audit_in.entity_id,
        description=audit_in.description,
        old_values=audit_in.old_values,
        new_values=audit_in.new_values,
        ip_address=audit_in.ip_address,
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log


def log_activity(
    db: Session,
    user_id: Optional[int],
    action: str,
    entity_type: str,
    entity_id: Optional[int] = None,
    description: Optional[str] = None,
    old_values: Optional[str] = None,
    new_values: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    db_log = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        old_values=old_values,
        new_values=new_values,
        ip_address=ip_address,
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log


def get_audit_logs(
    db: Session,
    current_user: User,
    skip: int = 0,
    limit: int = 100,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    user_id: Optional[int] = None,
    search: Optional[str] = None,
) -> List[AuditLogResponse]:
    query = db.query(AuditLog)

    accessible_ids = get_accessible_agent_ids(db, current_user)
    if accessible_ids is not None:
        if user_id is not None:
            if user_id not in accessible_ids:
                query = query.filter(AuditLog.user_id == -1)
            else:
                query = query.filter(AuditLog.user_id == user_id)
        else:
            query = query.filter(AuditLog.user_id.in_(accessible_ids))
    elif user_id is not None:
        query = query.filter(AuditLog.user_id == user_id)

    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if entity_id is not None:
        query = query.filter(AuditLog.entity_id == entity_id)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                AuditLog.description.ilike(search_pattern),
                AuditLog.action.ilike(search_pattern),
                AuditLog.entity_type.ilike(search_pattern),
                AuditLog.old_values.ilike(search_pattern),
                AuditLog.new_values.ilike(search_pattern)
            )
        )

    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()

    result: List[AuditLogResponse] = []
    for l in logs:
        user_obj = db.query(User).filter(User.id == l.user_id).first() if l.user_id else None
        result.append(
            AuditLogResponse(
                id=l.id,
                user_id=l.user_id,
                user_name=user_obj.name if user_obj else None,
                user_email=user_obj.email if user_obj else None,
                action=l.action,
                entity_type=l.entity_type,
                entity_id=l.entity_id,
                description=l.description,
                old_values=l.old_values,
                new_values=l.new_values,
                ip_address=l.ip_address,
                created_at=l.created_at,
            )
        )

    return result


def get_audit_log(db: Session, audit_log_id: int, current_user: User) -> AuditLogResponse:
    log = db.query(AuditLog).filter(AuditLog.id == audit_log_id).first()
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit log record not found"
        )

    accessible_ids = get_accessible_agent_ids(db, current_user)
    if accessible_ids is not None and log.user_id not in accessible_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this audit log record"
        )

    user_obj = db.query(User).filter(User.id == log.user_id).first() if log.user_id else None
    return AuditLogResponse(
        id=log.id,
        user_id=log.user_id,
        user_name=user_obj.name if user_obj else None,
        user_email=user_obj.email if user_obj else None,
        action=log.action,
        entity_type=log.entity_type,
        entity_id=log.entity_id,
        description=log.description,
        old_values=log.old_values,
        new_values=log.new_values,
        ip_address=log.ip_address,
        created_at=log.created_at,
    )
