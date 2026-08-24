from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, ConfigDict


class FollowUpTypeEnum(str, Enum):
    CALLBACK = "callback"
    EMAIL = "email"
    DEMO = "demo"
    MEETING = "meeting"
    WHATSAPP = "whatsapp"
    OTHER = "other"


class FollowUpStatusEnum(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    OVERDUE = "overdue"


class FollowUpBase(BaseModel):
    call_id: int
    customer_id: int
    assigned_to: int
    follow_up_type: FollowUpTypeEnum
    status: FollowUpStatusEnum = FollowUpStatusEnum.PENDING
    scheduled_at: datetime
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    is_active: bool = True


class FollowUpCreate(BaseModel):
    call_id: int
    customer_id: int
    assigned_to: int
    follow_up_type: FollowUpTypeEnum
    status: FollowUpStatusEnum = FollowUpStatusEnum.PENDING
    scheduled_at: datetime
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None


class FollowUpUpdate(BaseModel):
    assigned_to: Optional[int] = None
    follow_up_type: Optional[FollowUpTypeEnum] = None
    status: Optional[FollowUpStatusEnum] = None
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class FollowUpResponse(FollowUpBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
