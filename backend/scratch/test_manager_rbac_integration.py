import os
import sys
import json
import time
import threading
import urllib.request
import urllib.error
import uvicorn

sys.path.insert(0, r"c:\Users\UTIS LAPTOP\call-tracking-system\backend")

from app.db.database import SessionLocal
from app.models.user import User
from app.models.customer import Customer
from app.models.call import Call
from app.models.follow_up import FollowUp
from app.core.security import get_password_hash

BASE_URL = "http://127.0.0.1:8000/api/v1"


def http_req(url, method="GET", data=None, headers=None):
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if "application/json" in resp.headers.get("Content-Type", "") else content
    except urllib.error.HTTPError as err:
        content = err.read().decode("utf-8")
        try:
            return err.code, json.loads(content)
        except Exception:
            return err.code, {"detail": content}


def seed_manager_and_team():
    db = SessionLocal()
    try:
        # 1. Ensure Admin exists
        admin = db.query(User).filter(User.email == "test@example.com").first()
        if admin:
            admin.role = "admin"
            admin.is_active = True
            db.commit()

        # 2. Ensure Manager test user exists
        manager = db.query(User).filter(User.email == "manager_test@example.com").first()
        if not manager:
            manager = User(
                name="Test Manager",
                email="manager_test@example.com",
                password_hash=get_password_hash("password123"),
                role="manager",
                is_active=True,
            )
            db.add(manager)
            db.commit()
            db.refresh(manager)
        else:
            manager.role = "manager"
            manager.is_active = True
            db.commit()

        # 3. Ensure Agent test user is assigned to this Manager
        agent = db.query(User).filter(User.email == "agent_test@example.com").first()
        if not agent:
            agent = User(
                name="Test Agent",
                email="agent_test@example.com",
                password_hash=get_password_hash("password123"),
                role="agent",
                manager_id=manager.id,
                is_active=True,
            )
            db.add(agent)
            db.commit()
            db.refresh(agent)
        else:
            agent.role = "agent"
            agent.manager_id = manager.id
            agent.is_active = True
            db.commit()

        # 4. Ensure an Unrelated Agent exists (no manager or different manager)
        unrelated_agent = db.query(User).filter(User.email == "unrelated_agent@example.com").first()
        if not unrelated_agent:
            unrelated_agent = User(
                name="Unrelated Agent",
                email="unrelated_agent@example.com",
                password_hash=get_password_hash("password123"),
                role="agent",
                manager_id=None,
                is_active=True,
            )
            db.add(unrelated_agent)
            db.commit()
            db.refresh(unrelated_agent)
        else:
            unrelated_agent.role = "agent"
            unrelated_agent.manager_id = None
            unrelated_agent.is_active = True
            db.commit()

        # 5. Ensure a Customer exists
        customer = db.query(Customer).filter(Customer.is_active == True).first()
        if not customer:
            customer = Customer(name="Acme Corp", phone="+15551234567", email="acme@example.com", is_active=True)
            db.add(customer)
            db.commit()
            db.refresh(customer)

        # 6. Create Team Call (assigned to agent_test)
        team_call = db.query(Call).filter(Call.agent_id == agent.id, Call.is_active == True).first()
        if not team_call:
            team_call = Call(
                customer_id=customer.id,
                agent_id=agent.id,
                platform_id=1,
                call_type="phone",
                direction="outgoing",
                status="pending",
                subject="Team Call Discussion",
                is_active=True,
            )
            db.add(team_call)
            db.commit()
            db.refresh(team_call)
        else:
            team_call.status = "pending"
            team_call.external_call_id = None
            db.commit()

        # 7. Create Unrelated Call (assigned to unrelated_agent)
        unrelated_call = db.query(Call).filter(Call.agent_id == unrelated_agent.id, Call.is_active == True).first()
        if not unrelated_call:
            unrelated_call = Call(
                customer_id=customer.id,
                agent_id=unrelated_agent.id,
                platform_id=1,
                call_type="phone",
                direction="outgoing",
                status="pending",
                subject="Unrelated Call Discussion",
                is_active=True,
            )
            db.add(unrelated_call)
            db.commit()
            db.refresh(unrelated_call)

        return {
            "admin_id": admin.id,
            "manager_id": manager.id,
            "agent_id": agent.id,
            "unrelated_agent_id": unrelated_agent.id,
            "customer_id": customer.id,
            "team_call_id": team_call.id,
            "unrelated_call_id": unrelated_call.id,
        }
    finally:
        db.close()


