from typing import List, Optional
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_accessible_agent_ids
from app.models.call import Call
from app.models.customer import Customer
from app.models.user import User
from app.models.call_outcome import CallOutcome
from app.models.follow_up import FollowUp
from app.schemas.call_dashboard import (
    CallActivitySummary,
    RecentCallItem,
    CallActivityItem,
    UpcomingFollowUpItem,
    RecentOutcomeItem,
    CallDashboardResponse,
)


def get_dashboard_summary(db: Session, current_user: User) -> CallActivitySummary:
    query = db.query(Call).filter(Call.is_active == True)
    accessible_ids = get_accessible_agent_ids(db, current_user)
    if accessible_ids is not None:
        query = query.filter(Call.agent_id.in_(accessible_ids))

    calls = query.all()

    total_calls = len(calls)
    incoming_calls = sum(1 for c in calls if c.direction == "incoming")
    outgoing_calls = sum(1 for c in calls if c.direction == "outgoing")
    completed_calls = sum(1 for c in calls if c.status == "completed")
    missed_calls = sum(1 for c in calls if c.status == "missed")
    failed_calls = sum(1 for c in calls if c.status == "failed")
    ongoing_calls = sum(1 for c in calls if c.status == "ongoing")

    durations = [c.duration_seconds for c in calls if c.duration_seconds is not None]
    total_duration = sum(durations)
    avg_duration = round(total_duration / len(durations), 2) if durations else 0.0

    return CallActivitySummary(
        total_calls=total_calls,
        incoming_calls=incoming_calls,
        outgoing_calls=outgoing_calls,
        completed_calls=completed_calls,
        missed_calls=missed_calls,
        failed_calls=failed_calls,
        ongoing_calls=ongoing_calls,
        total_duration_seconds=total_duration,
        avg_duration_seconds=avg_duration,
    )


def get_recent_calls(
    db: Session,
    current_user: User,
    skip: int = 0,
    limit: int = 10,
    direction: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
) -> List[RecentCallItem]:
    query = db.query(Call).join(Customer).filter(Call.is_active == True)

    accessible_ids = get_accessible_agent_ids(db, current_user)
    if accessible_ids is not None:
        query = query.filter(Call.agent_id.in_(accessible_ids))

    if direction:
        query = query.filter(Call.direction == direction)
    if status:
        query = query.filter(Call.status == status)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Customer.name.ilike(search_pattern),
                Customer.phone.ilike(search_pattern)
            )
        )

    calls = query.order_by(Call.created_at.desc()).offset(skip).limit(limit).all()

    result: List[RecentCallItem] = []
    for c in calls:
        customer = db.query(Customer).filter(Customer.id == c.customer_id).first()
        agent = db.query(User).filter(User.id == c.agent_id).first()
        outcome = db.query(CallOutcome).filter(CallOutcome.call_id == c.id, CallOutcome.is_active == True).first()

        result.append(
            RecentCallItem(
                call_id=c.id,
                customer_id=c.customer_id,
                customer_name=customer.name if customer else "Unknown Customer",
                customer_phone=customer.phone if customer else "",
                agent_id=c.agent_id,
                agent_name=agent.name if agent else "Unknown Agent",
                direction=c.direction,
                status=c.status,
                duration_seconds=c.duration_seconds,
                start_time=c.start_time,
                end_time=c.end_time,
                outcome=outcome.outcome if outcome else None,
            )
        )

    return result


def get_call_activity(
    db: Session,
    current_user: User,
    skip: int = 0,
    limit: int = 100,
    direction: Optional[str] = None,
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    agent_id: Optional[int] = None,
    search: Optional[str] = None,
) -> List[CallActivityItem]:
    query = db.query(Call).join(Customer).filter(Call.is_active == True)

    accessible_ids = get_accessible_agent_ids(db, current_user)
    if accessible_ids is not None:
        if agent_id is not None:
            if agent_id not in accessible_ids:
                query = query.filter(Call.agent_id == -1)
            else:
                query = query.filter(Call.agent_id == agent_id)
        else:
            query = query.filter(Call.agent_id.in_(accessible_ids))
    elif agent_id is not None:
        query = query.filter(Call.agent_id == agent_id)

    if customer_id is not None:
        query = query.filter(Call.customer_id == customer_id)
    if direction:
        query = query.filter(Call.direction == direction)
    if status:
        query = query.filter(Call.status == status)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Customer.name.ilike(search_pattern),
                Customer.phone.ilike(search_pattern),
                Call.subject.ilike(search_pattern),
                Call.notes.ilike(search_pattern)
            )
        )

    calls = query.order_by(Call.created_at.desc()).offset(skip).limit(limit).all()

    result: List[CallActivityItem] = []
    for c in calls:
        customer = db.query(Customer).filter(Customer.id == c.customer_id).first()
        agent = db.query(User).filter(User.id == c.agent_id).first()
        outcome = db.query(CallOutcome).filter(CallOutcome.call_id == c.id, CallOutcome.is_active == True).first()
        follow_up_count = db.query(FollowUp).filter(FollowUp.call_id == c.id, FollowUp.is_active == True).count()

        result.append(
            CallActivityItem(
                call_id=c.id,
                customer_id=c.customer_id,
                customer_name=customer.name if customer else "Unknown Customer",
                customer_phone=customer.phone if customer else "",
                agent_id=c.agent_id,
                agent_name=agent.name if agent else "Unknown Agent",
                direction=c.direction,
                status=c.status,
                duration_seconds=c.duration_seconds,
                started_at=c.start_time,
                ended_at=c.end_time,
                outcome=outcome.outcome if outcome else None,
                follow_up_count=follow_up_count,
            )
        )

    return result


def get_upcoming_follow_ups(
    db: Session,
    current_user: User,
    skip: int = 0,
    limit: int = 10,
) -> List[UpcomingFollowUpItem]:
    query = db.query(FollowUp).filter(
        FollowUp.is_active == True,
        FollowUp.status.in_(["pending", "in_progress"])
    )

    accessible_ids = get_accessible_agent_ids(db, current_user)
    if accessible_ids is not None:
        query = query.filter(FollowUp.assigned_to.in_(accessible_ids))

    follow_ups = query.order_by(FollowUp.scheduled_at.asc()).offset(skip).limit(limit).all()

    result: List[UpcomingFollowUpItem] = []
    for f in follow_ups:
        customer = db.query(Customer).filter(Customer.id == f.customer_id).first()
        assigned_user = db.query(User).filter(User.id == f.assigned_to).first()

        result.append(
            UpcomingFollowUpItem(
                follow_up_id=f.id,
                call_id=f.call_id,
                customer_id=f.customer_id,
                customer_name=customer.name if customer else "Unknown Customer",
                assigned_to=f.assigned_to,
                assigned_user_name=assigned_user.name if assigned_user else "Unknown User",
                follow_up_type=f.follow_up_type,
                status=f.status,
                scheduled_at=f.scheduled_at,
                notes=f.notes,
            )
        )

    return result


def get_recent_outcomes(
    db: Session,
    current_user: User,
    skip: int = 0,
    limit: int = 10,
) -> List[RecentOutcomeItem]:
    query = db.query(CallOutcome).join(Call).filter(CallOutcome.is_active == True)

    accessible_ids = get_accessible_agent_ids(db, current_user)
    if accessible_ids is not None:
        query = query.filter(or_(Call.agent_id.in_(accessible_ids), CallOutcome.created_by.in_(accessible_ids)))

    outcomes = query.order_by(CallOutcome.created_at.desc()).offset(skip).limit(limit).all()

    result: List[RecentOutcomeItem] = []
    for o in outcomes:
        call = db.query(Call).filter(Call.id == o.call_id).first()
        customer = db.query(Customer).filter(Customer.id == call.customer_id).first() if call else None
        agent = db.query(User).filter(User.id == call.agent_id).first() if call else None

        result.append(
            RecentOutcomeItem(
                outcome_id=o.id,
                call_id=o.call_id,
                customer_id=call.customer_id if call else 0,
                customer_name=customer.name if customer else "Unknown Customer",
                agent_id=call.agent_id if call else 0,
                agent_name=agent.name if agent else "Unknown Agent",
                outcome=o.outcome,
                notes=o.notes,
                created_at=o.created_at,
            )
        )

    return result


def get_call_dashboard(db: Session, current_user: User) -> CallDashboardResponse:
    summary = get_dashboard_summary(db, current_user)
    recent_calls = get_recent_calls(db, current_user, skip=0, limit=10)
    upcoming_follow_ups = get_upcoming_follow_ups(db, current_user, skip=0, limit=10)
    recent_outcomes = get_recent_outcomes(db, current_user, skip=0, limit=10)

    return CallDashboardResponse(
        summary=summary,
        recent_calls=recent_calls,
        upcoming_follow_ups=upcoming_follow_ups,
        recent_outcomes=recent_outcomes,
    )
