from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.customers import router as customers_router
from app.api.v1.platforms import router as platforms_router
from app.api.v1.calls import router as calls_router
from app.api.v1.call_outcomes import router as call_outcomes_router
from app.api.v1.follow_ups import router as follow_ups_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.call_dashboard import router as dashboard_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.audit_logs import router as audit_logs_router
from app.api.v1.reports import router as reports_router
from app.api.v1.webhooks import router as webhooks_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users_router, prefix="/users", tags=["Users & RBAC"])
api_router.include_router(customers_router, prefix="/customers", tags=["Customers"])
api_router.include_router(platforms_router, prefix="/platforms", tags=["Platforms"])
api_router.include_router(calls_router, prefix="/calls", tags=["Calls"])
api_router.include_router(call_outcomes_router, tags=["Call Outcomes"])
api_router.include_router(follow_ups_router, tags=["Follow-ups"])
api_router.include_router(analytics_router, prefix="/analytics", tags=["Call Analytics"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["Call Dashboard & Activity"])
api_router.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(audit_logs_router, prefix="/audit-logs", tags=["Audit Logs & Activity History"])
api_router.include_router(reports_router, prefix="/reports", tags=["Reporting & Data Export"])
api_router.include_router(webhooks_router, prefix="/webhooks", tags=["Provider Webhooks"])
