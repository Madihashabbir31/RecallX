from datetime import datetime, timedelta, timezone, date
from zoneinfo import ZoneInfo
from sqlalchemy import select
from app.core.config import TIMEZONE, DEMO_GRACE_SECONDS
from app.models.entities import *

try:
    ZONE = ZoneInfo(TIMEZONE)
except Exception:
    ZONE = timezone(timedelta(hours=5, minutes=30))


def today():
    return datetime.now(ZONE).date().isoformat()


def serialize(obj):
    return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}


def scheduled(record, day):
    d = date.fromisoformat(day)
    if record.repeat_rule == "weekdays" and d.weekday() > 4:
        return False
    if (
        record.repeat_rule == "once"
        and datetime.fromisoformat(record.created_at)
        .astimezone(ZONE)
        .date()
        .isoformat()
        != day
    ):
        return False
    return record.active


def ensure_occurrences(db, pid, day=None):
    day = day or today()
    for med in db.scalars(
        select(Medication).where(
            Medication.patient_id == pid, Medication.active == True
        )
    ):
        if not scheduled(med, day):
            continue
        if (
            not db.query(MedicationLog)
            .filter_by(medication_id=med.id, date=day)
            .first()
        ):
            due = (
                datetime.fromisoformat(f"{day}T{med.scheduled_time}")
                .replace(tzinfo=ZONE)
                .astimezone(timezone.utc)
            )
            db.add(
                MedicationLog(
                    medication_id=med.id,
                    date=day,
                    due_at=due.isoformat(),
                    deadline=(
                        due + timedelta(minutes=med.grace_period_minutes)
                    ).isoformat(),
                )
            )
    for task in db.scalars(
        select(RoutineTask).where(
            RoutineTask.patient_id == pid, RoutineTask.active == True
        )
    ):
        if (
            scheduled(task, day)
            and not db.query(RoutineLog).filter_by(task_id=task.id, date=day).first()
        ):
            db.add(RoutineLog(task_id=task.id, date=day))
    db.flush()


def alert(db, pid, kind, title, message, severity, key):
    for link in db.query(PatientCaregiverLink).filter_by(patient_id=pid):
        source = f"{key}:{link.caregiver_id}"
        if not db.query(Alert).filter_by(source_key=source).first():
            db.add(
                Alert(
                    patient_id=pid,
                    caregiver_id=link.caregiver_id,
                    type=kind,
                    title=title,
                    message=message,
                    severity=severity,
                    source_key=source,
                )
            )


def process_due(db, at=None):
    at = at or datetime.now(timezone.utc)
    for patient in db.query(User).filter_by(role="patient"):
        ensure_occurrences(db, patient.id)
    for log in db.query(MedicationLog).filter(
        MedicationLog.status.in_(["pending", "snoozed"])
    ):
        if datetime.fromisoformat(log.deadline) < at:
            med = db.get(Medication, log.medication_id)
            if not med.active:
                continue
            log.status = "missed"
            patient = db.get(User, med.patient_id)
            alert(
                db,
                med.patient_id,
                "missed_medication",
                "Medication needs attention",
                f"{patient.name} has not confirmed {med.medicine_name} scheduled at {med.scheduled_time}.",
                "critical",
                f"medicine:{log.id}",
            )
    for log in db.query(RoutineLog).filter(
        RoutineLog.status == "pending", RoutineLog.date < today()
    ):
        task = db.get(RoutineTask, log.task_id)
        if not task.active:
            continue
        log.status = "missed"
        alert(
            db,
            task.patient_id,
            "routine_missed",
            "A routine task was missed",
            f"{task.title} was not completed on {log.date}.",
            "warning",
            f"routine:{log.id}",
        )
    db.commit()


def routines(db, pid, day=None):
    day = day or today()
    ensure_occurrences(db, pid, day)
    result = []
    for task in (
        db.query(RoutineTask)
        .filter_by(patient_id=pid, active=True)
        .order_by(RoutineTask.scheduled_time)
    ):
        log = db.query(RoutineLog).filter_by(task_id=task.id, date=day).first()
        result.append(
            {
                **serialize(task),
                "status": log.status if log else "not_scheduled",
                "completed_at": log.completed_at if log else None,
                "date": day,
            }
        )
    return result


