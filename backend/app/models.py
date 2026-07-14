from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db import Base

class User(Base):
    __tablename__="users"

    id=Column(Integer, primary_key=True, index=True)
    email=Column(String, unique=True, index=True, nullable=False)
    hashed_password=Column(String, nullable=False)
    hashed_recovery_key = Column(String, nullable=False)
    created_at=Column(DateTime, default=datetime.now(timezone.utc))

    reports = relationship("Report", back_populates="owner", cascade="all, delete-orphan")

class Report(Base):
    __tablename__="reports"

    id=Column(Integer, primary_key=True, index=True)
    user_id=Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    title=Column(String, nullable=False)
    overall_verdict=Column(String, nullable=False)
    overall_explanation=Column(Text, nullable=False)
    claims=Column(JSON, nullable=False)
    source_url=Column(String, nullable=True)
    timestamp=Column(DateTime, default=datetime.now(timezone.utc))

    owner = relationship("User", back_populates="reports")
