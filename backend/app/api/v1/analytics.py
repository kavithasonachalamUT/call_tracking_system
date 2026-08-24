from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.call_analytics import (
    AgentPerformanceItem,
    CallSummaryResponse,
    FollowUpSummaryResponse,
    FullAnalyticsResponse,
    OutcomeSummaryResponse,
)
from app.services import call_analytics as analytics_service

router = APIRouter()


@router.get("/overview", response_model=FullAnalyticsResponse, summary="Get full call analytics overview")
def get_analytics_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return analytics_service.get_call_analytics(db=db, current_user=current_user)


@router.get("/calls", response_model=CallSummaryResponse, summary="Get call summary statistics")
def get_call_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return analytics_service.get_call_summary(db=db, current_user=current_user)


@router.get("/outcomes", response_model=OutcomeSummaryResponse, summary="Get call outcome summary")
def get_outcome_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return analytics_service.get_call_outcome_summary(db=db, current_user=current_user)


@router.get("/follow-ups", response_model=FollowUpSummaryResponse, summary="Get follow-up summary")
def get_follow_up_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return analytics_service.get_follow_up_summary(db=db, current_user=current_user)


@router.get("/agents", response_model=List[AgentPerformanceItem], summary="Get agent performance metrics")
def get_agent_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return analytics_service.get_agent_call_performance(db=db, current_user=current_user)
