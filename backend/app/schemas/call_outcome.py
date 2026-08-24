from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, ConfigDict


class OutcomeTypeEnum(str, Enum):
    INTERESTED = "interested"
    NOT_INTERESTED = "not_interested"
    FOLLOW_UP_REQUIRED = "follow_up_required"
    CALLBACK_REQUESTED = "callback_requested"
    DEMO_SCHEDULED = "demo_scheduled"
    CONVERTED = "converted"
    NO_RESPONSE = "no_response"
    WRONG_NUMBER = "wrong_number"
    COMPLAINT = "complaint"
    RESOLVED = "resolved"


class CallOutcomeBase(BaseModel):
    outcome: OutcomeTypeEnum
    notes: Optional[str] = None
    is_active: bool = True


class CallOutcomeCreate(BaseModel):
    call_id: int
    outcome: OutcomeTypeEnum
    notes: Optional[str] = None


class CallOutcomeUpdate(BaseModel):
    outcome: Optional[OutcomeTypeEnum] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class CallOutcomeResponse(CallOutcomeBase):
    id: int
    call_id: int
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
