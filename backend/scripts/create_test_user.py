import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash


def create_test_user():
    db = SessionLocal()
    try:
        test_email = "test@example.com"
        test_password = "password123"

        existing_user = db.query(User).filter(User.email == test_email).first()
        if existing_user:
            print(f"Test user '{test_email}' already exists. Updating password and active state...")
            existing_user.password_hash = get_password_hash(test_password)
            existing_user.is_active = True
            existing_user.role = "agent"
            existing_user.name = "Test Agent"
            db.commit()
            db.refresh(existing_user)
            print(f"Test user updated successfully. ID: {existing_user.id}")
        else:
            hashed_pwd = get_password_hash(test_password)
            user = User(
                name="Test Agent",
                email=test_email,
                password_hash=hashed_pwd,
                role="agent",
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"Test user created successfully! ID: {user.id}")
            print(f"Email: {test_email}")
            print(f"Password: {test_password}")
    except Exception as e:
        db.rollback()
        print(f"Error creating test user: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    create_test_user()
