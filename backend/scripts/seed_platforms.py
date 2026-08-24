import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.database import SessionLocal
from app.models.platform import Platform


INITIAL_PLATFORMS = [
    {
        "name": "Phone",
        "code": "phone",
        "description": "Normal telephone calls"
    },
    {
        "name": "WhatsApp",
        "code": "whatsapp",
        "description": "WhatsApp audio/video and chat interactions"
    },
    {
        "name": "Google Meet",
        "code": "google_meet",
        "description": "Google Meet video meetings"
    },
    {
        "name": "Microsoft Teams",
        "code": "microsoft_teams",
        "description": "Microsoft Teams meetings and calls"
    },
    {
        "name": "Zoom",
        "code": "zoom",
        "description": "Zoom meetings and calls"
    },
    {
        "name": "Other Communication",
        "code": "other",
        "description": "Other communication channels and interactions"
    }
]


def seed_platforms():
    db = SessionLocal()
    try:
        count = 0
        for p_data in INITIAL_PLATFORMS:
            existing = db.query(Platform).filter(Platform.code == p_data["code"]).first()
            if not existing:
                platform = Platform(
                    name=p_data["name"],
                    code=p_data["code"],
                    description=p_data["description"],
                    is_active=True
                )
                db.add(platform)
                count += 1
                print(f"Added platform: {p_data['name']} ({p_data['code']})")
            else:
                print(f"Platform already exists: {p_data['name']} ({p_data['code']})")

        db.commit()
        print(f"Successfully seeded/updated platform records in MySQL database.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding platforms: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_platforms()
