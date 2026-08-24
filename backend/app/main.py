from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import api_router
from app.db.database import engine

app = FastAPI(
    title="Call Tracking System",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
def root():
    return {
        "message": "Call Tracking System API is running"
    }


@app.get("/db-test")
def db_test():
    try:
        with engine.connect() as connection:
            return {
                "status": "success",
                "message": "MySQL database connected successfully"
            }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }