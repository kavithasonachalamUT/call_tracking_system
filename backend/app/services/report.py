import csv
import io
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy import or_
from sqlalchemy.orm import Session
from fastapi.responses import StreamingResponse

from app.api.deps import get_accessible_agent_ids
from app.models.call import Call
from app.models.customer import Customer
from app.models.user import User
from app.models.platform import Platform
from app.models.call_outcome import CallOutcome
from app.models.follow_up import FollowUp
from app.models.audit_log import AuditLog
from app.schemas.report import (
    CallReportItem,
    CustomerReportItem,
    OutcomeReportItem,
    FollowUpReportItem,
    AgentPerformanceReportItem,
    AuditReportItem,
    ReportSummaryResponse,
)


def apply_date_range(query: Any, date_column: Any, start_date: Optional[datetime], end_date: Optional[datetime]) -> Any:
    if start_date:
        query = query.filter(date_column >= start_date)
    if end_date:
        query = query.filter(date_column <= end_date)
    return query


def generate_csv_stream(data: List[Dict[str, Any]], fieldnames: List[str]):
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for row in data:
        writer.writerow(row)
    output.seek(0)
    return output


def export_to_csv_response(items: List[Any], fieldnames: List[str], filename: str) -> StreamingResponse:
    raw_data = []
    for item in items:
        if hasattr(item, "model_dump"):
            d = item.model_dump()
        elif isinstance(item, dict):
            d = item
        else:
            d = item.__dict__

        formatted_row = {}
        for k, v in d.items():
            if isinstance(v, datetime):
                formatted_row[k] = v.isoformat()
            else:
                formatted_row[k] = "" if v is None else str(v)
        raw_data.append(formatted_row)

    csv_output = generate_csv_stream(raw_data, fieldnames)
    response = StreamingResponse(iter([csv_output.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename={filename}"
    return response


def get_call_report(
    db: Session,
    current_user: User,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    agent_id: Optional[int] = None,
    direction: Optional[str] = None,
    status: Optional[str] = None,
    platform: Optional[str] = None,
    customer_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[CallReportItem]:
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

    query = apply_date_range(query, Call.created_at, start_date, end_date)

    if customer_id is not None:
        query = query.filter(Call.customer_id == customer_id)
    if direction:
        query = query.filter(Call.direction == direction)
    if status:
        query = query.filter(Call.status == status)

    if platform:
        platform_obj = db.query(Platform).filter(Platform.code == platform).first()
        if platform_obj:
            query = query.filter(Call.platform_id == platform_obj.id)

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

    result: List[CallReportItem] = []
    for c in calls:
        customer = db.query(Customer).filter(Customer.id == c.customer_id).first()
        agent = db.query(User).filter(User.id == c.agent_id).first()
        platform_obj = db.query(Platform).filter(Platform.id == c.platform_id).first()

        result.append(
            CallReportItem(
                call_id=c.id,
                customer_id=c.customer_id,
                customer_name=customer.name if customer else "Unknown Customer",
                customer_phone=customer.phone if customer else "",
                agent_id=c.agent_id,
                agent_name=agent.name if agent else "Unknown Agent",
                direction=c.direction,
                platform=platform_obj.code if platform_obj else "unknown",
                status=c.status,
                duration_seconds=c.duration_seconds,
                started_at=c.start_time,
                ended_at=c.end_time,
                created_at=c.created_at,
            )
        )

    return result


def get_customer_report(
    db: Session,
    current_user: User,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[CustomerReportItem]:
    query = db.query(Customer).filter(Customer.is_active == True)
    query = apply_date_range(query, Customer.created_at, start_date, end_date)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Customer.name.ilike(search_pattern),
                Customer.phone.ilike(search_pattern),
                Customer.email.ilike(search_pattern),
                Customer.company.ilike(search_pattern)
            )
        )

    customers = query.order_by(Customer.created_at.desc()).offset(skip).limit(limit).all()

    return [
        CustomerReportItem(
            customer_id=c.id,
            name=c.name,
            phone=c.phone,
            email=c.email,
            company=c.company,
            is_active=c.is_active,
            created_at=c.created_at,
        )
        for c in customers
    ]


def get_outcome_report(
    db: Session,
    current_user: User,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    agent_id: Optional[int] = None,
    outcome_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[OutcomeReportItem]:
    query = db.query(CallOutcome).join(Call).filter(CallOutcome.is_active == True)

    accessible_ids = get_accessible_agent_ids(db, current_user)
    if accessible_ids is not None:
        if agent_id is not None:
            if agent_id not in accessible_ids:
                query = query.filter(CallOutcome.created_by == -1)
            else:
                query = query.filter(CallOutcome.created_by == agent_id)
        else:
            query = query.filter(CallOutcome.created_by.in_(accessible_ids))
    elif agent_id is not None:
        query = query.filter(CallOutcome.created_by == agent_id)

    query = apply_date_range(query, CallOutcome.created_at, start_date, end_date)

    if outcome_type:
        query = query.filter(CallOutcome.outcome == outcome_type)

    outcomes = query.order_by(CallOutcome.created_at.desc()).offset(skip).limit(limit).all()

    result: List[OutcomeReportItem] = []
    for o in outcomes:
        call = db.query(Call).filter(Call.id == o.call_id).first()
        customer = db.query(Customer).filter(Customer.id == call.customer_id).first() if call else None
        agent = db.query(User).filter(User.id == o.created_by).first()

        result.append(
            OutcomeReportItem(
                outcome_id=o.id,
                call_id=o.call_id,
                customer_id=call.customer_id if call else 0,
                customer_name=customer.name if customer else "Unknown Customer",
                agent_id=o.created_by,
                agent_name=agent.name if agent else "Unknown Agent",
                outcome=o.outcome,
                notes=o.notes,
                created_at=o.created_at,
            )
        )

    return result


def get_follow_up_report(
    db: Session,
    current_user: User,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    agent_id: Optional[int] = None,
    status: Optional[str] = None,
    follow_up_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[FollowUpReportItem]:
    query = db.query(FollowUp).filter(FollowUp.is_active == True)

    accessible_ids = get_accessible_agent_ids(db, current_user)
    if accessible_ids is not None:
        if agent_id is not None:
            if agent_id not in accessible_ids:
                query = query.filter(FollowUp.assigned_to == -1)
            else:
                query = query.filter(FollowUp.assigned_to == agent_id)
        else:
            query = query.filter(FollowUp.assigned_to.in_(accessible_ids))
    elif agent_id is not None:
        query = query.filter(FollowUp.assigned_to == agent_id)

    query = apply_date_range(query, FollowUp.created_at, start_date, end_date)

    if status:
        query = query.filter(FollowUp.status == status)
    if follow_up_type:
        query = query.filter(FollowUp.follow_up_type == follow_up_type)

    follow_ups = query.order_by(FollowUp.created_at.desc()).offset(skip).limit(limit).all()

    result: List[FollowUpReportItem] = []
    for f in follow_ups:
        customer = db.query(Customer).filter(Customer.id == f.customer_id).first()
        agent = db.query(User).filter(User.id == f.assigned_to).first()

        result.append(
            FollowUpReportItem(
                follow_up_id=f.id,
                call_id=f.call_id,
                customer_id=f.customer_id,
                customer_name=customer.name if customer else "Unknown Customer",
                assigned_to=f.assigned_to,
                assigned_user_name=agent.name if agent else "Unknown User",
                follow_up_type=f.follow_up_type,
                status=f.status,
                scheduled_at=f.scheduled_at,
                completed_at=f.completed_at,
                notes=f.notes,
                created_at=f.created_at,
            )
        )

    return result


def get_agent_performance_report(
    db: Session,
    current_user: User,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    agent_id: Optional[int] = None,
) -> List[AgentPerformanceReportItem]:
    accessible_ids = get_accessible_agent_ids(db, current_user)
    if accessible_ids is None:
        if agent_id is not None:
            users = db.query(User).filter(User.id == agent_id, User.is_active == True).all()
        else:
            users = db.query(User).filter(User.is_active == True).all()
    else:
        if agent_id is not None:
            if agent_id not in accessible_ids:
                users = []
            else:
                users = db.query(User).filter(User.id == agent_id, User.is_active == True).all()
        else:
            users = db.query(User).filter(User.id.in_(accessible_ids), User.is_active == True).all()

    report: List[AgentPerformanceReportItem] = []

    for u in users:
        call_query = db.query(Call).filter(Call.agent_id == u.id, Call.is_active == True)
        call_query = apply_date_range(call_query, Call.created_at, start_date, end_date)
        calls = call_query.all()

        total_calls = len(calls)
        incoming_calls = sum(1 for c in calls if c.direction == "incoming")
        outgoing_calls = sum(1 for c in calls if c.direction == "outgoing")
        completed_calls = sum(1 for c in calls if c.status == "completed")
        missed_calls = sum(1 for c in calls if c.status == "missed")
        failed_calls = sum(1 for c in calls if c.status == "failed")

        durations = [c.duration_seconds for c in calls if c.duration_seconds is not None]
        total_duration = sum(durations)
        avg_duration = round(total_duration / len(durations), 2) if durations else 0.0

        outcome_query = db.query(CallOutcome).filter(CallOutcome.created_by == u.id, CallOutcome.is_active == True)
        outcome_query = apply_date_range(outcome_query, CallOutcome.created_at, start_date, end_date)
        outcomes_recorded = outcome_query.count()

        fu_query = db.query(FollowUp).filter(FollowUp.assigned_to == u.id, FollowUp.is_active == True)
        fu_query = apply_date_range(fu_query, FollowUp.created_at, start_date, end_date)
        follow_ups_assigned = fu_query.count()

        report.append(
            AgentPerformanceReportItem(
                agent_id=u.id,
                agent_name=u.name,
                agent_email=u.email,
                total_calls=total_calls,
                incoming_calls=incoming_calls,
                outgoing_calls=outgoing_calls,
                completed_calls=completed_calls,
                missed_calls=missed_calls,
                failed_calls=failed_calls,
                total_duration_seconds=total_duration,
                average_duration_seconds=avg_duration,
                outcomes_recorded=outcomes_recorded,
                follow_ups_assigned=follow_ups_assigned,
            )
        )

    return report


def get_audit_report(
    db: Session,
    current_user: User,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    user_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[AuditReportItem]:
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

    query = apply_date_range(query, AuditLog.created_at, start_date, end_date)

    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)

    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()

    result: List[AuditReportItem] = []
    for l in logs:
        user_obj = db.query(User).filter(User.id == l.user_id).first() if l.user_id else None

        result.append(
            AuditReportItem(
                audit_id=l.id,
                user_id=l.user_id,
                user_name=user_obj.name if user_obj else None,
                action=l.action,
                entity_type=l.entity_type,
                entity_id=l.entity_id,
                description=l.description,
                created_at=l.created_at,
            )
        )

    return result


def get_report_summary(
    db: Session,
    current_user: User,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> ReportSummaryResponse:
    accessible_ids = get_accessible_agent_ids(db, current_user)

    call_query = db.query(Call).filter(Call.is_active == True)
    if accessible_ids is not None:
        call_query = call_query.filter(Call.agent_id.in_(accessible_ids))
    call_query = apply_date_range(call_query, Call.created_at, start_date, end_date)
    calls = call_query.all()

    total_calls = len(calls)
    durations = [c.duration_seconds for c in calls if c.duration_seconds is not None]
    total_duration = sum(durations)

    cust_query = db.query(Customer).filter(Customer.is_active == True)
    cust_query = apply_date_range(cust_query, Customer.created_at, start_date, end_date)
    total_customers = cust_query.count()

    outcome_query = db.query(CallOutcome).filter(CallOutcome.is_active == True)
    if accessible_ids is not None:
        outcome_query = outcome_query.filter(CallOutcome.created_by.in_(accessible_ids))
    outcome_query = apply_date_range(outcome_query, CallOutcome.created_at, start_date, end_date)
    total_outcomes = outcome_query.count()

    fu_query = db.query(FollowUp).filter(FollowUp.is_active == True)
    if accessible_ids is not None:
        fu_query = fu_query.filter(FollowUp.assigned_to.in_(accessible_ids))
    fu_query = apply_date_range(fu_query, FollowUp.created_at, start_date, end_date)
    total_follow_ups = fu_query.count()

    return ReportSummaryResponse(
        total_calls=total_calls,
        total_customers=total_customers,
        total_outcomes=total_outcomes,
        total_follow_ups=total_follow_ups,
        total_duration_seconds=total_duration,
        start_date=start_date,
        end_date=end_date,
    )
