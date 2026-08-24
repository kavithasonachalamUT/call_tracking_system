from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import or_
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.api.deps import get_accessible_agent_ids
from app.models.call import Call
from app.models.customer import Customer
from app.models.user import User
from app.models.follow_up import FollowUp
from app.schemas.follow_up import FollowUpCreate, FollowUpUpdate


def validate_assigned_user(db: Session, user_id: int) -> User:
    assigned_user = db.query(User).filter(User.id == user_id).first()
    if not assigned_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assigned user with ID {user_id} not found"
        )
    if not assigned_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign follow-up to an inactive user"
        )
    return assigned_user


def make_naive(dt: Optional[datetime]) -> Optional[datetime]:
    """Helper to convert offset-aware datetimes to naive UTC for safe DB comparisons."""
    if dt is not None and dt.tzinfo is not None:
        return dt.replace(tzinfo=None)
    return dt


def validate_dates_and_status(scheduled_at: datetime, completed_at: Optional[datetime], status_val: str) -> Optional[datetime]:
    if status_val == "completed" and completed_at is None:
        completed_at = datetime.now(timezone.utc)

    if completed_at is not None:
        sched_cmp = make_naive(scheduled_at)
        comp_cmp = make_naive(completed_at)
        if comp_cmp and sched_cmp and comp_cmp < sched_cmp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="completed_at cannot be earlier than scheduled_at"
            )

    return completed_at


def get_follow_up(db: Session, follow_up_id: int, current_user: Optional[User] = None) -> Optional[FollowUp]:
    follow_up = db.query(FollowUp).filter(FollowUp.id == follow_up_id, FollowUp.is_active == True).first()
    if not follow_up:
        return None
    if current_user:
        accessible_ids = get_accessible_agent_ids(db, current_user)
        if accessible_ids is not None and follow_up.assigned_to not in accessible_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this follow-up record"
            )
    return follow_up


def get_follow_ups_by_call_id(db: Session, call_id: int, current_user: Optional[User] = None) -> List[FollowUp]:
    query = db.query(FollowUp).filter(FollowUp.call_id == call_id, FollowUp.is_active == True)
    if current_user:
        accessible_ids = get_accessible_agent_ids(db, current_user)
        if accessible_ids is not None:
            query = query.filter(FollowUp.assigned_to.in_(accessible_ids))
    return query.all()


def get_follow_ups(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    call_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    assigned_to: Optional[int] = None,
    follow_up_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    current_user: Optional[User] = None,
) -> List[FollowUp]:
    query = db.query(FollowUp).filter(FollowUp.is_active == True)

    if current_user:
        accessible_ids = get_accessible_agent_ids(db, current_user)
        if accessible_ids is not None:
            if assigned_to is not None:
                if assigned_to not in accessible_ids:
                    query = query.filter(FollowUp.assigned_to == -1)
                else:
                    query = query.filter(FollowUp.assigned_to == assigned_to)
            else:
                query = query.filter(FollowUp.assigned_to.in_(accessible_ids))
        elif assigned_to is not None:
            query = query.filter(FollowUp.assigned_to == assigned_to)
    elif assigned_to is not None:
        query = query.filter(FollowUp.assigned_to == assigned_to)

    if call_id is not None:
        query = query.filter(FollowUp.call_id == call_id)
    if customer_id is not None:
        query = query.filter(FollowUp.customer_id == customer_id)
    if follow_up_type is not None:
        query = query.filter(FollowUp.follow_up_type == follow_up_type)
    if status_filter is not None:
        query = query.filter(FollowUp.status == status_filter)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(FollowUp.notes.ilike(search_pattern))

    return query.offset(skip).limit(limit).all()


