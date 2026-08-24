from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.db.database import get_db
from app.models.user import User
from app.schemas.notification import (
    NotificationCreate,
    NotificationResponse,
    NotificationSummaryResponse,
    NotificationTypeEnum,
)
from app.services import notification as notification_service

router = APIRouter()


@router.post("", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED, summary="Create a user notification (Admin/System only)")
def create_notification(
    notification_in: NotificationCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    return notification_service.create_notification(db=db, notification_in=notification_in)


@router.get("", response_model=List[NotificationResponse], summary="List current authenticated user's notifications")
def list_user_notifications(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Max number of items to return"),
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    notification_type: Optional[NotificationTypeEnum] = Query(None, description="Filter by notification type"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return notification_service.get_user_notifications(
        db=db,
        current_user=current_user,
        skip=skip,
        limit=limit,
        is_read=is_read,
        notification_type=notification_type.value if notification_type else None,
    )


@router.get("/summary", response_model=NotificationSummaryResponse, summary="Get unread and total notification counts for current user")
def get_notification_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return notification_service.get_notification_summary(db=db, current_user=current_user)


@router.get("/{notification_id}", response_model=NotificationResponse, summary="Get notification by ID")
def get_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return notification_service.get_notification(db=db, notification_id=notification_id, current_user=current_user)


@router.patch("/{notification_id}/read", response_model=NotificationResponse, summary="Mark a single notification as read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return notification_service.mark_as_read(db=db, notification_id=notification_id, current_user=current_user)


@router.post("/read-all", response_model=NotificationSummaryResponse, summary="Mark all current user's unread notifications as read")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return notification_service.mark_all_as_read(db=db, current_user=current_user)


@router.delete("/{notification_id}", response_model=NotificationResponse, summary="Soft delete notification by ID")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return notification_service.delete_notification(db=db, notification_id=notification_id, current_user=current_user)
