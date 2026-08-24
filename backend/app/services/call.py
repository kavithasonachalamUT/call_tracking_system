from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import or_
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.api.deps import get_accessible_agent_ids
from app.models.call import Call
from app.models.customer import Customer
from app.models.user import User
from app.models.platform import Platform
from app.schemas.call import CallCreate, CallUpdate


def get_or_create_platform_by_code(db: Session, platform_code: str) -> Platform:
    platform = db.query(Platform).filter(Platform.code == platform_code).first()
    if not platform:
        # Auto-seed missing platform record
        name_map = {
            "phone": "Phone",
            "whatsapp": "WhatsApp",
            "google_meet": "Google Meet",
            "microsoft_teams": "Microsoft Teams",
            "zoom": "Zoom",
            "other": "Other Communication"
        }
        platform = Platform(
            name=name_map.get(platform_code, platform_code.capitalize()),
            code=platform_code,
            description=f"{platform_code.capitalize()} communication platform",
            is_active=True
        )
        db.add(platform)
        db.commit()
        db.refresh(platform)
    return platform


def validate_customer_active(db: Session, customer_id: int) -> Customer:
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {customer_id} not found"
        )
    if not customer.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot associate call with an inactive customer"
        )
    return customer


def validate_agent_active(db: Session, agent_id: int) -> User:
    agent = db.query(User).filter(User.id == agent_id).first()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent with ID {agent_id} not found"
        )
    if not agent.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign call to an inactive agent"
        )
    return agent


def make_naive(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is not None and dt.tzinfo is not None:
        return dt.replace(tzinfo=None)
    return dt


def calculate_duration_from_times(start_time: Optional[datetime], end_time: Optional[datetime]) -> Optional[int]:
    if start_time and end_time:
        s_naive = make_naive(start_time)
        e_naive = make_naive(end_time)
        if e_naive and s_naive:
            duration = int((e_naive - s_naive).total_seconds())
            if duration < 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="End time cannot be earlier than start time (negative duration)"
                )
            return duration
    return None


def create_call(db: Session, call_in: CallCreate, current_user: User) -> Call:
    # 1. Validate Customer
    validate_customer_active(db, call_in.customer_id)

    # 2. Resolve Platform
    platform_code = call_in.platform.value if hasattr(call_in.platform, 'value') else call_in.platform
    platform_obj = get_or_create_platform_by_code(db, platform_code)

    # 3. Determine and Validate Agent
    accessible_ids = get_accessible_agent_ids(db, current_user)
    if call_in.agent_id is not None:
        if accessible_ids is not None and call_in.agent_id not in accessible_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot assign call to an agent outside your authorized team"
            )
        assigned_agent_id = call_in.agent_id
    else:
        assigned_agent_id = current_user.id

    validate_agent_active(db, assigned_agent_id)

    # 4. Map call_type string
    video_platforms = {"google_meet", "microsoft_teams", "zoom"}
    call_type_str = "video" if platform_code in video_platforms else "phone"

    direction_str = call_in.direction.value if hasattr(call_in.direction, 'value') else call_in.direction
    status_str = call_in.status.value if hasattr(call_in.status, 'value') else call_in.status

    db_call = Call(
        customer_id=call_in.customer_id,
        agent_id=assigned_agent_id,
        platform_id=platform_obj.id,
        call_type=call_type_str,
        direction=direction_str,
        status=status_str,
        start_time=call_in.started_at,
        end_time=None,
        duration_seconds=None,
        subject=call_in.subject,
        notes=call_in.notes,
        external_call_id=call_in.external_call_id,
        meeting_url=call_in.meeting_url,
        recording_url=call_in.recording_url,
        is_active=True,
    )
    db.add(db_call)
    db.commit()
    db.refresh(db_call)
    return db_call


def get_call(db: Session, call_id: int, current_user: User) -> Call:
    call = db.query(Call).filter(Call.id == call_id, Call.is_active == True).first()
    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call record not found"
        )

    accessible_ids = get_accessible_agent_ids(db, current_user)
    if accessible_ids is not None and call.agent_id not in accessible_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this call record"
        )
    return call


