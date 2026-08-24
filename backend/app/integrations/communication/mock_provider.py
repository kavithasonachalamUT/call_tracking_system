import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from app.integrations.communication.base import (
    BaseCommunicationProvider,
    NormalizedCallResult,
    NormalizedWebhookResult,
)


class MockCommunicationProvider(BaseCommunicationProvider):
    """
    Mock communication provider for reliable local development, automated testing,
    and offline test suites without live credentials.
    """

    def __init__(self, from_phone: str = "+15550009999"):
        self.from_phone = from_phone

    def make_call(
        self,
        to_phone: str,
        from_phone: Optional[str] = None,
        call_id: int = 0,
        callback_url: Optional[str] = None
    ) -> NormalizedCallResult:
        external_id = f"mock_call_{uuid.uuid4().hex[:12]}"
        return NormalizedCallResult(
            provider="mock",
            external_call_id=external_id,
            status="initiated",
            direction="outgoing",
            started_at=datetime.now(timezone.utc),
            error_message=None,
        )

    def get_call_status(self, external_call_id: str) -> NormalizedCallResult:
        return NormalizedCallResult(
            provider="mock",
            external_call_id=external_call_id,
            status="ongoing",
            direction="outgoing",
            started_at=datetime.now(timezone.utc),
            error_message=None,
        )

    def handle_webhook(self, payload: Dict[str, Any]) -> NormalizedWebhookResult:
        external_id = payload.get("external_call_id") or payload.get("CallSid") or "mock_unknown"
        status_val = payload.get("status") or payload.get("CallStatus") or "completed"

        # Normalize status mapping
        status_map = {
            "queued": "initiated",
            "initiated": "initiated",
            "ringing": "ringing",
            "in-progress": "ongoing",
            "ongoing": "ongoing",
            "completed": "completed",
            "busy": "failed",
            "failed": "failed",
            "no-answer": "missed",
            "canceled": "cancelled",
        }
        normalized_status = status_map.get(status_val.lower(), status_val.lower())

        duration = None
        if "duration_seconds" in payload:
            duration = int(payload["duration_seconds"])
        elif "CallDuration" in payload:
            duration = int(payload["CallDuration"])

        return NormalizedWebhookResult(
            provider="mock",
            external_call_id=external_id,
            status=normalized_status,
            started_at=datetime.now(timezone.utc) if normalized_status in ["ongoing", "completed"] else None,
            ended_at=datetime.now(timezone.utc) if normalized_status in ["completed", "failed", "missed", "cancelled"] else None,
            duration_seconds=duration,
            recording_url=payload.get("recording_url") or payload.get("RecordingUrl"),
            error_message=payload.get("error_message"),
            raw_payload=payload,
        )
