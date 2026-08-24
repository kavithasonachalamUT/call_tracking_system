from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.database import Base


class Call(Base):
    __tablename__ = "calls"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    agent_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    platform_id = Column(Integer, ForeignKey("platforms.id"), nullable=False, index=True)

    call_type = Column(String(50), nullable=False)
    direction = Column(String(20), nullable=False)
    status = Column(String(30), nullable=False)

    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)

    subject = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)

    external_call_id = Column(String(255), nullable=True, index=True)
    meeting_url = Column(Text, nullable=True)
    recording_url = Column(Text, nullable=True)

    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships without cascade delete to preserve call history integrity
    customer = relationship("Customer")
    agent = relationship("User")
    platform = relationship("Platform")
