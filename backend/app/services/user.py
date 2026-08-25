from typing import List, Optional
from sqlalchemy import or_
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User
from app.core.security import get_password_hash
from app.schemas.user import UserCreate, UserUpdateAdmin, UserProfileUpdate


def validate_manager_exists_and_active(db: Session, manager_id: Optional[int]) -> Optional[User]:
    if manager_id is None:
        return None
    mgr = db.query(User).filter(User.id == manager_id).first()
    if not mgr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Manager with ID {manager_id} not found"
        )
    if not mgr.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign user to an inactive manager"
        )
    if mgr.role not in ["manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with ID {manager_id} does not have a manager or admin role (role='{mgr.role}')"
        )
    return mgr


def get_user(db: Session, user_id: int, current_user: Optional[User] = None) -> Optional[User]:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    if current_user:
        if current_user.role == "admin":
            return user
        elif current_user.role == "manager":
            if user.id != current_user.id and user.manager_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: user is outside your managed team"
                )
        else:
            if user.id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )
    return user


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def get_users(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    role: Optional[str] = None,
    search: Optional[str] = None,
    current_user: Optional[User] = None,
) -> List[User]:
    query = db.query(User)

    if current_user:
        if current_user.role == "manager":
            query = query.filter(or_(User.id == current_user.id, User.manager_id == current_user.id))
        elif current_user.role == "agent":
            query = query.filter(User.id == current_user.id)

    if role is not None:
        query = query.filter(User.role == role)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                User.name.ilike(search_pattern),
                User.email.ilike(search_pattern)
            )
        )

    return query.offset(skip).limit(limit).all()


def create_user(db: Session, user_in: UserCreate, current_user: Optional[User] = None) -> User:
    if current_user and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required to create users"
        )

    if get_user_by_email(db, email=user_in.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email '{user_in.email}' already exists"
        )

    validate_manager_exists_and_active(db, user_in.manager_id)

    role_str = user_in.role.value if hasattr(user_in.role, 'value') else user_in.role

    db_user = User(
        name=user_in.name,
        email=user_in.email,
        phone=user_in.phone,
        password_hash=get_password_hash(user_in.password),
        role=role_str,
        manager_id=user_in.manager_id,
        is_active=user_in.is_active,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def update_user_admin(db: Session, db_user: User, user_in: UserUpdateAdmin) -> User:
    update_data = user_in.model_dump(exclude_unset=True)

    if "email" in update_data and update_data["email"] != db_user.email:
        existing = get_user_by_email(db, email=update_data["email"])
        if existing and existing.id != db_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User with email '{update_data['email']}' already exists"
            )

    if "manager_id" in update_data:
        mgr_id = update_data["manager_id"]
        if mgr_id is not None:
            if mgr_id == db_user.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot set a user as their own manager"
                )
            validate_manager_exists_and_active(db, mgr_id)

    if "password" in update_data:
        password = update_data.pop("password")
        if password:
            db_user.password_hash = get_password_hash(password)

    for field, value in update_data.items():
        if hasattr(value, 'value'):
            value = value.value
        setattr(db_user, field, value)

    db.commit()
    db.refresh(db_user)
    return db_user


def update_user_profile(db: Session, db_user: User, profile_in: UserProfileUpdate) -> User:
    update_data = profile_in.model_dump(exclude_unset=True)

    if "email" in update_data and update_data["email"] != db_user.email:
        existing = get_user_by_email(db, email=update_data["email"])
        if existing and existing.id != db_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User with email '{update_data['email']}' already exists"
            )

    if "password" in update_data:
        password = update_data.pop("password")
        if password:
            db_user.password_hash = get_password_hash(password)

    for field, value in update_data.items():
        setattr(db_user, field, value)

    db.commit()
    db.refresh(db_user)
    return db_user


def deactivate_user(db: Session, db_user: User) -> User:
    """Soft deactivation of user entity setting is_active = False."""
    db_user.is_active = False
    db.commit()
    db.refresh(db_user)
    return db_user
