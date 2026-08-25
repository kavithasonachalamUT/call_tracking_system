import base64
import logging
import urllib.error
import urllib.request
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


def download_remote_audio(url: str, auth_header: Optional[str] = None) -> Optional[bytes]:
    """
    Download audio payload from a remote URL (e.g., Twilio Recording URL) with optional Basic Auth.
    """
    # Ensure MP3 format if Twilio URL without extension
    fetch_url = url
    if "api.twilio.com" in url and not url.endswith(".mp3"):
        fetch_url = f"{url}.mp3"

    req = urllib.request.Request(fetch_url)
    if auth_header:
        req.add_header("Authorization", auth_header)

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return response.read()
    except Exception as exc:
        logger.error("Failed to download audio from %s: %s", fetch_url, str(exc))
        return None


def upload_to_r2(audio_bytes: bytes, file_key: str, content_type: str = "audio/mpeg") -> Optional[str]:
    """
    Upload raw audio bytes to Cloudflare R2 bucket and return public/CDN URL.
    """
    if not settings.R2_ACCOUNT_ID or not settings.R2_ACCESS_KEY_ID or not settings.R2_SECRET_ACCESS_KEY or not settings.R2_BUCKET_NAME:
        logger.info("Cloudflare R2 credentials not configured, skipping R2 upload.")
        return None

    try:
        import boto3
        from botocore.config import Config

        endpoint_url = f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
        s3 = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            config=Config(signature_version="s3v4"),
            region_name="auto",
        )

        s3.put_object(
            Bucket=settings.R2_BUCKET_NAME,
            Key=file_key,
            Body=audio_bytes,
            ContentType=content_type,
        )

        if settings.R2_PUBLIC_DOMAIN:
            return f"{settings.R2_PUBLIC_DOMAIN.rstrip('/')}/{file_key}"
        return f"{endpoint_url}/{settings.R2_BUCKET_NAME}/{file_key}"
    except ImportError:
        logger.warning("boto3 package not found for Cloudflare R2 upload.")
        return None
    except Exception as exc:
        logger.error("Cloudflare R2 upload error: %s", str(exc))
        return None


def store_call_recording(
    remote_recording_url: str,
    call_id: int,
    recording_sid: Optional[str] = None,
    auth_header: Optional[str] = None
) -> str:
    """
    Downloads recording from provider and uploads it to Cloudflare R2 if configured.
    Falls back gracefully to the original remote recording URL.
    """
    if not remote_recording_url:
        return ""

    # Generate consistent object key
    sid_suffix = recording_sid or f"call_{call_id}"
    file_key = f"recordings/{call_id}_{sid_suffix}.mp3"

    # Attempt download if R2 is configured
    if settings.R2_ACCOUNT_ID and settings.R2_ACCESS_KEY_ID:
        audio_data = download_remote_audio(remote_recording_url, auth_header=auth_header)
        if audio_data:
            r2_url = upload_to_r2(audio_data, file_key)
            if r2_url:
                logger.info("Successfully stored recording in Cloudflare R2: %s", r2_url)
                return r2_url

    # Fallback to direct URL (ensuring .mp3 suffix for Twilio if needed)
    fallback_url = remote_recording_url
    if "api.twilio.com" in fallback_url and not fallback_url.endswith(".mp3"):
        fallback_url = f"{fallback_url}.mp3"
    return fallback_url
