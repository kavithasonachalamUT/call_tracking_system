from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel


class NormalizedCallResult(BaseModel):
    provider: str
    external_call_id: str
    status: str
    direction: str = "outgoing"
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    recording_url: Optional[str] = None
    error_message: Optional[str] = None


class NormalizedWebhookResult(BaseModel):
    provider: str
    external_call_id: str
    status: str
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    recording_url: Optional[str] = None
    error_message: Optional[str] = None
    raw_payload: Optional[Dict[str, Any]] = None


class BaseCommunicationProvider(ABC):
    """Abstract interface for third-party telephony and communication providers."""

    @abstractmethod
    def make_call(
        self,
        to_phone: str,
        from_phone: Optional[str],
        call_id: int,
        callback_url: Optional[str] = None
    ) -> NormalizedCallResult:
        """Initiate an outgoing call through the provider."""
        pass

    @abstractmethod
    def get_call_status(self, external_call_id: str) -> NormalizedCallResult:
        """Query the status of an active or past call with the provider."""
        pass

    @abstractmethod
    def handle_webhook(self, payload: Dict[str, Any]) -> NormalizedWebhookResult:
        """Normalize provider-specific webhook/status-callback payload."""
        pass
