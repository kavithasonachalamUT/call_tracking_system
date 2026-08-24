from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin, require_admin_or_manager
from app.db.database import get_db
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserProfileUpdate,
    UserResponse,
    UserRoleEnum,
    UserUpdateAdmin,
)
from app.services import user as user_service

router = APIRouter()


@router.get("/me", response_model=UserResponse, summary="Get current authenticated user profile")
def read_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse, summary="Update current authenticated user profile")
def update_current_user_profile(
    profile_in: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return user_service.update_user_profile(db=db, db_user=current_user, profile_in=profile_in)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Create a new user (Admin only)")
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    return user_service.create_user(db=db, user_in=user_in, current_user=admin_user)


@router.get("", response_model=List[UserResponse], summary="List users (Admin or Manager team scoped)")
def list_users(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Max number of items to return"),
    role: Optional[UserRoleEnum] = Query(None, description="Filter by user role"),
    search: Optional[str] = Query(None, description="Search term for user name or email"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_manager)
):
    return user_service.get_users(
        db=db,
        skip=skip,
        limit=limit,
        role=role.value if role else None,
        search=search,
        current_user=current_user,
    )


@router.get("/{user_id}", response_model=UserResponse, summary="Get user details by ID (Admin or Manager)")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_manager)
):
    user = user_service.get_user(db=db, user_id=user_id, current_user=current_user)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.put("/{user_id}", response_model=UserResponse, summary="Update user by ID (Admin only)")
def update_user(
    user_id: int,
    user_in: UserUpdateAdmin,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    user = user_service.get_user(db=db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user_service.update_user_admin(db=db, db_user=user, user_in=user_in)


@router.delete("/{user_id}", response_model=UserResponse, summary="Deactivate user by ID (Admin only)")
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    user = user_service.get_user(db=db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user_service.deactivate_user(db=db, db_user=user)
