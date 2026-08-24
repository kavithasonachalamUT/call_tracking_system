from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.call import CallDirectionEnum, CallStatusEnum
from app.schemas.call_dashboard import (
    CallActivityItem,
    CallActivitySummary,
    CallDashboardResponse,
    RecentCallItem,
    RecentOutcomeItem,
    UpcomingFollowUpItem,
)
from app.services import call_dashboard as dashboard_service

router = APIRouter()


@router.get("/overview", response_model=CallDashboardResponse, summary="Get full dashboard overview")
def get_dashboard_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return dashboard_service.get_call_dashboard(db=db, current_user=current_user)


@router.get("/summary", response_model=CallActivitySummary, summary="Get call activity summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return dashboard_service.get_dashboard_summary(db=db, current_user=current_user)


@router.get("/recent-calls", response_model=List[RecentCallItem], summary="Get recent call logs")
def get_recent_calls(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(10, ge=1, le=100, description="Max items to return"),
    direction: Optional[CallDirectionEnum] = Query(None, description="Filter by direction"),
    status_filter: Optional[CallStatusEnum] = Query(None, alias="status", description="Filter by status"),
    search: Optional[str] = Query(None, description="Search customer name or phone"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return dashboard_service.get_recent_calls(
        db=db,
        current_user=current_user,
        skip=skip,
        limit=limit,
        direction=direction.value if direction else None,
        status=status_filter.value if status_filter else None,
        search=search,
    )


@router.get("/activity", response_model=List[CallActivityItem], summary="Get detailed call activity feed")
def get_call_activity(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Max items to return"),
    direction: Optional[CallDirectionEnum] = Query(None, description="Filter by direction"),
    status_filter: Optional[CallStatusEnum] = Query(None, alias="status", description="Filter by status"),
    customer_id: Optional[int] = Query(None, description="Filter by customer ID"),
    agent_id: Optional[int] = Query(None, description="Filter by agent ID (Admin only)"),
    search: Optional[str] = Query(None, description="Search customer name, phone, subject, or notes"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return dashboard_service.get_call_activity(
        db=db,
        current_user=current_user,
        skip=skip,
        limit=limit,
        direction=direction.value if direction else None,
        status=status_filter.value if status_filter else None,
        customer_id=customer_id,
        agent_id=agent_id,
        search=search,
    )


@router.get("/upcoming-follow-ups", response_model=List[UpcomingFollowUpItem], summary="Get upcoming follow-ups")
def get_upcoming_follow_ups(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(10, ge=1, le=100, description="Max items to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return dashboard_service.get_upcoming_follow_ups(db=db, current_user=current_user, skip=skip, limit=limit)


@router.get("/recent-outcomes", response_model=List[RecentOutcomeItem], summary="Get recent call outcomes")
def get_recent_outcomes(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(10, ge=1, le=100, description="Max items to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return dashboard_service.get_recent_outcomes(db=db, current_user=current_user, skip=skip, limit=limit)
