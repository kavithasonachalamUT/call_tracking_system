from typing import Dict, Any
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services import communication as communication_service

router = APIRouter()


@router.post("/communication/{provider_name}", summary="Handle provider status callback and event webhooks")
async def handle_communication_webhook(
    provider_name: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Public webhook receiver for provider status callbacks (Twilio, Exotel, Mock, etc.).
    Supports both application/json and application/x-www-form-urlencoded payloads.
    """
    payload: Dict[str, Any] = {}
    content_type = request.headers.get("content-type", "")

    if "application/json" in content_type:
        try:
            payload = await request.json()
        except Exception:
            payload = {}
    elif "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
        try:
            form_data = await request.form()
            payload = dict(form_data)
        except Exception:
            payload = {}
    else:
        # Try JSON first then form
        try:
            payload = await request.json()
        except Exception:
            try:
                form_data = await request.form()
                payload = dict(form_data)
            except Exception:
                payload = {}

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
