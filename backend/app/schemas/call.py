from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class CallPlatformEnum(str, Enum):
    PHONE = "phone"
    WHATSAPP = "whatsapp"
    GOOGLE_MEET = "google_meet"
    MICROSOFT_TEAMS = "microsoft_teams"
    ZOOM = "zoom"
    OTHER = "other"


class CallTypeEnum(str, Enum):
    PHONE = "phone"
    VIDEO = "video"
    MEETING = "meeting"


class CallDirectionEnum(str, Enum):
    INCOMING = "incoming"
    OUTGOING = "outgoing"


class CallStatusEnum(str, Enum):
    INITIATED = "initiated"
    RINGING = "ringing"
    ONGOING = "ongoing"
    COMPLETED = "completed"
    MISSED = "missed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class CallBase(BaseModel):
    customer_id: int
    direction: CallDirectionEnum
    platform: CallPlatformEnum
    status: CallStatusEnum = CallStatusEnum.INITIATED
    agent_id: Optional[int] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    subject: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None
    external_call_id: Optional[str] = Field(None, max_length=255)
    meeting_url: Optional[str] = None
    recording_url: Optional[str] = None
    is_active: bool = True


class CallCreate(BaseModel):
    customer_id: int
    direction: CallDirectionEnum
    platform: CallPlatformEnum
    status: CallStatusEnum = CallStatusEnum.INITIATED
    agent_id: Optional[int] = None
    started_at: Optional[datetime] = None
    notes: Optional[str] = None
    subject: Optional[str] = Field(None, max_length=255)
    external_call_id: Optional[str] = Field(None, max_length=255)
    meeting_url: Optional[str] = None
    recording_url: Optional[str] = None


class CallUpdate(BaseModel):
    status: Optional[CallStatusEnum] = None
    agent_id: Optional[int] = None
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    notes: Optional[str] = None
    subject: Optional[str] = Field(None, max_length=255)
    meeting_url: Optional[str] = None
    recording_url: Optional[str] = None


class CallAssign(BaseModel):
    agent_id: int


class CallStatusUpdate(BaseModel):
    status: CallStatusEnum


class CallResponse(BaseModel):
    id: int
    customer_id: int
    agent_id: int
    platform_id: int
    call_type: str
    direction: str
    status: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    subject: Optional[str] = None
    notes: Optional[str] = None
    external_call_id: Optional[str] = None
    meeting_url: Optional[str] = None
    recording_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
