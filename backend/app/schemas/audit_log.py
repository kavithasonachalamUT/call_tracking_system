from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class AuditActionEnum(str, Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    DEACTIVATE = "deactivate"
    LOGIN = "login"
    LOGOUT = "logout"
    ASSIGN = "assign"
    STATUS_CHANGE = "status_change"
    COMPLETE = "complete"
    MARK_READ = "mark_read"
    OTHER = "other"


class AuditEntityTypeEnum(str, Enum):
    USER = "user"
    CUSTOMER = "customer"
    CALL = "call"
    CALL_OUTCOME = "call_outcome"
    FOLLOW_UP = "follow_up"
    NOTIFICATION = "notification"
    SYSTEM = "system"
    OTHER = "other"


class AuditLogBase(BaseModel):
    action: AuditActionEnum
    entity_type: AuditEntityTypeEnum
    entity_id: Optional[int] = None
    description: Optional[str] = None
    old_values: Optional[str] = None
    new_values: Optional[str] = None
    ip_address: Optional[str] = Field(None, max_length=45)


class AuditLogCreate(AuditLogBase):
    user_id: Optional[int] = None


class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    description: Optional[str] = None
    old_values: Optional[str] = None
    new_values: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
