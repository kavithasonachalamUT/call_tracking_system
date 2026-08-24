from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.customer import CustomerCreate, CustomerResponse, CustomerUpdate
from app.services import customer as customer_service

router = APIRouter()


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED, summary="Create a new customer profile")
def create_customer(
    customer_in: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return customer_service.create_customer(db=db, customer_in=customer_in)


@router.get("", response_model=List[CustomerResponse], summary="List customers with phone/name/email search and pagination")
def list_customers(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Max number of items to return"),
    search: Optional[str] = Query(None, description="Search by phone, name, email, company, or notes"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return customer_service.get_customers(db=db, skip=skip, limit=limit, search=search)


@router.get("/{customer_id}", response_model=CustomerResponse, summary="Get customer profile by ID")
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = customer_service.get_customer(db=db, customer_id=customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    return customer


@router.put("/{customer_id}", response_model=CustomerResponse, summary="Update customer profile by ID")
def update_customer(
    customer_id: int,
    customer_in: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = customer_service.get_customer(db=db, customer_id=customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    return customer_service.update_customer(db=db, db_customer=customer, customer_in=customer_in)


@router.delete("/{customer_id}", response_model=CustomerResponse, summary="Soft deactivate customer profile by ID")
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = customer_service.get_customer(db=db, customer_id=customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    return customer_service.delete_customer(db=db, db_customer=customer)
