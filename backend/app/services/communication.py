import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.api.deps import get_accessible_agent_ids
from app.core.config import settings
from app.models.call import Call
from app.models.customer import Customer
from app.models.user import User
from app.schemas.notification import NotificationCreate, NotificationTypeEnum, ReferenceTypeEnum
from app.services.audit_log import log_activity
from app.services.notification import create_notification
from app.services.storage import store_call_recording
from app.integrations.communication.base import (
    BaseCommunicationProvider,
    NormalizedCallResult,
    NormalizedWebhookResult,
)
from app.integrations.communication.mock_provider import MockCommunicationProvider
from app.integrations.communication.twilio_provider import TwilioCommunicationProvider

logger = logging.getLogger(__name__)


def get_communication_provider(provider_name: Optional[str] = None) -> BaseCommunicationProvider:
    """Factory to retrieve configured or requested communication provider."""
    name = (provider_name or settings.COMMUNICATION_PROVIDER or "mock").lower()

    if name == "twilio":
        if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
            logger.warning("Twilio credentials missing, falling back to mock provider.")
            return MockCommunicationProvider()
        return TwilioCommunicationProvider(
            account_sid=settings.TWILIO_ACCOUNT_SID,
            auth_token=settings.TWILIO_AUTH_TOKEN,
            from_phone=settings.TWILIO_PHONE_NUMBER or "+15550009999",
            webhook_base_url=settings.TWILIO_WEBHOOK_BASE_URL,
        )
    elif name == "mock":
        return MockCommunicationProvider()
    else:
        # Default or fallback to mock
        return MockCommunicationProvider()


def initiate_outgoing_call(
    db: Session,
    call_id: int,
    current_user: User,
    provider_name: Optional[str] = None
) -> Call:
    """
    Initiate an outgoing call for an existing call record via the configured communication provider.
    """
    call = db.query(Call).filter(Call.id == call_id, Call.is_active == True).first()
    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Call with ID {call_id} not found"
        )

    # RBAC Enforcement: Admin, Manager (team), or assigned Agent
    accessible_ids = get_accessible_agent_ids(db, current_user)
    if accessible_ids is not None and call.agent_id not in accessible_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to initiate this call"
        )

    # Verify customer is active and has a phone number
    customer = db.query(Customer).filter(Customer.id == call.customer_id).first()
    if not customer or not customer.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot initiate call for an inactive or missing customer"
        )

    if not customer.phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Customer does not have a valid phone number"
        )

    # Check call status - duplicate initiation protection
    if call.status in ["initiated", "ongoing", "completed", "cancelled"] and call.external_call_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Call is already in '{call.status}' state with provider ID {call.external_call_id}"
        )

    old_status = call.status
    provider = get_communication_provider(provider_name)
    result: NormalizedCallResult = provider.make_call(
        to_phone=customer.phone,
        from_phone=None,
        call_id=call.id
    )

    if result.status == "failed" and result.error_message:
        call.status = "failed"
        db.commit()
        db.refresh(call)

        log_activity(
            db=db,
            user_id=current_user.id,
            action="status_change",
            entity_type="call",
            entity_id=call.id,
            description=f"Call #{call.id} initiation failed via {result.provider}: {result.error_message}",
            old_values=f"status: {old_status}",
            new_values="status: failed",
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Provider initiation failed: {result.error_message}"
        )

    call.external_call_id = result.external_call_id
    call.status = result.status or "initiated"
    call.direction = "outgoing"
    if not call.start_time:
        call.start_time = result.started_at or datetime.now(timezone.utc)

    db.commit()
    db.refresh(call)

    # Log audit event
    log_activity(
        db=db,
        user_id=current_user.id,
        action="update",
        entity_type="call",
        entity_id=call.id,
        description=f"Initiated outgoing call via {result.provider} (External ID: {result.external_call_id})",
        old_values=f"status: {old_status}",
        new_values=f"status: {call.status}, external_call_id: {call.external_call_id}",
    )

    return call


