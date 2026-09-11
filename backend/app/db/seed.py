from datetime import datetime, timedelta, timezone
from uuid import uuid4
from app.models.entities import *
from app.core.security import hash_password
from app.services.care import today, ensure_occurrences, ZONE


def seed(db):
    if db.query(User).first():
        return
    password = hash_password("RecallX@2026")
    patient = User(
        email="asha@recallx.demo",
        name="Asha Ji",
        role="patient",
        password_hash=password,
    )
    caregiver = User(
        email="rahul@recallx.demo",
        name="Rahul",
        role="caregiver",
        password_hash=password,
    )
    db.add_all([patient, caregiver])
    db.flush()
    db.add_all(
        [
            PatientProfile(user_id=patient.id),
            CaregiverProfile(user_id=caregiver.id),
            PatientCaregiverLink(patient_id=patient.id, caregiver_id=caregiver.id),
            UserSettings(user_id=patient.id),
            UserSettings(user_id=caregiver.id),
        ]
    )
    for title, category, time in [
        ("Brush your teeth", "Personal Care", "07:00"),
        ("Have breakfast", "Breakfast", "08:00"),
        ("Take a gentle walk", "Walking", "09:00"),
        ("Drink a glass of water", "Hydration", "11:00"),
        ("Have lunch", "Lunch", "13:00"),
        ("Call your family", "Custom", "18:00"),
    ]:
        db.add(
            RoutineTask(
                patient_id=patient.id,
                title=title,
                category=category,
                scheduled_time=time,
                description="Take your time. Every small step counts.",
            )
        )
    for name, time in [
        ("Morning demo medicine", "08:30"),
        ("Evening demo medicine", "20:00"),
    ]:
        db.add(
            Medication(
                patient_id=patient.id,
                medicine_name=name,
                dosage="Sample dose",
                scheduled_time=time,
                instructions="Fictional demo reminder. Use only your prescribed medication plan.",
            )
        )
    for name, relation, note, facts in [
        (
            "Sunita Sharma",
            "Wife",
            "You and Sunita take gentle evening walks in the garden together.",
            "Enjoys morning classical music and herbal tea.",
        ),
        (
            "Rajesh Sharma",
            "Son",
            "Rajesh lives in Pune and calls every evening on video.",
            "Works as an engineer and loves cricket.",
        ),
        (
            "Anita Sharma",
            "Daughter",
            "Anita brings warm homemade soup on weekends.",
            "Loves gardening and reading historical books.",
        ),
        (
            "Aarav Sharma",
            "Grandson",
            "Aarav loves telling you animated stories about his school projects.",
            "Plays badminton and loves drawing spaceships.",
        ),
        (
            "Priya Sharma",
            "Granddaughter",
            "Priya practices recitation with you and loves your folk stories.",
            "Loves classical dance and painting.",
        ),
        (
            "Vikram Sharma",
            "Brother",
            "You and Vikram chat about childhood memories and ancestral village.",
            "Loves newspaper crosswords and old melodies.",
        ),
        (
            "Meera Sharma",
            "Sister",
            "Meera visits on festivals and sends warm festive sweets.",
            "Enjoys knitting and cooking traditional delicacies.",
        ),
    ]:
        db.add(
            FamilyMember(
                patient_id=patient.id,
                name=name,
                relation=relation,
                memory_note=note,
                important_facts=facts,
            )
        )
    db.flush()
    for offset in range(6, -1, -1):
        day = (datetime.now(ZONE).date() - timedelta(days=offset)).isoformat()
        ensure_occurrences(db, patient.id, day)
        for i, log in enumerate(db.query(RoutineLog).filter_by(date=day)):
            log.status = (
                "completed"
                if i < (3 if offset == 0 else 5)
                else ("pending" if offset == 0 else "missed")
            )
            if log.status == "completed":
                log.completed_at = f"{day}T04:00:00+00:00"
        for i, log in enumerate(db.query(MedicationLog).filter_by(date=day)):
            log.status = "taken" if offset or i == 0 else "pending"
            if log.status == "taken":
                log.taken_at = log.due_at
        done = (
            datetime.fromisoformat(day + "T10:00:00")
            .replace(tzinfo=ZONE)
            .astimezone(timezone.utc)
            .isoformat()
        )
        for game in ["memory", "object", "sequence", "family"]:
            score = 65 + (6 - offset) * 4 + (3 if game == "object" else 0)
            db.add(
                GameSession(
                    patient_id=patient.id,
                    event_id=str(uuid4()),
                    game_type=game,
                    difficulty="easy",
                    score=score,
                    accuracy=score,
                    response_time=100 - offset * 2,
                    mistakes=2,
                    moves=8,
                    started_at=done,
                    completed_at=done,
                )
            )
    db.add_all(
        [
            Alert(
                patient_id=patient.id,
                caregiver_id=caregiver.id,
                type="general",
                title="Welcome to your care circle",
                message="Asha Ji is connected. All initial records are sample demo data.",
                severity="info",
                source_key="welcome",
                read=False,
            ),
            Alert(
                patient_id=patient.id,
                caregiver_id=caregiver.id,
                type="routine_missed",
                title="Previous routine reviewed",
                message="Yesterday’s routine was reviewed with Asha Ji. Sample demo record.",
                severity="warning",
                source_key="seed-resolved",
                read=True,
            ),
        ]
    )
    db.commit()
