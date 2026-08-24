from typing import List, Optional
from sqlalchemy import or_
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate


def get_customer(db: Session, customer_id: int) -> Optional[Customer]:
    return db.query(Customer).filter(Customer.id == customer_id, Customer.is_active == True).first()


def get_customer_by_phone(db: Session, phone: str) -> Optional[Customer]:
    return db.query(Customer).filter(Customer.phone == phone, Customer.is_active == True).first()


def get_customers(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
) -> List[Customer]:
    query = db.query(Customer).filter(Customer.is_active == True)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Customer.phone.ilike(search_pattern),
                Customer.name.ilike(search_pattern),
                Customer.email.ilike(search_pattern),
                Customer.company.ilike(search_pattern),
                Customer.notes.ilike(search_pattern)
            )
        )

    return query.order_by(Customer.created_at.desc()).offset(skip).limit(limit).all()


def create_customer(db: Session, customer_in: CustomerCreate) -> Customer:
    existing = db.query(Customer).filter(Customer.phone == customer_in.phone).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Customer with phone number '{customer_in.phone}' already exists"
        )

    db_customer = Customer(
        name=customer_in.name,
        phone=customer_in.phone,
        email=customer_in.email,
        company=customer_in.company,
        address=customer_in.address,
        notes=customer_in.notes,
        is_active=True,
    )
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer


def update_customer(db: Session, db_customer: Customer, customer_in: CustomerUpdate) -> Customer:
    update_data = customer_in.model_dump(exclude_unset=True)

    if "phone" in update_data and update_data["phone"] != db_customer.phone:
        existing = db.query(Customer).filter(Customer.phone == update_data["phone"]).first()
        if existing and existing.id != db_customer.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Customer with phone number '{update_data['phone']}' already exists"
            )

    for field, value in update_data.items():
        setattr(db_customer, field, value)

    db.commit()
    db.refresh(db_customer)
    return db_customer


def delete_customer(db: Session, db_customer: Customer) -> Customer:
    """Soft deactivation: sets is_active = False keeping customer record for call history."""
    db_customer.is_active = False
    db.commit()
    db.refresh(db_customer)
    return db_customer