def generate_twiml_for_call(db: Session, call_id: int) -> str:
    """
    Generate dynamic TwiML response for Twilio Voice webhook based on call context.
    """
    call = db.query(Call).filter(Call.id == call_id, Call.is_active == True).first()
    agent_phone = None

    if call and call.agent_id:
        agent = db.query(User).filter(User.id == call.agent_id).first()
        if agent and agent.phone:
            agent_phone = agent.phone

    provider = TwilioCommunicationProvider(
        account_sid=settings.TWILIO_ACCOUNT_SID or "dummy_sid",
        auth_token=settings.TWILIO_AUTH_TOKEN or "dummy_token",
        from_phone=settings.TWILIO_PHONE_NUMBER or "+15550009999",
        webhook_base_url=settings.TWILIO_WEBHOOK_BASE_URL,
    )
    return provider.generate_twiml_voice(call_id=call_id, agent_phone=agent_phone)


def process_provider_webhook(
    db: Session,
    provider_name: str,
    payload: Dict[str, Any]
) -> Optional[Call]:
    """
    Process incoming status callback webhook from a communication provider with idempotency guarantees.
    """
    provider = get_communication_provider(provider_name)
    normalized: NormalizedWebhookResult = provider.handle_webhook(payload)

    if not normalized.external_call_id:
        logger.warning("Webhook payload missing external_call_id: %s", payload)
        return None

    call = db.query(Call).filter(
        Call.external_call_id == normalized.external_call_id,
        Call.is_active == True
    ).first()

    if not call:
        logger.warning(
            "No active call found with external_call_id=%s for provider=%s",
            normalized.external_call_id,
            provider_name
        )
        return None

    old_status = call.status
    status_changed = False
    recording_changed = False

    if normalized.status and normalized.status != old_status:
        call.status = normalized.status
        status_changed = True

    if normalized.started_at and not call.start_time:
        call.start_time = normalized.started_at

    if normalized.ended_at:
        call.end_time = normalized.ended_at

    if normalized.duration_seconds is not None and normalized.duration_seconds > 0:
        call.duration_seconds = normalized.duration_seconds

    if normalized.recording_url:
        auth_header = provider._get_auth_header() if hasattr(provider, "_get_auth_header") else None
        secure_recording_url = store_call_recording(
            remote_recording_url=normalized.recording_url,
            call_id=call.id,
            recording_sid=payload.get("RecordingSid"),
            auth_header=auth_header
        )
        if secure_recording_url and secure_recording_url != call.recording_url:
            call.recording_url = secure_recording_url
            recording_changed = True

    db.commit()
    db.refresh(call)

    # Idempotent activity logging: only log when status or recording actually changes
    if status_changed or recording_changed:
        log_activity(
            db=db,
            user_id=call.agent_id,
            action="status_change" if status_changed else "update",
            entity_type="call",
            entity_id=call.id,
            description=f"Call #{call.id} updated to '{call.status}' via {provider_name} webhook"
            + (f" (Recording attached)" if recording_changed else ""),
            old_values=f"status: {old_status}",
            new_values=f"status: {call.status}, duration: {call.duration_seconds}, recording: {bool(call.recording_url)}",
        )

    # Idempotent Agent notification: only fire when status changes to a terminal state
    if status_changed and call.status in ["completed", "failed", "missed", "cancelled"]:
        try:
            create_notification(
                db=db,
                notification_in=NotificationCreate(
                    user_id=call.agent_id,
                    notification_type=NotificationTypeEnum.CALL_ASSIGNED,
                    title=f"Call {call.status.capitalize()}",
                    message=f"Call #{call.id} has been marked as '{call.status}'.",
                    reference_type=ReferenceTypeEnum.CALL,
                    reference_id=call.id,
                )
            )
        except Exception as notif_err:
            logger.warning("Failed to create webhook notification: %s", str(notif_err))

    return call
