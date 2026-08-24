from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.audit_log import AuditActionEnum, AuditEntityTypeEnum
from app.schemas.call import CallDirectionEnum, CallPlatformEnum, CallStatusEnum
from app.schemas.call_outcome import OutcomeTypeEnum
from app.schemas.follow_up import FollowUpStatusEnum, FollowUpTypeEnum
from app.schemas.report import (
    AgentPerformanceReportItem,
    AuditReportItem,
    CallReportItem,
    CustomerReportItem,
    FollowUpReportItem,
    OutcomeReportItem,
    ReportSummaryResponse,
)
from app.services import report as report_service

router = APIRouter()


@router.get("/summary", response_model=ReportSummaryResponse, summary="Get summary reporting totals")
def get_report_summary(
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return report_service.get_report_summary(
        db=db,
        current_user=current_user,
        start_date=start_date,
        end_date=end_date
    )


@router.get("/calls", response_model=List[CallReportItem], summary="Get call activity report")
def get_call_report(
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    agent_id: Optional[int] = Query(None, description="Filter by agent ID (Admin only)"),
    direction: Optional[CallDirectionEnum] = Query(None, description="Filter by direction"),
    status_filter: Optional[CallStatusEnum] = Query(None, alias="status", description="Filter by status"),
    platform: Optional[CallPlatformEnum] = Query(None, description="Filter by platform"),
    customer_id: Optional[int] = Query(None, description="Filter by customer ID"),
    search: Optional[str] = Query(None, description="Search term"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return report_service.get_call_report(
        db=db,
        current_user=current_user,
        start_date=start_date,
        end_date=end_date,
        agent_id=agent_id,
        direction=direction.value if direction else None,
        status=status_filter.value if status_filter else None,
        platform=platform.value if platform else None,
        customer_id=customer_id,
        search=search,
        skip=skip,
        limit=limit,
    )


@router.get("/calls/export", summary="Export call activity report to CSV")
def export_call_report_csv(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    agent_id: Optional[int] = Query(None),
    direction: Optional[CallDirectionEnum] = Query(None),
    status_filter: Optional[CallStatusEnum] = Query(None, alias="status"),
    platform: Optional[CallPlatformEnum] = Query(None),
    customer_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items = report_service.get_call_report(
        db=db,
        current_user=current_user,
        start_date=start_date,
        end_date=end_date,
        agent_id=agent_id,
        direction=direction.value if direction else None,
        status=status_filter.value if status_filter else None,
        platform=platform.value if platform else None,
        customer_id=customer_id,
        search=search,
        skip=0,
        limit=10000,
    )
    fieldnames = [
        "call_id", "customer_id", "customer_name", "customer_phone",
        "agent_id", "agent_name", "direction", "platform", "status",
        "duration_seconds", "started_at", "ended_at", "created_at"
    ]
    return report_service.export_to_csv_response(items, fieldnames, "call_report.csv")


@router.get("/customers", response_model=List[CustomerReportItem], summary="Get customer report")
def get_customer_report(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return report_service.get_customer_report(
        db=db,
        current_user=current_user,
        start_date=start_date,
        end_date=end_date,
        search=search,
        skip=skip,
        limit=limit,
    )


@router.get("/customers/export", summary="Export customer report to CSV")
def export_customer_report_csv(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items = report_service.get_customer_report(
        db=db,
        current_user=current_user,
        start_date=start_date,
        end_date=end_date,
        search=search,
        skip=0,
        limit=10000,
    )
    fieldnames = ["customer_id", "name", "phone", "email", "company", "is_active", "created_at"]
    return report_service.export_to_csv_response(items, fieldnames, "customer_report.csv")


@router.get("/outcomes", response_model=List[OutcomeReportItem], summary="Get call outcomes report")
def get_outcome_report(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    agent_id: Optional[int] = Query(None),
    outcome_type: Optional[OutcomeTypeEnum] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return report_service.get_outcome_report(
        db=db,
        current_user=current_user,
        start_date=start_date,
        end_date=end_date,
        agent_id=agent_id,
        outcome_type=outcome_type.value if outcome_type else None,
        skip=skip,
        limit=limit,
    )


@router.get("/outcomes/export", summary="Export call outcomes report to CSV")
def export_outcome_report_csv(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    agent_id: Optional[int] = Query(None),
    outcome_type: Optional[OutcomeTypeEnum] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items = report_service.get_outcome_report(
        db=db,
        current_user=current_user,
        start_date=start_date,
        end_date=end_date,
        agent_id=agent_id,
        outcome_type=outcome_type.value if outcome_type else None,
        skip=0,
        limit=10000,
    )
    fieldnames = ["outcome_id", "call_id", "customer_id", "customer_name", "agent_id", "agent_name", "outcome", "notes", "created_at"]
    return report_service.export_to_csv_response(items, fieldnames, "outcome_report.csv")


@router.get("/follow-ups", response_model=List[FollowUpReportItem], summary="Get follow-ups report")
def get_follow_up_report(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    agent_id: Optional[int] = Query(None),
    status_filter: Optional[FollowUpStatusEnum] = Query(None, alias="status"),
    follow_up_type: Optional[FollowUpTypeEnum] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return report_service.get_follow_up_report(
        db=db,
        current_user=current_user,
        start_date=start_date,
        end_date=end_date,
        agent_id=agent_id,
        status=status_filter.value if status_filter else None,
        follow_up_type=follow_up_type.value if follow_up_type else None,
        skip=skip,
        limit=limit,
    )


@router.get("/follow-ups/export", summary="Export follow-ups report to CSV")
def export_follow_up_report_csv(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    agent_id: Optional[int] = Query(None),
    status_filter: Optional[FollowUpStatusEnum] = Query(None, alias="status"),
    follow_up_type: Optional[FollowUpTypeEnum] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items = report_service.get_follow_up_report(
        db=db,
        current_user=current_user,
        start_date=start_date,
        end_date=end_date,
        agent_id=agent_id,
        status=status_filter.value if status_filter else None,
        follow_up_type=follow_up_type.value if follow_up_type else None,
        skip=0,
        limit=10000,
    )
    fieldnames = ["follow_up_id", "call_id", "customer_id", "customer_name", "assigned_to", "assigned_user_name", "follow_up_type", "status", "scheduled_at", "completed_at", "notes", "created_at"]
    return report_service.export_to_csv_response(items, fieldnames, "follow_up_report.csv")


@router.get("/agents", response_model=List[AgentPerformanceReportItem], summary="Get agent performance report")
def get_agent_performance_report(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    agent_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return report_service.get_agent_performance_report(
        db=db,
        current_user=current_user,
        start_date=start_date,
        end_date=end_date,
        agent_id=agent_id,
    )


@router.get("/agents/export", summary="Export agent performance report to CSV")
def export_agent_performance_report_csv(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    agent_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items = report_service.get_agent_performance_report(
        db=db,
        current_user=current_user,
        start_date=start_date,
        end_date=end_date,
        agent_id=agent_id,
    )
    fieldnames = [
        "agent_id", "agent_name", "agent_email", "total_calls",
        "incoming_calls", "outgoing_calls", "completed_calls",
        "missed_calls", "failed_calls", "total_duration_seconds",
        "average_duration_seconds", "outcomes_recorded", "follow_ups_assigned"
    ]
    return report_service.export_to_csv_response(items, fieldnames, "agent_performance_report.csv")


@router.get("/audit-logs", response_model=List[AuditReportItem], summary="Get audit activity history report")
def get_audit_report(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    action: Optional[AuditActionEnum] = Query(None),
    entity_type: Optional[AuditEntityTypeEnum] = Query(None),
    user_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return report_service.get_audit_report(
        db=db,
        current_user=current_user,
        start_date=start_date,
        end_date=end_date,
        action=action.value if action else None,
        entity_type=entity_type.value if entity_type else None,
        user_id=user_id,
        skip=skip,
        limit=limit,
    )


@router.get("/audit-logs/export", summary="Export audit activity history report to CSV")
def export_audit_report_csv(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    action: Optional[AuditActionEnum] = Query(None),
    entity_type: Optional[AuditEntityTypeEnum] = Query(None),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items = report_service.get_audit_report(
        db=db,
        current_user=current_user,
        start_date=start_date,
        end_date=end_date,
        action=action.value if action else None,
        entity_type=entity_type.value if entity_type else None,
        user_id=user_id,
        skip=0,
        limit=10000,
    )
    fieldnames = ["audit_id", "user_id", "user_name", "action", "entity_type", "entity_id", "description", "created_at"]
    return report_service.export_to_csv_response(items, fieldnames, "audit_history_report.csv")
