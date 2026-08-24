from typing import List, Optional
from sqlalchemy import or_
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.call import Call
from app.models.call_outcome import CallOutcome
from app.schemas.call_outcome import CallOutcomeCreate, CallOutcomeUpdate


def get_call_outcome(db: Session, outcome_id: int) -> Optional[CallOutcome]:
    return db.query(CallOutcome).filter(CallOutcome.id == outcome_id, CallOutcome.is_active == True).first()


def get_call_outcome_by_call_id(db: Session, call_id: int) -> Optional[CallOutcome]:
    return db.query(CallOutcome).filter(CallOutcome.call_id == call_id, CallOutcome.is_active == True).first()


def get_call_outcomes(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    call_id: Optional[int] = None,
    created_by: Optional[int] = None,
    outcome: Optional[str] = None,
    search: Optional[str] = None,
) -> List[CallOutcome]:
    query = db.query(CallOutcome).filter(CallOutcome.is_active == True)

    if call_id is not None:
        query = query.filter(CallOutcome.call_id == call_id)
    if created_by is not None:
        query = query.filter(CallOutcome.created_by == created_by)
    if outcome is not None:
        query = query.filter(CallOutcome.outcome == outcome)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                CallOutcome.outcome.ilike(search_pattern),
                CallOutcome.notes.ilike(search_pattern)
            )
        )

    return query.offset(skip).limit(limit).all()


def create_call_outcome(db: Session, outcome_in: CallOutcomeCreate, current_user_id: int) -> CallOutcome:
    # 1. Verify call exists
    call = db.query(Call).filter(Call.id == outcome_in.call_id).first()
    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Call with ID {outcome_in.call_id} not found"
        )

    # 2. Verify call is active
    if not call.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot record an outcome for an inactive call"
        )

    # 3. Verify call status is completed
    if call.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An outcome can only be recorded for a completed call (current call status: '{call.status}')"
        )

    # 4. Prevent multiple outcomes for the same call
    existing_outcome = db.query(CallOutcome).filter(CallOutcome.call_id == outcome_in.call_id).first()
    if existing_outcome:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An outcome has already been recorded for call ID {outcome_in.call_id}"
        )

    outcome_str = outcome_in.outcome.value if hasattr(outcome_in.outcome, 'value') else outcome_in.outcome

    db_outcome = CallOutcome(
        call_id=outcome_in.call_id,
        outcome=outcome_str,
        notes=outcome_in.notes,
        created_by=current_user_id,
        is_active=True,
    )
    db.add(db_outcome)
    db.commit()
    db.refresh(db_outcome)
    return db_outcome


def update_call_outcome(db: Session, db_outcome: CallOutcome, outcome_in: CallOutcomeUpdate) -> CallOutcome:
    update_data = outcome_in.model_dump(exclude_unset=True)

    # Do not allow modifying protected fields if passed
    update_data.pop("id", None)
    update_data.pop("call_id", None)
    update_data.pop("created_by", None)
    update_data.pop("created_at", None)

    for field, value in update_data.items():
        if hasattr(value, 'value'):
            value = value.value
        setattr(db_outcome, field, value)

    db.commit()
    db.refresh(db_outcome)
    return db_outcome


def delete_call_outcome(db: Session, db_outcome: CallOutcome) -> CallOutcome:
    """Soft deletion: sets is_active = False preserving historical outcome data."""
    db_outcome.is_active = False
    db.commit()
    db.refresh(db_outcome)
    return db_outcome
