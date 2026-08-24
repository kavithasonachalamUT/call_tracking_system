from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class CallActivitySummary(BaseModel):
    total_calls: int
    incoming_calls: int
    outgoing_calls: int
    completed_calls: int
    missed_calls: int
    failed_calls: int
    ongoing_calls: int
    total_duration_seconds: int
    avg_duration_seconds: float


class RecentCallItem(BaseModel):
    call_id: int
    customer_id: int
    customer_name: str
    customer_phone: str
    agent_id: int
    agent_name: str
    direction: str
    status: str
    duration_seconds: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    outcome: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CallActivityItem(BaseModel):
    call_id: int
    customer_id: int
    customer_name: str
    customer_phone: str
    agent_id: int
    agent_name: str
    direction: str
    status: str
    duration_seconds: Optional[int] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    outcome: Optional[str] = None
    follow_up_count: int

    model_config = ConfigDict(from_attributes=True)


class UpcomingFollowUpItem(BaseModel):
    follow_up_id: int
    call_id: int
    customer_id: int
    customer_name: str
    assigned_to: int
    assigned_user_name: str
    follow_up_type: str
    status: str
    scheduled_at: datetime
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RecentOutcomeItem(BaseModel):
    outcome_id: int
    call_id: int
    customer_id: int
    customer_name: str
    agent_id: int
    agent_name: str
    outcome: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CallDashboardResponse(BaseModel):
    summary: CallActivitySummary
    recent_calls: List[RecentCallItem]
    upcoming_follow_ups: List[UpcomingFollowUpItem]
    recent_outcomes: List[RecentOutcomeItem]