def get_calls(
    db: Session,
    current_user: User,
    skip: int = 0,
    limit: int = 100,
    direction: Optional[str] = None,
    platform: Optional[str] = None,
    status_filter: Optional[str] = None,
    customer_id: Optional[int] = None,
    agent_id: Optional[int] = None,
    search: Optional[str] = None,
) -> List[Call]:
    query = db.query(Call).filter(Call.is_active == True)

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
    if status_filter:
        query = query.filter(Call.status == status_filter)

    if platform:
        platform_obj = db.query(Platform).filter(Platform.code == platform).first()
        if platform_obj:
            query = query.filter(Call.platform_id == platform_obj.id)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Call.subject.ilike(search_pattern),
                Call.notes.ilike(search_pattern),
                Call.external_call_id.ilike(search_pattern)
            )
        )

    return query.order_by(Call.created_at.desc()).offset(skip).limit(limit).all()


def start_call(db: Session, call_id: int, current_user: User) -> Call:
    call = get_call(db, call_id=call_id, current_user=current_user)

    if call.status in ["completed", "cancelled", "failed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot start a call that is already in '{call.status}' status"
        )

    call.status = "ongoing"
    if call.start_time is None:
        call.start_time = datetime.now(timezone.utc)

    db.commit()
    db.refresh(call)
    return call


def update_call_status(db: Session, call_id: int, status_val: str, current_user: User) -> Call:
    call = get_call(db, call_id=call_id, current_user=current_user)

    call.status = status_val
    if status_val == "completed":
        if call.end_time is None:
            call.end_time = datetime.now(timezone.utc)
        if call.start_time:
            call.duration_seconds = calculate_duration_from_times(call.start_time, call.end_time)

    db.commit()
    db.refresh(call)
    return call


def complete_call(db: Session, call_id: int, current_user: User) -> Call:
    call = get_call(db, call_id=call_id, current_user=current_user)

    call.status = "completed"
    if call.start_time is None:
        call.start_time = datetime.now(timezone.utc)
    if call.end_time is None:
        call.end_time = datetime.now(timezone.utc)

    call.duration_seconds = calculate_duration_from_times(call.start_time, call.end_time)

    db.commit()
    db.refresh(call)
    return call


def assign_call(db: Session, call_id: int, target_agent_id: int, current_user: User) -> Call:
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or Manager privileges required to reassign calls"
        )

    call = db.query(Call).filter(Call.id == call_id, Call.is_active == True).first()
    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call record not found"
        )

    accessible_ids = get_accessible_agent_ids(db, current_user)
    if accessible_ids is not None:
        if call.agent_id not in accessible_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot reassign a call outside your authorized team"
            )
        if target_agent_id not in accessible_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot reassign call to an agent outside your authorized team"
            )

    validate_agent_active(db, target_agent_id)

    call.agent_id = target_agent_id
    db.commit()
    db.refresh(call)
    return call


def update_call(db: Session, db_call: Call, call_in: CallUpdate, current_user: User) -> Call:
    accessible_ids = get_accessible_agent_ids(db, current_user)
    if accessible_ids is not None and db_call.agent_id not in accessible_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to update this call record"
        )

    update_data = call_in.model_dump(exclude_unset=True)

    if "agent_id" in update_data:
        target_agent = update_data["agent_id"]
        if accessible_ids is not None:
            if target_agent not in accessible_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot reassign call to an agent outside your authorized team"
                )
        validate_agent_active(db, target_agent)

    for field, value in update_data.items():
        if hasattr(value, 'value'):
            value = value.value
        setattr(db_call, field, value)

    if db_call.status == "completed":
        if db_call.end_time is None:
            db_call.end_time = datetime.now(timezone.utc)
        if db_call.start_time:
            db_call.duration_seconds = calculate_duration_from_times(db_call.start_time, db_call.end_time)

    db.commit()
    db.refresh(db_call)
    return db_call


def delete_call(db: Session, db_call: Call) -> Call:
    """Soft deletion: sets is_active = False preserving historical call data."""
    db_call.is_active = False
    db.commit()
    db.refresh(db_call)
    return db_call
