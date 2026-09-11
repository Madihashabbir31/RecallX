from datetime import datetime, timezone
from sqlalchemy import (
    String,
    Integer,
    Float,
    Boolean,
    ForeignKey,
    JSON,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column
from app.db.session import Base


def now():
    return datetime.now(timezone.utc).isoformat()


class Record:
    id: Mapped[int] = mapped_column(primary_key=True)
    created_at: Mapped[str] = mapped_column(String, default=now)
    updated_at: Mapped[str] = mapped_column(String, default=now, onupdate=now)


class User(Record, Base):
    __tablename__ = "users"
    email: Mapped[str] = mapped_column(String, unique=True)
    name: Mapped[str] = mapped_column(String)
    password_hash: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String)


class PatientProfile(Record, Base):
    __tablename__ = "patient_profiles"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    timezone: Mapped[str] = mapped_column(String, default="Asia/Kolkata")


class CaregiverProfile(Record, Base):
    __tablename__ = "caregiver_profiles"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)


class PatientCaregiverLink(Record, Base):
    __tablename__ = "patient_caregiver_links"
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    caregiver_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    __table_args__ = (UniqueConstraint("patient_id", "caregiver_id"),)


class RoutineTask(Record, Base):
    __tablename__ = "routine_tasks"
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String, default="")
    category: Mapped[str] = mapped_column(String, default="Custom")
    scheduled_time: Mapped[str] = mapped_column(String)
    repeat_rule: Mapped[str] = mapped_column(String, default="daily")
    priority: Mapped[str] = mapped_column(String, default="normal")
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class RoutineLog(Record, Base):
    __tablename__ = "routine_logs"
    task_id: Mapped[int] = mapped_column(ForeignKey("routine_tasks.id"), index=True)
    date: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="pending")
    completed_at: Mapped[str | None] = mapped_column(String, nullable=True)
    __table_args__ = (UniqueConstraint("task_id", "date"),)


class Medication(Record, Base):
    __tablename__ = "medications"
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    medicine_name: Mapped[str] = mapped_column(String)
    dosage: Mapped[str] = mapped_column(String)
    instructions: Mapped[str] = mapped_column(String, default="")
    scheduled_time: Mapped[str] = mapped_column(String)
    repeat_rule: Mapped[str] = mapped_column(String, default="daily")
    grace_period_minutes: Mapped[int] = mapped_column(Integer, default=30)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class MedicationLog(Record, Base):
    __tablename__ = "medication_logs"
    medication_id: Mapped[int] = mapped_column(ForeignKey("medications.id"), index=True)
    date: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="pending")
    due_at: Mapped[str] = mapped_column(String)
    deadline: Mapped[str] = mapped_column(String)
    taken_at: Mapped[str | None] = mapped_column(String, nullable=True)
    snoozed_until: Mapped[str | None] = mapped_column(String, nullable=True)
    __table_args__ = (UniqueConstraint("medication_id", "date"),)


class FamilyMember(Record, Base):
    __tablename__ = "family_members"
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String)
    relation: Mapped[str] = mapped_column(String)
    photo: Mapped[str] = mapped_column(String, default="")
    memory_note: Mapped[str] = mapped_column(String, default="")
    important_facts: Mapped[str] = mapped_column(String, default="")
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class GameSession(Record, Base):
    __tablename__ = "game_sessions"
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    event_id: Mapped[str] = mapped_column(String, unique=True)
    game_type: Mapped[str] = mapped_column(String)
    difficulty: Mapped[str] = mapped_column(String)
    score: Mapped[float] = mapped_column(Float)
    accuracy: Mapped[float] = mapped_column(Float)
    response_time: Mapped[float] = mapped_column(Float)
    mistakes: Mapped[int] = mapped_column(Integer, default=0)
    hints_used: Mapped[int] = mapped_column(Integer, default=0)
    moves: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[str] = mapped_column(String)
    completed_at: Mapped[str] = mapped_column(String, default=now)
    completion_status: Mapped[str] = mapped_column(String, default="completed")


class GameAttempt(Record, Base):
    __tablename__ = "game_attempts"
    session_id: Mapped[int] = mapped_column(ForeignKey("game_sessions.id"), index=True)
    person_id: Mapped[int | None] = mapped_column(
        ForeignKey("family_members.id"), nullable=True
    )
    correct: Mapped[bool] = mapped_column(Boolean)
    response_time: Mapped[float] = mapped_column(Float)
    hints_used: Mapped[int] = mapped_column(Integer, default=0)


class Alert(Record, Base):
    __tablename__ = "alerts"
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    caregiver_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    type: Mapped[str] = mapped_column(String)
    title: Mapped[str] = mapped_column(String)
    message: Mapped[str] = mapped_column(String)
    severity: Mapped[str] = mapped_column(String, default="info")
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    source_key: Mapped[str] = mapped_column(String, unique=True)


class ProgressMetric(Record, Base):
    __tablename__ = "progress_metrics"
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    date: Mapped[str] = mapped_column(String)
    accuracy: Mapped[float] = mapped_column(Float, default=0)


class UserSettings(Record, Base):
    __tablename__ = "user_settings"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    language: Mapped[str] = mapped_column(String, default="en")
    text_size: Mapped[str] = mapped_column(String, default="normal")
    voice: Mapped[bool] = mapped_column(Boolean, default=True)
    notifications: Mapped[bool] = mapped_column(Boolean, default=False)
    reduced_motion: Mapped[bool] = mapped_column(Boolean, default=False)


# Explicit ORM navigation for the principal ownership relationships.
from sqlalchemy.orm import relationship

PatientProfile.user = relationship(User, foreign_keys=[PatientProfile.user_id])
CaregiverProfile.user = relationship(User, foreign_keys=[CaregiverProfile.user_id])
PatientCaregiverLink.patient = relationship(
    User, foreign_keys=[PatientCaregiverLink.patient_id]
)
PatientCaregiverLink.caregiver = relationship(
    User, foreign_keys=[PatientCaregiverLink.caregiver_id]
)
RoutineTask.patient = relationship(User, foreign_keys=[RoutineTask.patient_id])
RoutineTask.logs = relationship(RoutineLog, back_populates="task")
RoutineLog.task = relationship(RoutineTask, back_populates="logs")
Medication.patient = relationship(User, foreign_keys=[Medication.patient_id])
Medication.logs = relationship(MedicationLog, back_populates="medication")
MedicationLog.medication = relationship(Medication, back_populates="logs")
FamilyMember.patient = relationship(User, foreign_keys=[FamilyMember.patient_id])
GameSession.patient = relationship(User, foreign_keys=[GameSession.patient_id])
GameSession.attempts = relationship(GameAttempt, back_populates="session")
GameAttempt.session = relationship(GameSession, back_populates="attempts")
GameAttempt.person = relationship(FamilyMember, foreign_keys=[GameAttempt.person_id])
Alert.patient = relationship(User, foreign_keys=[Alert.patient_id])
Alert.caregiver = relationship(User, foreign_keys=[Alert.caregiver_id])
UserSettings.user = relationship(User, foreign_keys=[UserSettings.user_id])
