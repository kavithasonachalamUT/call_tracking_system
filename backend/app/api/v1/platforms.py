from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.platform import PlatformCreate, PlatformResponse, PlatformUpdate
from app.services import platform as platform_service

router = APIRouter()


@router.post("", response_model=PlatformResponse, status_code=status.HTTP_201_CREATED, summary="Create a new communication platform")
def create_platform(
    platform_in: PlatformCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return platform_service.create_platform(db=db, platform_in=platform_in)


@router.get("", response_model=List[PlatformResponse], summary="List communication platforms with pagination and search")
def list_platforms(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Max number of items to return"),
    search: Optional[str] = Query(None, description="Search term for platform name or code"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return platform_service.get_platforms(db=db, skip=skip, limit=limit, search=search)


@router.get("/{platform_id}", response_model=PlatformResponse, summary="Get platform by ID")
def get_platform(
    platform_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    platform = platform_service.get_platform(db=db, platform_id=platform_id)
    if not platform:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Platform not found"
        )
    return platform


@router.put("/{platform_id}", response_model=PlatformResponse, summary="Update platform by ID")
def update_platform(
    platform_id: int,
    platform_in: PlatformUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    platform = platform_service.get_platform(db=db, platform_id=platform_id)
    if not platform:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Platform not found"
        )
    return platform_service.update_platform(db=db, db_platform=platform, platform_in=platform_in)


@router.delete("/{platform_id}", response_model=PlatformResponse, summary="Soft deactivate platform by ID")
def delete_platform(
    platform_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    platform = platform_service.get_platform(db=db, platform_id=platform_id)
    if not platform:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Platform not found"
        )
    return platform_service.delete_platform(db=db, db_platform=platform)
