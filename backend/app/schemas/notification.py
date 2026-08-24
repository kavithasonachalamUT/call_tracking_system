from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class NotificationTypeEnum(str, Enum):
    CALL_ASSIGNED = "call_assigned"
    FOLLOW_UP_REMINDER = "follow_up_reminder"
    CALL_OUTCOME_RECORDED = "call_outcome_recorded"
    SYSTEM_ALERT = "system_alert"
    OTHER = "other"


class ReferenceTypeEnum(str, Enum):
    CALL = "call"
    FOLLOW_UP = "follow_up"
    OUTCOME = "outcome"
    CUSTOMER = "customer"
    SYSTEM = "system"
    OTHER = "other"


class NotificationBase(BaseModel):
    notification_type: NotificationTypeEnum
    title: str = Field(..., max_length=255)
    message: str
    reference_type: Optional[ReferenceTypeEnum] = None
    reference_id: Optional[int] = None


class NotificationCreate(NotificationBase):
    user_id: int


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    notification_type: str
    title: str
    message: str
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    is_read: bool
    read_at: Optional[datetime] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationSummaryResponse(BaseModel):
    unread_count: int
    total_count: int
