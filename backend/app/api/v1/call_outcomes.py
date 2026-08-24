from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.call_outcome import (
    CallOutcomeCreate,
    CallOutcomeResponse,
    CallOutcomeUpdate,
    OutcomeTypeEnum,
)
from app.services import call_outcome as outcome_service

router = APIRouter()


@router.post("/call-outcomes", response_model=CallOutcomeResponse, status_code=status.HTTP_201_CREATED, summary="Record a call outcome")
def create_call_outcome(
    outcome_in: CallOutcomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return outcome_service.create_call_outcome(db=db, outcome_in=outcome_in, current_user_id=current_user.id)


@router.get("/call-outcomes", response_model=List[CallOutcomeResponse], summary="List call outcomes with filtering, search, and pagination")
def list_call_outcomes(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Max number of items to return"),
    call_id: Optional[int] = Query(None, description="Filter by call ID"),
    created_by: Optional[int] = Query(None, description="Filter by creator user ID"),
    outcome: Optional[OutcomeTypeEnum] = Query(None, description="Filter by outcome type"),
    search: Optional[str] = Query(None, description="Search terms across outcome or notes"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return outcome_service.get_call_outcomes(
        db=db,
        skip=skip,
        limit=limit,
        call_id=call_id,
        created_by=created_by,
        outcome=outcome.value if outcome else None,
        search=search,
    )


@router.get("/call-outcomes/{outcome_id}", response_model=CallOutcomeResponse, summary="Get call outcome by outcome ID")
def get_call_outcome(
    outcome_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    outcome = outcome_service.get_call_outcome(db=db, outcome_id=outcome_id)
    if not outcome:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call outcome not found"
        )
    return outcome


@router.get("/calls/{call_id}/outcome", response_model=CallOutcomeResponse, summary="Get outcome for a specific call ID")
def get_outcome_by_call_id(
    call_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    outcome = outcome_service.get_call_outcome_by_call_id(db=db, call_id=call_id)
    if not outcome:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Outcome for call ID {call_id} not found"
        )
    return outcome


@router.put("/call-outcomes/{outcome_id}", response_model=CallOutcomeResponse, summary="Update call outcome by ID")
def update_call_outcome(
    outcome_id: int,
    outcome_in: CallOutcomeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    outcome = outcome_service.get_call_outcome(db=db, outcome_id=outcome_id)
    if not outcome:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call outcome not found"
        )
    return outcome_service.update_call_outcome(db=db, db_outcome=outcome, outcome_in=outcome_in)


@router.delete("/call-outcomes/{outcome_id}", response_model=CallOutcomeResponse, summary="Soft delete call outcome by ID")
def delete_call_outcome(
    outcome_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    outcome = outcome_service.get_call_outcome(db=db, outcome_id=outcome_id)
    if not outcome:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call outcome not found"
        )
    return outcome_service.delete_call_outcome(db=db, db_outcome=outcome)
