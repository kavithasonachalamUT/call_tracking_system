from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin, require_admin_or_manager
from app.db.database import get_db
from app.models.user import User
from app.schemas.call import (
    CallAssign,
    CallCreate,
    CallDirectionEnum,
    CallPlatformEnum,
    CallResponse,
    CallStatusEnum,
    CallStatusUpdate,
    CallUpdate,
)
from app.services import call as call_service
from app.services import communication as communication_service

router = APIRouter()


@router.post("", response_model=CallResponse, status_code=status.HTTP_201_CREATED, summary="Create a new incoming or outgoing call record")
def create_call(
    call_in: CallCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return call_service.create_call(db=db, call_in=call_in, current_user=current_user)


@router.get("", response_model=List[CallResponse], summary="List call records with filtering, search, and pagination")
def list_calls(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Max number of items to return"),
    direction: Optional[CallDirectionEnum] = Query(None, description="Filter by direction"),
    platform: Optional[CallPlatformEnum] = Query(None, description="Filter by platform"),
    status_filter: Optional[CallStatusEnum] = Query(None, alias="status", description="Filter by status"),
    customer_id: Optional[int] = Query(None, description="Filter by customer ID"),
    agent_id: Optional[int] = Query(None, description="Filter by agent ID (Admin only)"),
    search: Optional[str] = Query(None, description="Search subject, notes, or external_call_id"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return call_service.get_calls(
        db=db,
        current_user=current_user,
        skip=skip,
        limit=limit,
        direction=direction.value if direction else None,
        platform=platform.value if platform else None,
        status_filter=status_filter.value if status_filter else None,
        customer_id=customer_id,
        agent_id=agent_id,
        search=search,
    )


@router.get("/{call_id}", response_model=CallResponse, summary="Get call record by ID")
def get_call(
    call_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return call_service.get_call(db=db, call_id=call_id, current_user=current_user)


@router.put("/{call_id}", response_model=CallResponse, summary="Update call record by ID")
def update_call(
    call_id: int,
    call_in: CallUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    call = call_service.get_call(db=db, call_id=call_id, current_user=current_user)
    return call_service.update_call(db=db, db_call=call, call_in=call_in, current_user=current_user)


@router.post("/{call_id}/start", response_model=CallResponse, summary="Start call and record start timestamp")
def start_call(
    call_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return call_service.start_call(db=db, call_id=call_id, current_user=current_user)


@router.post("/{call_id}/complete", response_model=CallResponse, summary="Complete call and calculate duration")
def complete_call(
    call_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return call_service.complete_call(db=db, call_id=call_id, current_user=current_user)


@router.patch("/{call_id}/status", response_model=CallResponse, summary="Update call lifecycle status")
def update_call_status(
    call_id: int,
    status_in: CallStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return call_service.update_call_status(
        db=db,
        call_id=call_id,
        status_val=status_in.status.value if hasattr(status_in.status, 'value') else status_in.status,
        current_user=current_user
    )


@router.patch("/{call_id}/assign", response_model=CallResponse, summary="Reassign call to an active agent (Admin or Manager)")
def assign_call(
    call_id: int,
    assign_in: CallAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_manager)
):
    return call_service.assign_call(
        db=db,
        call_id=call_id,
        target_agent_id=assign_in.agent_id,
        current_user=current_user
    )


@router.delete("/{call_id}", response_model=CallResponse, summary="Soft delete call record by ID")
def delete_call(
    call_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    call = call_service.get_call(db=db, call_id=call_id, current_user=current_user)
    return call_service.delete_call(db=db, db_call=call)


@router.post("/{call_id}/initiate", response_model=CallResponse, summary="Initiate outgoing call via configured communication provider")
def initiate_call(
    call_id: int,
    provider: Optional[str] = Query(None, description="Optional provider override (e.g., 'mock', 'twilio')"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return communication_service.initiate_outgoing_call(
        db=db,
        call_id=call_id,
        current_user=current_user,
        provider_name=provider
    )