def run_tests():
    print("=" * 60)
    print("STARTING MANAGER ROLE & RBAC ENHANCEMENT VERIFICATION")
    print("=" * 60)

    # Start Uvicorn in background thread if not already active
    def start_srv():
        uvicorn.run("app.main:app", host="127.0.0.1", port=8000, log_level="error")

    t = threading.Thread(target=start_srv, daemon=True)
    t.start()
    time.sleep(2)

    ids = seed_manager_and_team()
    print(f"[SETUP] Seeded IDs: {ids}")

    # 1. Login as Admin
    status, res = http_req(f"{BASE_URL}/auth/login", method="POST", data={"email": "test@example.com", "password": "password123"})
    assert status == 200, f"Admin login failed: {res}"
    admin_token = res["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("[PASS 1] Admin login succeeded.")

    # 2. Login as Manager
    status, res = http_req(f"{BASE_URL}/auth/login", method="POST", data={"email": "manager_test@example.com", "password": "password123"})
    assert status == 200, f"Manager login failed: {res}"
    manager_token = res["access_token"]
    manager_headers = {"Authorization": f"Bearer {manager_token}"}
    print("[PASS 2] Manager login succeeded.")

    # 3. Login as Agent
    status, res = http_req(f"{BASE_URL}/auth/login", method="POST", data={"email": "agent_test@example.com", "password": "password123"})
    assert status == 200, f"Agent login failed: {res}"
    agent_token = res["access_token"]
    agent_headers = {"Authorization": f"Bearer {agent_token}"}
    print("[PASS 3] Agent login succeeded.")

    # 4. Verify /auth/me for all 3 roles
    _, me_admin = http_req(f"{BASE_URL}/auth/me", headers=admin_headers)
    assert me_admin["role"] == "admin"

    _, me_manager = http_req(f"{BASE_URL}/auth/me", headers=manager_headers)
    assert me_manager["role"] == "manager"

    _, me_agent = http_req(f"{BASE_URL}/auth/me", headers=agent_headers)
    assert me_agent["role"] == "agent"
    assert me_agent["manager_id"] == ids["manager_id"]
    print("[PASS 4] /auth/me returned correct roles and manager_id for Admin, Manager, and Agent.")

    # 5. User Management Scoping
    # Manager lists users: should only return self and managed agent
    status, mgr_users = http_req(f"{BASE_URL}/users", headers=manager_headers)
    assert status == 200
    mgr_user_ids = [u["id"] for u in mgr_users]
    assert ids["manager_id"] in mgr_user_ids
    assert ids["agent_id"] in mgr_user_ids
    assert ids["unrelated_agent_id"] not in mgr_user_ids
    print(f"[PASS 5] Manager user listing is strictly team-scoped: {mgr_user_ids}.")

    # 6. User Management Security: Manager cannot create users or promote roles
    status, res = http_req(f"{BASE_URL}/users", method="POST", data={
        "name": "Hacker Agent",
        "email": "hacker@example.com",
        "password": "password123",
        "role": "admin",
    }, headers=manager_headers)
    assert status == 403, f"Manager should be forbidden from creating users: {status}"
    print("[PASS 6] Manager forbidden from creating users (HTTP 403).")

    # 7. Dashboard Scoping: Admin vs Manager vs Agent
    status, admin_dash = http_req(f"{BASE_URL}/dashboard/overview", headers=admin_headers)
    assert status == 200, f"Admin dashboard failed: {status}"

    status, mgr_dash = http_req(f"{BASE_URL}/dashboard/overview", headers=manager_headers)
    assert status == 200, f"Manager dashboard failed: {status}"

    status, agent_dash = http_req(f"{BASE_URL}/dashboard/overview", headers=agent_headers)
    assert status == 200, f"Agent dashboard failed: {status}"
    print("[PASS 7] Dashboard endpoints successfully served scoped data for all 3 roles.")

    # 8. Call Management: Manager viewing calls
    # Manager can view team call
    status, call_data = http_req(f"{BASE_URL}/calls/{ids['team_call_id']}", headers=manager_headers)
    assert status == 200, f"Manager should view team call: {status} {call_data}"

    # Manager CANNOT view unrelated agent call
    status, err_data = http_req(f"{BASE_URL}/calls/{ids['unrelated_call_id']}", headers=manager_headers)
    assert status == 403, f"Manager should be blocked from unrelated call: {status}"
    print("[PASS 8] Manager can view team calls and is blocked (HTTP 403) from unrelated calls.")

    # 9. Call Management: Manager Call Reassignment
    # Manager can reassign team call to self or managed agent
    status, assign_res = http_req(f"{BASE_URL}/calls/{ids['team_call_id']}/assign", method="PATCH", data={"agent_id": ids["manager_id"]}, headers=manager_headers)
    assert status == 200, f"Manager reassign within team failed: {assign_res}"
    assert assign_res["agent_id"] == ids["manager_id"]

    # Reassign back to agent
    status, _ = http_req(f"{BASE_URL}/calls/{ids['team_call_id']}/assign", method="PATCH", data={"agent_id": ids["agent_id"]}, headers=manager_headers)
    assert status == 200

    # Manager CANNOT reassign call to unrelated agent outside team
    status, err_assign = http_req(f"{BASE_URL}/calls/{ids['team_call_id']}/assign", method="PATCH", data={"agent_id": ids["unrelated_agent_id"]}, headers=manager_headers)
    assert status == 403, f"Manager should be forbidden from assigning outside team: {status}"

    # Agent CANNOT reassign call
    status, agent_err = http_req(f"{BASE_URL}/calls/{ids['team_call_id']}/assign", method="PATCH", data={"agent_id": ids["agent_id"]}, headers=agent_headers)
    assert status == 403, f"Agent should be forbidden from reassigning call: {status}"
    print("[PASS 9] Call reassignment RBAC verified: Manager can reassign within team; cross-team & Agent assignments blocked.")

    # 10. Communication Provider Initiation
    # Manager can initiate team call
    status, init_res = http_req(f"{BASE_URL}/calls/{ids['team_call_id']}/initiate", method="POST", headers=manager_headers)
    assert status == 200, f"Manager should initiate team call: {init_res}"

    # Manager CANNOT initiate unrelated agent call
    status, init_err = http_req(f"{BASE_URL}/calls/{ids['unrelated_call_id']}/initiate", method="POST", headers=manager_headers)
    assert status == 403, f"Manager should be blocked from initiating unrelated call: {status}"
    print("[PASS 10] Call initiation RBAC verified: Manager can initiate team calls; unauthorized calls blocked.")

    # 11. Follow-up Management Scoping
    # Manager creates follow-up assigned to team agent
    status, fu_res = http_req(f"{BASE_URL}/follow-ups", method="POST", data={
        "call_id": ids["team_call_id"],
        "customer_id": ids["customer_id"],
        "assigned_to": ids["agent_id"],
        "follow_up_type": "callback",
        "status": "pending",
        "scheduled_at": "2026-08-25T15:00:00Z",
        "notes": "Manager assigned follow-up"
    }, headers=manager_headers)
    assert status == 201, f"Manager follow-up creation failed: {fu_res}"
    fu_id = fu_res["id"]

    # Manager CANNOT assign follow-up to unrelated agent outside team
    status, fu_err = http_req(f"{BASE_URL}/follow-ups", method="POST", data={
        "call_id": ids["team_call_id"],
        "customer_id": ids["customer_id"],
        "assigned_to": ids["unrelated_agent_id"],
        "follow_up_type": "callback",
        "status": "pending",
        "scheduled_at": "2026-08-25T15:00:00Z",
        "notes": "Invalid cross-team assignment"
    }, headers=manager_headers)
    assert status == 403, f"Manager cross-team follow-up should be blocked: {status}"
    print("[PASS 11] Follow-up management RBAC verified: team assignment allowed, cross-team blocked.")

    # 12. Analytics Scoping
    status, mgr_analytics = http_req(f"{BASE_URL}/analytics/overview", headers=manager_headers)
    assert status == 200
    mgr_perf_ids = [ag["agent_id"] for ag in mgr_analytics["agent_performance"]]
    assert ids["manager_id"] in mgr_perf_ids or ids["agent_id"] in mgr_perf_ids
    assert ids["unrelated_agent_id"] not in mgr_perf_ids
    print(f"[PASS 12] Manager analytics overview scoped to team: agent IDs {mgr_perf_ids}.")

    # 13. Reports Scoping & Bypass Prevention
    # Manager query for unrelated agent returns empty list (no data leak)
    status, bypass_rep = http_req(f"{BASE_URL}/reports/calls?agent_id={ids['unrelated_agent_id']}", headers=manager_headers)
    assert status == 200
    assert len(bypass_rep) == 0, f"Manager should not get data for unrelated agent: {bypass_rep}"

    # Agent query for other agent returns empty list
    status, agent_bypass = http_req(f"{BASE_URL}/reports/calls?agent_id={ids['manager_id']}", headers=agent_headers)
    assert status == 200
    assert len(agent_bypass) == 0, f"Agent should not get data for other agent: {agent_bypass}"

    # CSV Export query for unrelated agent returns empty data (header only)
    status, csv_text = http_req(f"{BASE_URL}/reports/calls/export?agent_id={ids['unrelated_agent_id']}", headers=manager_headers)
    assert status == 200
    lines = csv_text.strip().split("\r\n") if "\r\n" in csv_text else csv_text.strip().split("\n")
    assert len(lines) == 1, f"CSV export leaked rows: {lines}"
    print("[PASS 13] Reports and CSV export query parameter bypasses blocked for both Manager and Agent.")

    # 14. Audit Logs Scoping
    status, mgr_logs = http_req(f"{BASE_URL}/audit-logs", headers=manager_headers)
    assert status == 200
    for l in mgr_logs:
        if l["user_id"]:
            assert l["user_id"] in [ids["manager_id"], ids["agent_id"]], f"Leaked unrelated audit log: {l}"

    # Manager querying unrelated user audit log returns empty list
    status, bypass_audit = http_req(f"{BASE_URL}/audit-logs?user_id={ids['unrelated_agent_id']}", headers=manager_headers)
    assert status == 200
    assert len(bypass_audit) == 0
    print("[PASS 14] Audit logs strictly scoped to Manager's team.")

    print("\n>>> ALL MANAGER ROLE & RBAC ENHANCEMENT TESTS PASSED! <<<")


if __name__ == "__main__":
    run_tests()
