from typing import Literal
from datetime import datetime
from pydantic import BaseModel, Field


class Login(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(min_length=1, max_length=256)


class RoutineInput(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    description: str = Field(default="", max_length=1000)
    category: str = Field(default="Custom", max_length=50)
    scheduled_time: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    repeat_rule: Literal["daily", "weekdays", "once"] = "daily"
    priority: Literal["normal", "high"] = "normal"


class MedicineInput(BaseModel):
    medicine_name: str = Field(min_length=1, max_length=150)
    dosage: str = Field(min_length=1, max_length=100)
    instructions: str = Field(default="", max_length=1000)
    scheduled_time: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    repeat_rule: Literal["daily", "weekdays", "once"] = "daily"
    grace_period_minutes: int = Field(default=30, ge=1, le=180)


class FamilyInput(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    relation: str = Field(min_length=1, max_length=100)
    memory_note: str = Field(default="", max_length=1000)
    important_facts: str = Field(default="", max_length=1000)


class StatusInput(BaseModel):
    status: Literal["completed", "taken", "snoozed"]
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    event_id: str = Field(min_length=8, max_length=100)


class AttemptInput(BaseModel):
    person_id: int | None = None
    correct: bool
    response_time: float = Field(ge=0, le=86400)
    hints_used: int = Field(default=0, ge=0, le=100)


class GameInput(BaseModel):
    event_id: str = Field(min_length=8, max_length=100)
    game_type: Literal["memory", "object", "sequence", "family"]
    difficulty: Literal["easy", "medium", "hard"]
    accuracy: float = Field(ge=0, le=100)
    response_time: float = Field(ge=0, le=86400)
    mistakes: int = Field(default=0, ge=0, le=10000)
    hints_used: int = Field(default=0, ge=0, le=10000)
    moves: int = Field(default=0, ge=0, le=10000)
    started_at: datetime
    attempts: list[AttemptInput] = Field(default_factory=list, max_length=1000)


class SettingsInput(BaseModel):
    language: Literal["en", "hi", "as"] = "en"
    text_size: Literal["normal", "large", "extra"] = "normal"
    voice: bool = True
    notifications: bool = False
    reduced_motion: bool = False


class VoiceInput(BaseModel):
    query: str = Field(min_length=1, max_length=500)
