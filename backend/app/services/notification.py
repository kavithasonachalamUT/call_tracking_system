from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationCreate, NotificationSummaryResponse


def validate_user_active(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send notification to an inactive user"
        )
    return user


def create_notification(db: Session, notification_in: NotificationCreate) -> Notification:
    validate_user_active(db, notification_in.user_id)

    type_str = notification_in.notification_type.value if hasattr(notification_in.notification_type, 'value') else notification_in.notification_type
    ref_type_str = notification_in.reference_type.value if (notification_in.reference_type and hasattr(notification_in.reference_type, 'value')) else notification_in.reference_type

    db_notification = Notification(
        user_id=notification_in.user_id,
        notification_type=type_str,
        title=notification_in.title,
        message=notification_in.message,
        reference_type=ref_type_str,
        reference_id=notification_in.reference_id,
        is_read=False,
        read_at=None,
        is_active=True,
    )
    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)
    return db_notification


def get_notification(db: Session, notification_id: int, current_user: User) -> Notification:
    notification = db.query(Notification).filter(Notification.id == notification_id, Notification.is_active == True).first()
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    if current_user.role != "admin" and notification.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this notification"
        )
    return notification


def get_user_notifications(
    db: Session,
    current_user: User,
    skip: int = 0,
    limit: int = 100,
    is_read: Optional[bool] = None,
    notification_type: Optional[str] = None,
) -> List[Notification]:
    query = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_active == True
    )

    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)
    if notification_type:
        query = query.filter(Notification.notification_type == notification_type)

    return query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()


def get_notification_summary(db: Session, current_user: User) -> NotificationSummaryResponse:
    query = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_active == True
    )

    total_count = query.count()
    unread_count = query.filter(Notification.is_read == False).count()

    return NotificationSummaryResponse(
        unread_count=unread_count,
        total_count=total_count,
    )


def mark_as_read(db: Session, notification_id: int, current_user: User) -> Notification:
    notification = get_notification(db, notification_id=notification_id, current_user=current_user)

    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(notification)

    return notification


def mark_all_as_read(db: Session, current_user: User) -> NotificationSummaryResponse:
    now = datetime.now(timezone.utc)
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
        Notification.is_active == True
    ).update({"is_read": True, "read_at": now}, synchronize_session=False)

    db.commit()
    return get_notification_summary(db, current_user)


def delete_notification(db: Session, notification_id: int, current_user: User) -> Notification:
    """Soft deletion: sets is_active = False preserving notification record history."""
    notification = get_notification(db, notification_id=notification_id, current_user=current_user)
    notification.is_active = False
    db.commit()
    db.refresh(notification)
    return notification
