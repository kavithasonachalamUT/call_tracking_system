from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class CallReportItem(BaseModel):
    call_id: int
    customer_id: int
    customer_name: str
    customer_phone: str
    agent_id: int
    agent_name: str
    direction: str
    platform: str
    status: str
    duration_seconds: Optional[int] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CustomerReportItem(BaseModel):
    customer_id: int
    name: str
    phone: str
    email: Optional[str] = None
    company: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OutcomeReportItem(BaseModel):
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


class FollowUpReportItem(BaseModel):
    follow_up_id: int
    call_id: int
    customer_id: int
    customer_name: str
    assigned_to: int
    assigned_user_name: str
    follow_up_type: str
    status: str
    scheduled_at: datetime
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AgentPerformanceReportItem(BaseModel):
    agent_id: int
    agent_name: str
    agent_email: str
    total_calls: int
    incoming_calls: int
    outgoing_calls: int
    completed_calls: int
    missed_calls: int
    failed_calls: int
    total_duration_seconds: int
    average_duration_seconds: float
    outcomes_recorded: int
    follow_ups_assigned: int


class AuditReportItem(BaseModel):
    audit_id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    description: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReportSummaryResponse(BaseModel):
    total_calls: int
    total_customers: int
    total_outcomes: int
    total_follow_ups: int
    total_duration_seconds: int
