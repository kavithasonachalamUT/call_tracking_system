from typing import Dict, List, Optional
from pydantic import BaseModel


class CallSummaryResponse(BaseModel):
    total_calls: int
    incoming_calls: int
    outgoing_calls: int
    status_breakdown: Dict[str, int]
    total_duration_seconds: int
    avg_duration_seconds: float
    incoming_total_duration_seconds: int
    incoming_avg_duration_seconds: float
    outgoing_total_duration_seconds: int
    outgoing_avg_duration_seconds: float


class OutcomeSummaryResponse(BaseModel):
    total_outcomes: int
    outcome_breakdown: Dict[str, int]


class FollowUpSummaryResponse(BaseModel):
    total_follow_ups: int
    status_breakdown: Dict[str, int]
    type_breakdown: Dict[str, int]


class AgentPerformanceItem(BaseModel):
    agent_id: int
    agent_name: str
    agent_email: str
    total_calls: int
    incoming_calls: int
    outgoing_calls: int
    completed_calls: int
    total_duration_seconds: int
    avg_duration_seconds: float
    outcomes_recorded: int
    follow_ups_assigned: int


class FullAnalyticsResponse(BaseModel):
    call_summary: CallSummaryResponse
    outcome_summary: OutcomeSummaryResponse
    follow_up_summary: FollowUpSummaryResponse
    agent_performance: List[AgentPerformanceItem]
