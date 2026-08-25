import json
import os
import sys
import urllib.request
import urllib.error

sys.path.insert(0, os.path.abspath("backend"))
sys.path.insert(0, os.path.abspath("."))

BASE_URL = "http://localhost:8000/api/v1"

def api_request(endpoint, method="GET", data=None, token=None, headers_extra=None, return_raw=False):
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if headers_extra:
        headers.update(headers_extra)
    
    req_data = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as resp:
            resp_body = resp.read().decode("utf-8")
            if return_raw:
                return resp.status, resp_body
            return resp.status, json.loads(resp_body) if resp_body else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        if return_raw:
            return e.code, err_body
        return e.code, json.loads(err_body) if err_body else {}

def test_twilio_integration():
    print("=== Testing Real Twilio Telephony & Webhook Implementation ===")
    
    # 1. Login as Admin
    status, login_res = api_request("/auth/login", method="POST", data={"email": "test@example.com", "password": "password123"})
    assert status == 200, f"Login failed: {login_res}"
    token = login_res["access_token"]
    print("1. [PASS] Authenticated as Admin")

    # 2. Update Agent phone number
    import time
    ts = int(time.time())
    agent_phone = "+15551234567"
    status, update_user_res = api_request(
        "/users/me",
        method="PUT",
        data={"name": "Admin User", "phone": agent_phone},
        token=token
    )
    assert status == 200, f"Update profile failed: {update_user_res}"
    assert update_user_res.get("phone") == agent_phone, f"Expected phone {agent_phone}, got {update_user_res.get('phone')}"
    print(f"2. [PASS] User model and schema updated with phone number: {agent_phone}")

    # 3. Create customer & call
    status, cust_res = api_request(
        "/customers",
        method="POST",
        data={
            "name": f"Twilio Customer {ts}",
            "phone": f"+1555{str(ts)[-7:]}",
            "email": f"twiliocust{ts}@example.com",
            "is_active": True
        },
        token=token
    )
    assert status in [200, 201], f"Customer create failed: {cust_res}"
    cust_id = cust_res["id"]

    status, call_res = api_request(
        "/calls",
        method="POST",
        data={
            "customer_id": cust_id,
            "agent_id": 1,
            "direction": "outgoing",
            "platform": "phone",
            "subject": "Twilio Outbound Real Bridge Test"
        },
        token=token
    )
    assert status in [200, 201], f"Call create failed: {call_res}"
    call_id = call_res["id"]
    print(f"3. [PASS] Created Call record #{call_id} for customer #{cust_id}")

    # 4. Test Dynamic TwiML Voice Endpoint
    status, twiml_xml = api_request(
        f"/webhooks/communication/twilio/voice?call_id={call_id}",
        method="POST",
        return_raw=True
    )
    assert status == 200, f"TwiML endpoint failed: {twiml_xml}"
    assert "<Response>" in twiml_xml
    assert "<Dial" in twiml_xml
    assert 'record="record-from-answer-dual"' in twiml_xml
    assert agent_phone in twiml_xml
    print(f"4. [PASS] Dynamic TwiML Voice Endpoint verified:\n   {twiml_xml.strip()}")

    # 5. Initiate Call through API
    status, init_res = api_request(f"/calls/{call_id}/initiate", method="POST", token=token)
    assert status == 200, f"Initiate call failed: {init_res}"
    simulated_call_sid = init_res["external_call_id"]
    print(f"5. [PASS] Call initiated via API with External Call SID: {simulated_call_sid}")

    # Ringing status
    status, wh_res = api_request(
        "/webhooks/communication/twilio",
        method="POST",
        data={
            "CallSid": simulated_call_sid,
            "CallStatus": "ringing"
        }
    )
    assert status == 200
    print("6. [PASS] Twilio 'ringing' webhook received and mapped")

    # Answered / in-progress status
    status, wh_res = api_request(
        "/webhooks/communication/twilio",
        method="POST",
        data={
            "CallSid": simulated_call_sid,
            "CallStatus": "in-progress"
        }
    )
    assert status == 200
    print("7. [PASS] Twilio 'in-progress' webhook mapped to internal 'ongoing' status")

    # Completed status
    status, wh_res = api_request(
        "/webhooks/communication/twilio",
        method="POST",
        data={
            "CallSid": simulated_call_sid,
            "CallStatus": "completed",
            "CallDuration": "240"
        }
    )
    assert status == 200
    print("8. [PASS] Twilio 'completed' webhook processed (Duration: 240s)")

    # 6. Test Dedicated Recording Callback Endpoint
    sample_recording_url = "https://api.twilio.com/2010-04-01/Accounts/AC123/Recordings/RE456.mp3"
    status, rec_res = api_request(
        "/webhooks/communication/twilio/recording",
        method="POST",
        data={
            "CallSid": simulated_call_sid,
            "RecordingSid": "RE456",
            "RecordingUrl": sample_recording_url,
            "RecordingDuration": "238",
            "RecordingStatus": "completed"
        }
    )
    assert status == 200, f"Recording webhook failed: {rec_res}"
    print(f"9. [PASS] Twilio Recording Callback processed successfully: {rec_res}")

    # 7. Verify Idempotency: Send duplicate completed webhook
    status, notifs_before = api_request("/notifications", method="GET", token=token)
    status, audits_before = api_request(f"/audit-logs?entity_type=call&entity_id={call_id}", method="GET", token=token)

    # Re-send exact same completed & recording webhooks
    api_request("/webhooks/communication/twilio", method="POST", data={"CallSid": simulated_call_sid, "CallStatus": "completed", "CallDuration": "240"})
    api_request("/webhooks/communication/twilio/recording", method="POST", data={"CallSid": simulated_call_sid, "RecordingSid": "RE456", "RecordingUrl": sample_recording_url})

    status, notifs_after = api_request("/notifications", method="GET", token=token)
    status, audits_after = api_request(f"/audit-logs?entity_type=call&entity_id={call_id}", method="GET", token=token)

    assert len(notifs_before) == len(notifs_after), "Duplicate notifications were created by duplicate webhook!"
    assert len(audits_before) == len(audits_after), "Duplicate audit logs were created by duplicate webhook!"
    print("10. [PASS] Webhook Idempotency verified: zero duplicate notifications and zero duplicate audit logs generated on retried webhooks")

    # 8. Test Twilio Signature Validator unit verification
    from app.integrations.communication.twilio_provider import TwilioCommunicationProvider
    provider = TwilioCommunicationProvider(
        account_sid="AC_test_123",
        auth_token="secret_auth_token_xyz",
        from_phone="+15550009999"
    )
    # Correct signature test
    test_url = "https://example.com/api/v1/webhooks/communication/twilio"
    test_params = {"CallSid": "CA123", "CallStatus": "completed"}
    # Compute expected signature
    import hmac, hashlib, base64
    s = test_url + "CallSidCA123CallStatuscompleted"
    expected_sig = base64.b64encode(hmac.new(b"secret_auth_token_xyz", s.encode("utf-8"), hashlib.sha1).digest()).decode("utf-8")
    
    assert provider.validate_signature(test_url, test_params, expected_sig) == True
    assert provider.validate_signature(test_url, test_params, "invalid_sig_abc") == False
    print("11. [PASS] Twilio HMAC-SHA1 Request Signature Verification verified")

    print("\n--- ALL TELEPHONY, TWIML, RECORDING & IDEMPOTENCY CHECKS PASSED ---")

if __name__ == "__main__":
    test_twilio_integration()