def medications(db, pid, day=None):
    day = day or today()
    ensure_occurrences(db, pid, day)
    result = []
    for med in (
        db.query(Medication)
        .filter_by(patient_id=pid, active=True)
        .order_by(Medication.scheduled_time)
    ):
        log = db.query(MedicationLog).filter_by(medication_id=med.id, date=day).first()
        result.append(
            {
                **serialize(med),
                "status": log.status if log else "not_scheduled",
                "log_id": log.id if log else None,
                "due_at": log.due_at if log else None,
                "deadline": log.deadline if log else None,
                "snoozed_until": log.snoozed_until if log else None,
                "date": day,
            }
        )
    return result


class AdaptiveEngineService:
    @staticmethod
    def recommend(db, pid, game):
        sessions = (
            db.query(GameSession)
            .filter_by(patient_id=pid, game_type=game)
            .order_by(GameSession.id.desc())
            .limit(3)
            .all()
        )
        levels = ["easy", "medium", "hard"]
        current = sessions[0].difficulty if sessions else "easy"
        level = levels.index(current)
        reason = "Start gently and take your time."
        if sessions and (sessions[0].accuracy < 55 or sessions[0].hints_used > 2):
            level = max(0, level - 1)
            reason = "A gentler activity gives you more time to practise."
        elif len(sessions) == 3 and all(
            s.accuracy >= 85 and s.response_time <= 120 for s in sessions
        ):
            level = min(2, level + 1)
            reason = "Three consistent sessions suggest you are ready for a little more challenge."
        elif sessions:
            reason = "Keep practising at a comfortable pace."
        return {"current_level": current, "next_level": levels[level], "reason": reason}


def progress(db, pid):
    sessions = (
        db.query(GameSession)
        .filter_by(patient_id=pid)
        .order_by(GameSession.completed_at.desc())
        .all()
    )
    weekly = []
    for offset in range(6, -1, -1):
        day = (datetime.now(ZONE).date() - timedelta(days=offset)).isoformat()
        games = [
            s
            for s in sessions
            if datetime.fromisoformat(s.completed_at)
            .astimezone(ZONE)
            .date()
            .isoformat()
            == day
        ]
        rt = (
            db.query(RoutineLog)
            .join(RoutineTask)
            .filter(RoutineTask.patient_id == pid, RoutineLog.date == day)
            .all()
        )
        meds = (
            db.query(MedicationLog)
            .join(Medication)
            .filter(Medication.patient_id == pid, MedicationLog.date == day)
            .all()
        )
        weekly.append(
            {
                "date": day,
                "day": date.fromisoformat(day).strftime("%a"),
                "accuracy": (
                    round(sum(s.accuracy for s in games) / len(games), 1)
                    if games
                    else None
                ),
                "sessions": len(games),
                "response_time": (
                    round(sum(s.response_time for s in games) / len(games), 1)
                    if games
                    else None
                ),
                "routine": (
                    round(100 * sum(x.status == "completed" for x in rt) / len(rt))
                    if rt
                    else 0
                ),
                "medication": (
                    round(100 * sum(x.status == "taken" for x in meds) / len(meds))
                    if meds
                    else 0
                ),
                "difficulty": (
                    {"easy": 1, "medium": 2, "hard": 3}[games[0].difficulty]
                    if games
                    else None
                ),
            }
        )
    active_days = {
        datetime.fromisoformat(s.completed_at).astimezone(ZONE).date() for s in sessions
    }
    d = datetime.now(ZONE).date()
    if d not in active_days:
        d -= timedelta(days=1)
    streak = 0
    while d in active_days:
        streak += 1
        d -= timedelta(days=1)
    family = []
    for person in db.query(FamilyMember).filter_by(patient_id=pid, active=True):
        attempts = db.query(GameAttempt).filter_by(person_id=person.id).all()
        family.append(
            {
                "id": person.id,
                "name": person.name,
                "attempts": len(attempts),
                "accuracy": (
                    round(100 * sum(a.correct for a in attempts) / len(attempts))
                    if attempts
                    else None
                ),
                "weight": 1 + sum(not a.correct for a in attempts[-10:]),
            }
        )
    return {
        "weekly": weekly,
        "memory_score": (
            round(sum(s.accuracy for s in sessions[:10]) / len(sessions[:10]))
            if sessions
            else 0
        ),
        "streak": streak,
        "total_sessions": len(sessions),
        "recent": [serialize(s) for s in sessions[:20]],
        "family": family,
        "recommendations": {
            g: AdaptiveEngineService.recommend(db, pid, g)
            for g in ["memory", "object", "sequence", "family"]
        },
    }
