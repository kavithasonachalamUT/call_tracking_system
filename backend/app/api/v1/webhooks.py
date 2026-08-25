import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Request, Response, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import get_db
from app.services import communication as communication_service
from app.integrations.communication.twilio_provider import TwilioCommunicationProvider

logger = logging.getLogger(__name__)
router = APIRouter()


async def extract_request_payload(request: Request) -> Dict[str, Any]:
    """Helper to extract payload from JSON, form-data, or urlencoded request bodies."""
    content_type = request.headers.get("content-type", "")
    payload: Dict[str, Any] = {}

    if "application/json" in content_type:
        try:
            payload = await request.json()
        except Exception:
            payload = {}
    else:
        try:
            form_data = await request.form()
            payload = dict(form_data)
        except Exception:
            try:
                payload = await request.json()
            except Exception:
                payload = {}

    return payload


def verify_twilio_signature_if_enabled(request: Request, payload: Dict[str, Any]):
    """
    Validates Twilio X-Twilio-Signature in production when TWILIO_AUTH_TOKEN is configured.
    """
    if not settings.TWILIO_AUTH_TOKEN or settings.COMMUNICATION_PROVIDER != "twilio":
        return

    signature = request.headers.get("X-Twilio-Signature")
    if not signature:
        logger.warning("Missing X-Twilio-Signature header on Twilio webhook.")
        # In strict production mode, raise 403.
        return

    provider = communication_service.get_communication_provider("twilio")
    if isinstance(provider, TwilioCommunicationProvider):
        full_url = str(request.url)
        is_valid = provider.validate_signature(full_url, payload, signature)
        if not is_valid:
            logger.error("Twilio signature validation failed for URL: %s", full_url)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid Twilio signature"
            )


@router.api_route(
    "/communication/twilio/voice",
    methods=["GET", "POST"],
    summary="Dynamic Twilio Voice TwiML Webhook"
)
async def twilio_voice_twiml_webhook(
    request: Request,
    call_id: Optional[int] = Query(None, description="Internal Call ID to bridge"),
    db: Session = Depends(get_db)
):
    """
    Returns dynamic TwiML XML when the customer answers the call.
    Bridges to the assigned agent's phone number and starts recording.
    """
    payload = await extract_request_payload(request)
    verify_twilio_signature_if_enabled(request, payload)

    # Resolve call_id from query param or payload
    target_call_id = call_id
    if not target_call_id and "call_id" in payload:
        try:
            target_call_id = int(payload["call_id"])
        except (ValueError, TypeError):
            pass

    if not target_call_id:
        # Fallback TwiML
        xml_content = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna">Thank you for connecting with the Call Tracking System. Your call is now connected.</Say>
</Response>"""
        return Response(content=xml_content, media_type="application/xml")

    xml_content = communication_service.generate_twiml_for_call(db=db, call_id=target_call_id)
    return Response(content=xml_content, media_type="application/xml")


@router.post(
    "/communication/twilio/recording",
    summary="Twilio Call Recording Callback Webhook"
)
async def twilio_recording_callback(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Handles Twilio RecordingStatusCallback events when audio recording is finalized.
    Downloads recording and uploads to Cloudflare R2 / secure storage.
    """
    payload = await extract_request_payload(request)
    verify_twilio_signature_if_enabled(request, payload)

    updated_call = communication_service.process_provider_webhook(
        db=db,
        provider_name="twilio",
        payload=payload
    )

    if updated_call:
        return {
            "status": "success",
            "message": "Call recording processed successfully",
            "call_id": updated_call.id,
            "recording_url": updated_call.recording_url,
        }
    return {
        "status": "acknowledged",
        "message": "Recording callback acknowledged",
    }


@router.post(
    "/communication/{provider_name}",
    summary="Handle provider status callback and event webhooks"
)
async def handle_communication_webhook(
    provider_name: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Public webhook receiver for provider status callbacks (Twilio, Exotel, Mock, etc.).
    Supports both application/json and application/x-www-form-urlencoded payloads.
    """
    payload = await extract_request_payload(request)

    if provider_name == "twilio":
        verify_twilio_signature_if_enabled(request, payload)

    updated_call = communication_service.process_provider_webhook(
        db=db,
        provider_name=provider_name,
        payload=payload
    )

    if updated_call:
        return {
            "status": "success",
            "message": "Call state updated successfully",
            "call_id": updated_call.id,
            "call_status": updated_call.status,
            "external_call_id": updated_call.external_call_id,
        }
    else:
        return {
            "status": "acknowledged",
            "message": "Webhook processed (no matching call updated or event ignored)",
        }
