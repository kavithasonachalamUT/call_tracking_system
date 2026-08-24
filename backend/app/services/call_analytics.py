from typing import List, Dict
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_accessible_agent_ids
from app.models.call import Call
from app.models.call_outcome import CallOutcome
from app.models.follow_up import FollowUp
from app.models.user import User
from app.schemas.call_analytics import (
    CallSummaryResponse,
    OutcomeSummaryResponse,
    FollowUpSummaryResponse,
    AgentPerformanceItem,
    FullAnalyticsResponse,
)


def get_call_summary(db: Session, current_user: User) -> CallSummaryResponse:
    query = db.query(Call).filter(Call.is_active == True)
    accessible_ids = get_accessible_agent_ids(db, current_user)
    if accessible_ids is not None:
        query = query.filter(Call.agent_id.in_(accessible_ids))

    calls = query.all()

    total_calls = len(calls)
    incoming_calls = 0
    outgoing_calls = 0

    status_counts: Dict[str, int] = {
        "initiated": 0,
        "ringing": 0,
        "ongoing": 0,
        "completed": 0,
        "missed": 0,
        "failed": 0,
        "cancelled": 0,
    }

    total_dur = 0
    dur_count = 0

    inc_dur = 0
    inc_dur_count = 0

    out_dur = 0
    out_dur_count = 0

    for c in calls:
        if c.direction == "incoming":
            incoming_calls += 1
            if c.duration_seconds is not None:
                inc_dur += c.duration_seconds
                inc_dur_count += 1
        elif c.direction == "outgoing":
            outgoing_calls += 1
            if c.duration_seconds is not None:
                out_dur += c.duration_seconds
                out_dur_count += 1

        if c.status in status_counts:
            status_counts[c.status] += 1
        else:
            status_counts[c.status] = 1

        if c.duration_seconds is not None:
            total_dur += c.duration_seconds
            dur_count += 1

    avg_dur = round(total_dur / dur_count, 2) if dur_count > 0 else 0.0
    inc_avg_dur = round(inc_dur / inc_dur_count, 2) if inc_dur_count > 0 else 0.0
    out_avg_dur = round(out_dur / out_dur_count, 2) if out_dur_count > 0 else 0.0

    return CallSummaryResponse(
        total_calls=total_calls,
        incoming_calls=incoming_calls,
        outgoing_calls=outgoing_calls,
        status_breakdown=status_counts,
        total_duration_seconds=total_dur,
        avg_duration_seconds=avg_dur,
        incoming_total_duration_seconds=inc_dur,
        incoming_avg_duration_seconds=inc_avg_dur,
        outgoing_total_duration_seconds=out_dur,
        outgoing_avg_duration_seconds=out_avg_dur,
    )


def get_call_outcome_summary(db: Session, current_user: User) -> OutcomeSummaryResponse:
    query = db.query(CallOutcome).filter(CallOutcome.is_active == True)
    accessible_ids = get_accessible_agent_ids(db, current_user)
    if accessible_ids is not None:
        query = query.filter(CallOutcome.created_by.in_(accessible_ids))

    outcomes = query.all()
    total_outcomes = len(outcomes)

    breakdown: Dict[str, int] = {}
    for o in outcomes:
        breakdown[o.outcome] = breakdown.get(o.outcome, 0) + 1

    return OutcomeSummaryResponse(
        total_outcomes=total_outcomes,
        outcome_breakdown=breakdown,
    )


def get_follow_up_summary(db: Session, current_user: User) -> FollowUpSummaryResponse:
    query = db.query(FollowUp).filter(FollowUp.is_active == True)
    accessible_ids = get_accessible_agent_ids(db, current_user)
    if accessible_ids is not None:
        query = query.filter(FollowUp.assigned_to.in_(accessible_ids))

    follow_ups = query.all()
    total_follow_ups = len(follow_ups)

    status_counts: Dict[str, int] = {}
    type_counts: Dict[str, int] = {}

    for f in follow_ups:
        status_counts[f.status] = status_counts.get(f.status, 0) + 1
        type_counts[f.follow_up_type] = type_counts.get(f.follow_up_type, 0) + 1

    return FollowUpSummaryResponse(
        total_follow_ups=total_follow_ups,
        status_breakdown=status_counts,
        type_breakdown=type_counts,
    )


def get_agent_call_performance(db: Session, current_user: User) -> List[AgentPerformanceItem]:
    accessible_ids = get_accessible_agent_ids(db, current_user)
    if accessible_ids is None:
        users = db.query(User).filter(User.is_active == True).all()
    else:
        users = db.query(User).filter(User.id.in_(accessible_ids), User.is_active == True).all()

    performance_list: List[AgentPerformanceItem] = []

    for u in users:
        calls = db.query(Call).filter(Call.agent_id == u.id, Call.is_active == True).all()
        outcomes_count = db.query(CallOutcome).filter(CallOutcome.created_by == u.id, CallOutcome.is_active == True).count()
        follow_ups_count = db.query(FollowUp).filter(FollowUp.assigned_to == u.id, FollowUp.is_active == True).count()

        total_calls = len(calls)
        incoming_calls = sum(1 for c in calls if c.direction == "incoming")
        outgoing_calls = sum(1 for c in calls if c.direction == "outgoing")
        completed_calls = sum(1 for c in calls if c.status == "completed")

        durations = [c.duration_seconds for c in calls if c.duration_seconds is not None]
        total_duration = sum(durations)
        avg_duration = round(total_duration / len(durations), 2) if durations else 0.0

        performance_list.append(
            AgentPerformanceItem(
                agent_id=u.id,
                agent_name=u.name,
                agent_email=u.email,
                total_calls=total_calls,
                incoming_calls=incoming_calls,
                outgoing_calls=outgoing_calls,
                completed_calls=completed_calls,
                total_duration_seconds=total_duration,
                avg_duration_seconds=avg_duration,
                outcomes_recorded=outcomes_count,
                follow_ups_assigned=follow_ups_count,
            )
        )

    return performance_list


def get_call_analytics(db: Session, current_user: User) -> FullAnalyticsResponse:
    call_sum = get_call_summary(db, current_user)
    outcome_sum = get_call_outcome_summary(db, current_user)
    follow_up_sum = get_follow_up_summary(db, current_user)
    agent_perf = get_agent_call_performance(db, current_user)

    return FullAnalyticsResponse(
        call_summary=call_sum,
        outcome_summary=outcome_sum,
        follow_up_summary=follow_up_sum,
        agent_performance=agent_perf,
    )