def create_follow_up(db: Session, follow_up_in: FollowUpCreate, current_user: User) -> FollowUp:
    # A & B. Verify Call exists and is active
    call = db.query(Call).filter(Call.id == follow_up_in.call_id).first()
    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Call with ID {follow_up_in.call_id} not found"
        )
    if not call.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot associate follow-up with an inactive call"
        )

    # Scoping check on Call and Assigned User
    accessible_ids = get_accessible_agent_ids(db, current_user)
    if accessible_ids is not None:
        if call.agent_id not in accessible_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot create follow-up for a call outside your authorized team"
            )
        if follow_up_in.assigned_to not in accessible_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot assign follow-up to a user outside your authorized team"
            )

    # C & D. Verify Customer exists and is active
    customer = db.query(Customer).filter(Customer.id == follow_up_in.customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {follow_up_in.customer_id} not found"
        )
    if not customer.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot associate follow-up with an inactive customer"
        )

    # E & F. Verify Assigned User exists and is active
    validate_assigned_user(db, follow_up_in.assigned_to)

    # G. Verify customer/call relationship match
    if follow_up_in.customer_id != call.customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Customer does not match the customer associated with this call"
        )

    # Date and Status logic
    status_str = follow_up_in.status.value if hasattr(follow_up_in.status, 'value') else follow_up_in.status
    type_str = follow_up_in.follow_up_type.value if hasattr(follow_up_in.follow_up_type, 'value') else follow_up_in.follow_up_type
    completed_at = validate_dates_and_status(follow_up_in.scheduled_at, follow_up_in.completed_at, status_str)

    db_follow_up = FollowUp(
        call_id=follow_up_in.call_id,
        customer_id=follow_up_in.customer_id,
        assigned_to=follow_up_in.assigned_to,
        follow_up_type=type_str,
        status=status_str,
        scheduled_at=follow_up_in.scheduled_at,
        completed_at=completed_at,
        notes=follow_up_in.notes,
        created_by=current_user.id,
        is_active=True,
    )
    db.add(db_follow_up)
    db.commit()
    db.refresh(db_follow_up)
    return db_follow_up


def update_follow_up(db: Session, db_follow_up: FollowUp, follow_up_in: FollowUpUpdate, current_user: Optional[User] = None) -> FollowUp:
    if current_user:
        accessible_ids = get_accessible_agent_ids(db, current_user)
        if accessible_ids is not None and db_follow_up.assigned_to not in accessible_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to update this follow-up record"
            )

    update_data = follow_up_in.model_dump(exclude_unset=True)

    # Prevent changing protected fields
    update_data.pop("id", None)
    update_data.pop("call_id", None)
    update_data.pop("customer_id", None)
    update_data.pop("created_by", None)
    update_data.pop("created_at", None)

    # Validate assigned_to user if changing
    if "assigned_to" in update_data:
        target_user = update_data["assigned_to"]
        if current_user:
            accessible_ids = get_accessible_agent_ids(db, current_user)
            if accessible_ids is not None and target_user not in accessible_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot assign follow-up to a user outside your authorized team"
                )
        validate_assigned_user(db, target_user)

    # Extract target status and dates
    target_status = update_data.get("status", db_follow_up.status)
    if hasattr(target_status, 'value'):
        target_status = target_status.value

    target_scheduled_at = update_data.get("scheduled_at", db_follow_up.scheduled_at)
    target_completed_at = update_data.get("completed_at", db_follow_up.completed_at)

    if "status" in update_data or "scheduled_at" in update_data or "completed_at" in update_data:
        new_completed_at = validate_dates_and_status(target_scheduled_at, target_completed_at, target_status)
        update_data["completed_at"] = new_completed_at

    for field, value in update_data.items():
        if hasattr(value, 'value'):
            value = value.value
        setattr(db_follow_up, field, value)

    db.commit()
    db.refresh(db_follow_up)
    return db_follow_up


def delete_follow_up(db: Session, db_follow_up: FollowUp, current_user: Optional[User] = None) -> FollowUp:
    """Soft deletion: sets is_active = False preserving historical follow-up records."""
    if current_user:
        accessible_ids = get_accessible_agent_ids(db, current_user)
        if accessible_ids is not None and db_follow_up.assigned_to not in accessible_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to delete this follow-up record"
            )
    db_follow_up.is_active = False
    db.commit()
    db.refresh(db_follow_up)
    return db_follow_up
