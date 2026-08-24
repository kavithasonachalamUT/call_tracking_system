from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class PlatformBase(BaseModel):
    name: str = Field(..., max_length=100)
    code: str = Field(..., max_length=50)
    description: Optional[str] = None
    is_active: bool = True


class PlatformCreate(PlatformBase):
    pass


class PlatformUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    code: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class PlatformResponse(PlatformBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
