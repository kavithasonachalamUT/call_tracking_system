import base64
import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from app.integrations.communication.base import (
    BaseCommunicationProvider,
    NormalizedCallResult,
    NormalizedWebhookResult,
)

logger = logging.getLogger(__name__)


class TwilioCommunicationProvider(BaseCommunicationProvider):
    """
    Twilio Telephony Provider implementation using Twilio's REST API.
    Uses standard library urllib so no additional third-party dependencies are required.
    """

    def __init__(
        self,
        account_sid: str,
        auth_token: str,
        from_phone: str,
        webhook_base_url: Optional[str] = None
    ):
        self.account_sid = account_sid
        self.auth_token = auth_token
        self.from_phone = from_phone
        self.webhook_base_url = webhook_base_url
        self.base_url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}"

    def _get_auth_header(self) -> str:
        credentials = f"{self.account_sid}:{self.auth_token}".encode("utf-8")
        return f"Basic {base64.b64encode(credentials).decode('utf-8')}"

    def make_call(
        self,
        to_phone: str,
        from_phone: Optional[str] = None,
        call_id: int = 0,
        callback_url: Optional[str] = None
    ) -> NormalizedCallResult:
        caller = from_phone or self.from_phone
        url = f"{self.base_url}/Calls.json"

        # Determine status callback webhook URL
        status_callback = callback_url
        if not status_callback and self.webhook_base_url:
            status_callback = f"{self.webhook_base_url.rstrip('/')}/api/v1/webhooks/communication/twilio"

        form_data = {
            "To": to_phone,
            "From": caller,
            "Url": "http://demo.twilio.com/docs/voice.xml",  # Default TwiML
        }
        if status_callback:
            form_data["StatusCallback"] = status_callback
            form_data["StatusCallbackEvent"] = "completed"

        data_bytes = urllib.parse.urlencode(form_data).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data_bytes,
            headers={
                "Authorization": self._get_auth_header(),
                "Content-Type": "application/x-www-form-urlencoded",
            },
            method="POST"
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                body = json.loads(response.read().decode("utf-8"))
                return NormalizedCallResult(
                    provider="twilio",
                    external_call_id=body.get("sid", ""),
                    status="initiated",
                    direction="outgoing",
                    started_at=datetime.now(timezone.utc),
                    error_message=None,
                )
        except urllib.error.HTTPError as http_err:
            try:
                err_body = json.loads(http_err.read().decode("utf-8"))
                err_msg = err_body.get("message", f"Twilio HTTP {http_err.code}")
            except Exception:
                err_msg = f"Twilio HTTP {http_err.code}"
            logger.error("Twilio HTTP error initiating call: %s", err_msg)
            return NormalizedCallResult(
                provider="twilio",
                external_call_id="",
                status="failed",
                direction="outgoing",
                error_message=err_msg,
            )
        except Exception as exc:
            logger.error("Failed to initiate Twilio call: %s", str(exc))
            return NormalizedCallResult(
                provider="twilio",
                external_call_id="",
                status="failed",
                direction="outgoing",
                error_message=str(exc),
            )

    def get_call_status(self, external_call_id: str) -> NormalizedCallResult:
        url = f"{self.base_url}/Calls/{external_call_id}.json"
        req = urllib.request.Request(
            url,
            headers={
                "Authorization": self._get_auth_header(),
                "Accept": "application/json",
            },
            method="GET"
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                body = json.loads(response.read().decode("utf-8"))
                raw_status = body.get("status", "unknown")
                status_map = {
                    "queued": "initiated",
                    "ringing": "ringing",
                    "in-progress": "ongoing",
                    "completed": "completed",
                    "busy": "failed",
                    "failed": "failed",
                    "no-answer": "missed",
                    "canceled": "cancelled",
                }
                normalized_status = status_map.get(raw_status.lower(), raw_status)
                duration = int(body["duration"]) if body.get("duration") else None
                return NormalizedCallResult(
                    provider="twilio",
                    external_call_id=external_call_id,
                    status=normalized_status,
                    direction="outgoing",
                    duration_seconds=duration,
                )
        except Exception as exc:
            return NormalizedCallResult(
                provider="twilio",
                external_call_id=external_call_id,
                status="unknown",
                error_message=str(exc),
            )

    def handle_webhook(self, payload: Dict[str, Any]) -> NormalizedWebhookResult:
        """
        Process Twilio StatusCallback webhook.
        Standard parameters: CallSid, CallStatus, CallDuration, RecordingUrl, etc.
        """
        call_sid = payload.get("CallSid", "")
        call_status = payload.get("CallStatus", "").lower()

        status_map = {
            "queued": "initiated",
            "initiated": "initiated",
            "ringing": "ringing",
            "in-progress": "ongoing",
            "completed": "completed",
            "busy": "failed",
            "failed": "failed",
            "no-answer": "missed",
            "canceled": "cancelled",
        }
        normalized_status = status_map.get(call_status, call_status or "completed")

        duration = None
        if "CallDuration" in payload and payload["CallDuration"]:
            try:
                duration = int(payload["CallDuration"])
            except ValueError:
                pass
        elif "duration_seconds" in payload and payload["duration_seconds"]:
            try:
                duration = int(payload["duration_seconds"])
            except ValueError:
                pass

        recording_url = payload.get("RecordingUrl") or payload.get("recording_url")
        error_message = payload.get("ErrorMessage") or payload.get("error_message")

        return NormalizedWebhookResult(
            provider="twilio",
            external_call_id=call_sid,
            status=normalized_status,
            started_at=datetime.now(timezone.utc) if normalized_status in ["ongoing", "completed"] else None,
            ended_at=datetime.now(timezone.utc) if normalized_status in ["completed", "failed", "missed", "cancelled"] else None,
            duration_seconds=duration,
            recording_url=recording_url,
            error_message=error_message,
            raw_payload=payload,
        )
