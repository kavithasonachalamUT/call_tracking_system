import os
import sys
import subprocess

SCRATCH_DIR = r"C:\Users\UTIS LAPTOP\.gemini\antigravity\brain\7ac1d548-24be-461c-8535-4ea0844ef4b8\scratch"
LOCAL_SCRATCH = r"c:\Users\UTIS LAPTOP\call-tracking-system\backend\scratch"

TEST_FILES = [
    os.path.join(LOCAL_SCRATCH, "test_manager_rbac_integration.py"),
    os.path.join(SCRATCH_DIR, "test_auth.py"),
    os.path.join(SCRATCH_DIR, "test_users_rbac.py"),
    os.path.join(SCRATCH_DIR, "test_customers.py"),
    os.path.join(SCRATCH_DIR, "test_customer_management.py"),
    os.path.join(SCRATCH_DIR, "test_platforms.py"),
    os.path.join(SCRATCH_DIR, "test_calls.py"),
    os.path.join(SCRATCH_DIR, "test_call_outcomes.py"),
    os.path.join(SCRATCH_DIR, "test_follow_ups.py"),
    os.path.join(SCRATCH_DIR, "test_notifications.py"),
    os.path.join(SCRATCH_DIR, "test_audit_logs.py"),
    os.path.join(SCRATCH_DIR, "test_analytics.py"),
    os.path.join(SCRATCH_DIR, "test_dashboard.py"),
    os.path.join(SCRATCH_DIR, "test_reporting_exports.py"),
    os.path.join(SCRATCH_DIR, "test_communication_integration.py"),
    os.path.join(SCRATCH_DIR, "test_recording_integration.py"),
    os.path.join(SCRATCH_DIR, "test_final_e2e_integration.py"),
]

def main():
    print("=" * 60)
    print("RUNNING COMPLETE BACKEND REGRESSION SUITE")
    print("=" * 60)

    passed = 0
    failed = 0
    failures = []

    for filepath in TEST_FILES:
        basename = os.path.basename(filepath)
        if not os.path.exists(filepath):
            print(f"[SKIP] {basename} (not found)")
            continue

        print(f"\n--- Running {basename} ---")
        res = subprocess.run([sys.executable, filepath], capture_output=True, text=True)
        if res.returncode == 0:
            print(f"[PASSED] {basename}")
            passed += 1
        else:
            print(f"[FAILED] {basename}")
            print("STDOUT:\n", res.stdout[-600:] if len(res.stdout) > 600 else res.stdout)
            print("STDERR:\n", res.stderr[-600:] if len(res.stderr) > 600 else res.stderr)
            failed += 1
            failures.append(basename)

    print("\n" + "=" * 60)
    print(f"REGRESSION SUITE RESULTS: Total={passed + failed} | Passed={passed} | Failed={failed}")
    print("=" * 60)
    if failed > 0:
        print(f"Failed test files: {failures}")
        sys.exit(1)
    else:
        print(">>> ALL REGRESSION TESTS PASSED CLEANLY WITH ZERO FAILURES! <<<")

if __name__ == "__main__":
    main()
