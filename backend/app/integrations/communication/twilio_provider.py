import base64
import hashlib
import hmac
import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Tuple

from app.integrations.communication.base import (
    BaseCommunicationProvider,
    NormalizedCallResult,
    NormalizedWebhookResult,
)

logger = logging.getLogger(__name__)


class TwilioCommunicationProvider(BaseCommunicationProvider):
    """
    Twilio Telephony Provider implementation using Twilio's REST API.
    Uses standard library urllib and hmac for zero external dependency overhead.
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

    def validate_signature(self, url: str, params: Dict[str, Any], signature: Optional[str]) -> bool:
        """
        Validate incoming Twilio webhook signature (X-Twilio-Signature header) using HMAC-SHA1.
        """
        if not signature or not self.auth_token:
            return False

        try:
            # Twilio signature format: URL + sorted key-value pairs concatenated without delimiters
            s = url
            for key in sorted(params.keys()):
                s += f"{key}{params[key]}"

            computed_mac = hmac.new(
                self.auth_token.encode("utf-8"),
                s.encode("utf-8"),
                hashlib.sha1
            ).digest()
            computed_sig = base64.b64encode(computed_mac).decode("utf-8").strip()

            return hmac.compare_digest(computed_sig, signature.strip())
        except Exception as exc:
            logger.error("Error validating Twilio signature: %s", str(exc))
            return False

    def make_call(
        self,
        to_phone: str,
        from_phone: Optional[str] = None,
        call_id: int = 0,
        callback_url: Optional[str] = None
    ) -> NormalizedCallResult:
        """
        Initiate an outbound call to the customer via Twilio REST API with dynamic TwiML and recording.
        """
        caller = from_phone or self.from_phone
        url = f"{self.base_url}/Calls.json"

        # Determine dynamic voice TwiML URL
        if self.webhook_base_url:
            voice_url = f"{self.webhook_base_url.rstrip('/')}/api/v1/webhooks/communication/twilio/voice?call_id={call_id}"
        else:
            voice_url = "http://demo.twilio.com/docs/voice.xml"

        # Determine status callback webhook URL
        status_callback = callback_url
        if not status_callback and self.webhook_base_url:
            status_callback = f"{self.webhook_base_url.rstrip('/')}/api/v1/webhooks/communication/twilio"

        # Construct repeated parameters using a list of tuples
        form_params: List[Tuple[str, str]] = [
            ("To", to_phone),
            ("From", caller),
            ("Url", voice_url),
            ("Record", "record-from-answer-dual"),
        ]

        if status_callback:
            form_params.append(("StatusCallback", status_callback))
            form_params.append(("StatusCallbackEvent", "initiated"))
            form_params.append(("StatusCallbackEvent", "ringing"))
            form_params.append(("StatusCallbackEvent", "answered"))
            form_params.append(("StatusCallbackEvent", "completed"))

        data_bytes = urllib.parse.urlencode(form_params).encode("utf-8")
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
            with urllib.request.urlopen(req, timeout=15) as response:
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
        """
        Poll active or past call status from Twilio REST API.
        """
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
        Process Twilio StatusCallback or RecordingStatusCallback webhook payload.
        """
        call_sid = payload.get("CallSid") or payload.get("external_call_id") or ""
        call_status = payload.get("CallStatus", "").lower() or payload.get("status", "").lower()

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
            except (ValueError, TypeError):
                pass
        elif "RecordingDuration" in payload and payload["RecordingDuration"]:
            try:
                duration = int(payload["RecordingDuration"])
            except (ValueError, TypeError):
                pass
        elif "duration_seconds" in payload and payload["duration_seconds"]:
            try:
                duration = int(payload["duration_seconds"])
            except (ValueError, TypeError):
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

    def generate_twiml_voice(
        self,
        call_id: int,
        agent_phone: Optional[str] = None,
        recording_callback_url: Optional[str] = None
    ) -> str:
        """
        Generate clean, production TwiML XML to connect the call and record the audio stream.
        """
        rec_callback = recording_callback_url
        if not rec_callback and self.webhook_base_url:
            rec_callback = f"{self.webhook_base_url.rstrip('/')}/api/v1/webhooks/communication/twilio/recording"

        rec_attr = 'record="record-from-answer-dual"'
        if rec_callback:
            rec_attr += f' recordingStatusCallback="{rec_callback}" recordingStatusCallbackMethod="POST"'

        if agent_phone:
            xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial {rec_attr} timeout="30">
        <Number>{agent_phone}</Number>
    </Dial>
</Response>"""
        else:
            xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna">Thank you for connecting with the Call Tracking System. Your call is now connected and recorded for quality assurance.</Say>
    <Dial {rec_attr} timeout="30" />
</Response>"""

        return xml
