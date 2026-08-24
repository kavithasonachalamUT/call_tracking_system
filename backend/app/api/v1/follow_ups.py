from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.follow_up import (
    FollowUpCreate,
    FollowUpResponse,
    FollowUpUpdate,
    FollowUpTypeEnum,
    FollowUpStatusEnum,
)
from app.services import follow_up as follow_up_service

router = APIRouter()


@router.post("/follow-ups", response_model=FollowUpResponse, status_code=status.HTTP_201_CREATED, summary="Create a new follow-up")
def create_follow_up(
    follow_up_in: FollowUpCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return follow_up_service.create_follow_up(db=db, follow_up_in=follow_up_in, current_user=current_user)


@router.get("/follow-ups", response_model=List[FollowUpResponse], summary="List follow-ups with filtering, search, and pagination")
def list_follow_ups(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Max number of items to return"),
    call_id: Optional[int] = Query(None, description="Filter by call ID"),
    customer_id: Optional[int] = Query(None, description="Filter by customer ID"),
    assigned_to: Optional[int] = Query(None, description="Filter by assigned user ID"),
    follow_up_type: Optional[FollowUpTypeEnum] = Query(None, description="Filter by follow-up type"),
    status_filter: Optional[FollowUpStatusEnum] = Query(None, alias="status", description="Filter by follow-up status"),
    search: Optional[str] = Query(None, description="Search term across follow-up notes"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return follow_up_service.get_follow_ups(
        db=db,
        skip=skip,
        limit=limit,
        call_id=call_id,
        customer_id=customer_id,
        assigned_to=assigned_to,
        follow_up_type=follow_up_type.value if follow_up_type else None,
        status_filter=status_filter.value if status_filter else None,
        search=search,
        current_user=current_user,
    )


@router.get("/follow-ups/{follow_up_id}", response_model=FollowUpResponse, summary="Get follow-up by ID")
def get_follow_up(
    follow_up_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    follow_up = follow_up_service.get_follow_up(db=db, follow_up_id=follow_up_id, current_user=current_user)
    if not follow_up:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Follow-up not found"
        )
    return follow_up


@router.get("/calls/{call_id}/follow-ups", response_model=List[FollowUpResponse], summary="Get follow-ups for a specific call ID")
def get_follow_ups_by_call_id(
    call_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return follow_up_service.get_follow_ups_by_call_id(db=db, call_id=call_id, current_user=current_user)


@router.put("/follow-ups/{follow_up_id}", response_model=FollowUpResponse, summary="Update follow-up by ID")
def update_follow_up(
    follow_up_id: int,
    follow_up_in: FollowUpUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    follow_up = follow_up_service.get_follow_up(db=db, follow_up_id=follow_up_id, current_user=current_user)
    if not follow_up:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Follow-up not found"
        )
    return follow_up_service.update_follow_up(db=db, db_follow_up=follow_up, follow_up_in=follow_up_in, current_user=current_user)


@router.delete("/follow-ups/{follow_up_id}", response_model=FollowUpResponse, summary="Soft delete follow-up by ID")
def delete_follow_up(
    follow_up_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    follow_up = follow_up_service.get_follow_up(db=db, follow_up_id=follow_up_id, current_user=current_user)
    if not follow_up:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Follow-up not found"
        )
    return follow_up_service.delete_follow_up(db=db, db_follow_up=follow_up, current_user=current_user)
