from typing import List, Optional
from sqlalchemy import or_
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.platform import Platform
from app.schemas.platform import PlatformCreate, PlatformUpdate


def get_platform(db: Session, platform_id: int) -> Optional[Platform]:
    return db.query(Platform).filter(Platform.id == platform_id).first()


def get_platform_by_name(db: Session, name: str) -> Optional[Platform]:
    return db.query(Platform).filter(Platform.name == name).first()


def get_platform_by_code(db: Session, code: str) -> Optional[Platform]:
    return db.query(Platform).filter(Platform.code == code).first()


def get_platforms(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None
) -> List[Platform]:
    query = db.query(Platform)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Platform.name.ilike(search_pattern),
                Platform.code.ilike(search_pattern)
            )
        )
    return query.offset(skip).limit(limit).all()


def create_platform(db: Session, platform_in: PlatformCreate) -> Platform:
    if get_platform_by_name(db, name=platform_in.name):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Platform with name '{platform_in.name}' already exists"
        )
    if get_platform_by_code(db, code=platform_in.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Platform with code '{platform_in.code}' already exists"
        )

    db_platform = Platform(
        name=platform_in.name,
        code=platform_in.code,
        description=platform_in.description,
        is_active=platform_in.is_active,
    )
    db.add(db_platform)
    db.commit()
    db.refresh(db_platform)
    return db_platform


def update_platform(db: Session, db_platform: Platform, platform_in: PlatformUpdate) -> Platform:
    update_data = platform_in.model_dump(exclude_unset=True)

    if "name" in update_data and update_data["name"] != db_platform.name:
        existing = get_platform_by_name(db, name=update_data["name"])
        if existing and existing.id != db_platform.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Platform with name '{update_data['name']}' already exists"
            )

    if "code" in update_data and update_data["code"] != db_platform.code:
        existing = get_platform_by_code(db, code=update_data["code"])
        if existing and existing.id != db_platform.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Platform with code '{update_data['code']}' already exists"
            )

    for field, value in update_data.items():
        setattr(db_platform, field, value)

    db.commit()
    db.refresh(db_platform)
    return db_platform


def delete_platform(db: Session, db_platform: Platform) -> Platform:
    """Soft deactivation of platform to preserve historical reference integrity."""
    db_platform.is_active = False
    db.commit()
    db.refresh(db_platform)
    return db_platform
