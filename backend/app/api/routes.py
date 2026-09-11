from datetime import datetime, timezone, timedelta, date
from pathlib import Path
from uuid import uuid4
from io import BytesIO
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from PIL import Image, UnidentifiedImageError
from app.db.session import get_db
from app.core.security import current_user, authorize, token, verify_password
from app.core.config import DEMO_MODE, DEMO_GRACE_SECONDS, DATA
from app.schemas.inputs import *
from app.models.entities import *
from app.services.care import *

router = APIRouter(prefix="/api")


def owned(db, user, model, rid, caregiver=False):
    item = db.get(model, rid)
    if not item or (hasattr(item, "active") and not item.active):
        raise HTTPException(404, "This item is no longer available.")
    authorize(db, user, item.patient_id, caregiver)
    return item


def identity(db, user):
    links = (
        db.query(PatientCaregiverLink).filter_by(caregiver_id=user.id).all()
        if user.role == "caregiver"
        else []
    )
    pids = (
        [x.patient_id for x in links]
        if links
        else ([user.id] if user.role == "patient" else [])
    )
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "patients": [{"id": p, "name": db.get(User, p).name} for p in pids],
        "demo_mode": DEMO_MODE,
    }


@router.get("/health")
def health():
    return {"status": "ok"}


@router.post("/auth/login")
def login(body: Login, db: Session = Depends(get_db)):
    u = db.query(User).filter_by(email=body.email.lower().strip()).first()
    if not u or not verify_password(body.password, u.password_hash):
        raise HTTPException(401, "Email or password is incorrect.")
    return {"token": token(u), "user": identity(db, u)}


@router.post("/auth/demo/{role}")
def demo(role: str, db: Session = Depends(get_db)):
    if not DEMO_MODE:
        raise HTTPException(404, "Demo access is disabled.")
    if role not in ["patient", "caregiver"]:
        raise HTTPException(422, "Choose a valid role.")
    u = (
        db.query(User)
        .filter_by(
            email="asha@recallx.demo" if role == "patient" else "rahul@recallx.demo"
        )
        .first()
    )
    if not u:
        raise HTTPException(404, "Run the demo seed first.")
    return {"token": token(u), "user": identity(db, u)}


@router.get("/auth/me")
def me(u=Depends(current_user), db: Session = Depends(get_db)):
    return identity(db, u)


@router.get("/patients/{pid}/snapshot")
def snapshot(pid: int, u=Depends(current_user), db: Session = Depends(get_db)):
    authorize(db, u, pid)
    process_due(db)
    rt = routines(db, pid)
    md = medications(db, pid)
    pr = progress(db, pid)
    result = {
        "patient": {"id": pid, "name": db.get(User, pid).name},
        "date": today(),
        "routines": rt,
        "medications": md,
        "family": [
            serialize(p)
            for p in db.query(FamilyMember).filter_by(patient_id=pid, active=True)
        ],
        "progress": pr,
        "alerts": (
            [
                serialize(a)
                for a in db.query(Alert)
                .filter_by(patient_id=pid, caregiver_id=u.id)
                .order_by(Alert.id.desc())
            ]
            if u.role == "caregiver"
            else []
        ),
        "demo_mode": DEMO_MODE,
    }
    db.commit()
    return result


@router.get("/settings")
def settings(u=Depends(current_user), db: Session = Depends(get_db)):
    return serialize(db.query(UserSettings).filter_by(user_id=u.id).one())


@router.put("/settings")
def update_settings(
    body: SettingsInput, u=Depends(current_user), db: Session = Depends(get_db)
):
    item = db.query(UserSettings).filter_by(user_id=u.id).one()
    for k, v in body.model_dump().items():
        setattr(item, k, v)
    db.commit()
    return serialize(item)


@router.get("/patients/{pid}/routine")
def routine_list(pid: int, u=Depends(current_user), db: Session = Depends(get_db)):
    authorize(db, u, pid)
    result = routines(db, pid)
    db.commit()
    return result


@router.post("/patients/{pid}/routine")
def create_routine(
    pid: int, body: RoutineInput, u=Depends(current_user), db: Session = Depends(get_db)
):
    authorize(db, u, pid, True)
    item = RoutineTask(patient_id=pid, **body.model_dump())
    db.add(item)
    db.commit()
    return serialize(item)


@router.put("/routine/{rid}")
def edit_routine(
    rid: int, body: RoutineInput, u=Depends(current_user), db: Session = Depends(get_db)
):
    item = owned(db, u, RoutineTask, rid, True)
    for k, v in body.model_dump().items():
        setattr(item, k, v)
    db.commit()
    return serialize(item)


@router.delete("/routine/{rid}")
def delete_routine(rid: int, u=Depends(current_user), db: Session = Depends(get_db)):
    owned(db, u, RoutineTask, rid, True).active = False
    db.commit()
    return {"ok": True}


@router.post("/routine/{rid}/status")
def complete(
    rid: int, body: StatusInput, u=Depends(current_user), db: Session = Depends(get_db)
):
    item = owned(db, u, RoutineTask, rid)
    if body.status != "completed":
        raise HTTPException(422, "Choose completed.")
    try:
        d = date.fromisoformat(body.date)
    except ValueError:
        raise HTTPException(422, "Invalid date.")
    if d > date.fromisoformat(today()):
        raise HTTPException(422, "Future tasks cannot be completed.")
    log = db.query(RoutineLog).filter_by(task_id=rid, date=body.date).first()
    if not log:
        raise HTTPException(
            409, "This task was not scheduled for this date. Refresh your routine."
        )
    if log.status != "completed":
        log.status = "completed"
        log.completed_at = now()
    db.commit()
    return serialize(log)


@router.get("/patients/{pid}/medications")
def medication_list(pid: int, u=Depends(current_user), db: Session = Depends(get_db)):
    authorize(db, u, pid)
    process_due(db)
    result = medications(db, pid)
    db.commit()
    return result


@router.post("/patients/{pid}/medications")
def create_med(
    pid: int,
    body: MedicineInput,
    u=Depends(current_user),
    db: Session = Depends(get_db),
):
    authorize(db, u, pid, True)
    item = Medication(patient_id=pid, **body.model_dump())
    db.add(item)
    db.commit()
    return serialize(item)


@router.put("/medications/{rid}")
def edit_med(
    rid: int,
    body: MedicineInput,
    u=Depends(current_user),
    db: Session = Depends(get_db),
):
    item = owned(db, u, Medication, rid, True)
    for k, v in body.model_dump().items():
        setattr(item, k, v)
    log = (
        db.query(MedicationLog)
        .filter_by(medication_id=rid, date=today(), status="pending")
        .first()
    )
    if log:
        due = (
            datetime.fromisoformat(f"{today()}T{body.scheduled_time}")
            .replace(tzinfo=ZONE)
            .astimezone(timezone.utc)
        )
        log.due_at = due.isoformat()
        log.deadline = (due + timedelta(minutes=body.grace_period_minutes)).isoformat()
    db.commit()
    return serialize(item)


@router.delete("/medications/{rid}")
def delete_med(rid: int, u=Depends(current_user), db: Session = Depends(get_db)):
    owned(db, u, Medication, rid, True).active = False
    db.commit()
    return {"ok": True}


@router.post("/medications/{rid}/status")
def med_status(
    rid: int, body: StatusInput, u=Depends(current_user), db: Session = Depends(get_db)
):
    owned(db, u, Medication, rid)
    if body.status not in ["taken", "snoozed"]:
        raise HTTPException(422, "Choose taken or snoozed.")
    log = db.query(MedicationLog).filter_by(medication_id=rid, date=body.date).first()
    if not log:
        raise HTTPException(
            409, "This medication occurrence is no longer available. Refresh first."
        )
    if log.status == "taken":
        return serialize(log)
    if body.status == "snoozed":
        if log.status == "missed":
            raise HTTPException(
                409, "This reminder has already been missed. Contact your caregiver."
            )
        if log.snoozed_until:
            return serialize(log)
        until = datetime.now(timezone.utc) + timedelta(
            seconds=DEMO_GRACE_SECONDS if DEMO_MODE else 600
        )
        log.snoozed_until = until.isoformat()
        log.deadline = max(datetime.fromisoformat(log.deadline), until).isoformat()
    else:
        log.taken_at = now()
    log.status = body.status
    db.commit()
    return serialize(log)


@router.post("/patients/{pid}/demo-reminder")
def demo_reminder(pid: int, u=Depends(current_user), db: Session = Depends(get_db)):
    authorize(db, u, pid)
    if not DEMO_MODE:
        raise HTTPException(404, "Demo mode is disabled.")
    med = Medication(
        patient_id=pid,
        medicine_name="Demo reminder — no real medicine",
        dosage="Presentation only",
        instructions="Let the timer expire to show a caregiver alert.",
        scheduled_time=datetime.now(ZONE).strftime("%H:%M"),
        repeat_rule="once",
    )
    db.add(med)
    db.flush()
    t = datetime.now(timezone.utc)
    log = MedicationLog(
        medication_id=med.id,
        date=today(),
        due_at=t.isoformat(),
        deadline=(t + timedelta(seconds=DEMO_GRACE_SECONDS)).isoformat(),
    )
    db.add(log)
    db.commit()
    return {"id": med.id, "deadline": log.deadline}


@router.post("/patients/{pid}/family")
def create_family(
    pid: int, body: FamilyInput, u=Depends(current_user), db: Session = Depends(get_db)
):
    authorize(db, u, pid, True)
    item = FamilyMember(patient_id=pid, **body.model_dump())
    db.add(item)
    db.commit()
    return serialize(item)


@router.put("/family/{rid}")
def edit_family(
    rid: int, body: FamilyInput, u=Depends(current_user), db: Session = Depends(get_db)
):
    item = owned(db, u, FamilyMember, rid, True)
    for k, v in body.model_dump().items():
        setattr(item, k, v)
    db.commit()
    return serialize(item)


@router.delete("/family/{rid}")
def delete_family(rid: int, u=Depends(current_user), db: Session = Depends(get_db)):
    owned(db, u, FamilyMember, rid, True).active = False
    db.commit()
    return {"ok": True}


@router.post("/family/{rid}/photo")
async def upload(
    rid: int,
    file: UploadFile = File(...),
    u=Depends(current_user),
    db: Session = Depends(get_db),
):
    item = owned(db, u, FamilyMember, rid, True)
    raw = await file.read(5 * 1024 * 1024 + 1)
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(413, "Choose a photo smaller than 5 MB.")
    try:
        im = Image.open(BytesIO(raw))
        if im.format not in ["JPEG", "PNG", "WEBP"] or im.width * im.height > 20000000:
            raise ValueError()
        im.load()
        im.thumbnail((1000, 1000))
        im = im.convert("RGB")
    except (UnidentifiedImageError, ValueError, OSError, Image.DecompressionBombError):
        raise HTTPException(422, "Choose a valid JPEG, PNG or WebP photo.")
    directory = DATA / "uploads"
    directory.mkdir(exist_ok=True)
    filename = f"{uuid4().hex}.jpg"
    im.save(directory / filename, "JPEG", quality=88)
    item.photo = filename
    db.commit()
    return serialize(item)


@router.get("/family/{rid}/photo")
def get_photo(rid: int, u=Depends(current_user), db: Session = Depends(get_db)):
    item = owned(db, u, FamilyMember, rid)
    if not item.photo:
        raise HTTPException(404, "No photo yet.")
    return FileResponse(
        DATA / "uploads" / item.photo, headers={"Cache-Control": "private, no-store"}
    )


@router.post("/patients/{pid}/games/sessions")
def save_game(
    pid: int, body: GameInput, u=Depends(current_user), db: Session = Depends(get_db)
):
    authorize(db, u, pid)
    old = db.query(GameSession).filter_by(event_id=body.event_id).first()
    if old:
        if old.patient_id != pid:
            raise HTTPException(409, "Event already exists.")
        return serialize(old)
    for a in body.attempts:
        if a.person_id:
            person = owned(db, u, FamilyMember, a.person_id)
            if person.patient_id != pid:
                raise HTTPException(403, "Family member belongs to another patient.")
    values = body.model_dump(exclude={"attempts"})
    values["started_at"] = body.started_at.isoformat()
    item = GameSession(patient_id=pid, score=body.accuracy, **values)
    db.add(item)
    db.flush()
    for a in body.attempts:
        db.add(GameAttempt(session_id=item.id, **a.model_dump()))
    db.commit()
    return {
        **serialize(item),
        "adaptive": AdaptiveEngineService.recommend(db, pid, body.game_type),
    }


@router.get("/patients/{pid}/progress")
def get_progress(pid: int, u=Depends(current_user), db: Session = Depends(get_db)):
    authorize(db, u, pid)
    return progress(db, pid)


@router.post("/alerts/{rid}/read")
def read_alert(rid: int, u=Depends(current_user), db: Session = Depends(get_db)):
    a = db.get(Alert, rid)
    if not a or a.caregiver_id != u.id:
        raise HTTPException(403, "This alert is not yours.")
    a.read = True
    db.commit()
    return serialize(a)


@router.post("/patients/{pid}/voice")
def voice(
    pid: int, body: VoiceInput, u=Depends(current_user), db: Session = Depends(get_db)
):
    authorize(db, u, pid)
    q = body.query.lower()
    md = medications(db, pid)
    rt = routines(db, pid)
    reply = "You can ask about medicines, your next task, family, games or progress."
    path = None
    if any(w in q for w in ["medicine", "medication", "दवा", "ঔষধ"]):
        items = sorted(
            [m for m in md if m["status"] in ["pending", "snoozed"]],
            key=lambda m: m["due_at"] or "",
        )
        reply = (
            f"Your next medicine is {items[0]['medicine_name']} at {items[0]['scheduled_time']}. {items[0]['instructions']}"
            if items
            else "There are no pending medicines today."
        )
        path = "/patient/medications"
    elif any(w in q for w in ["game", "खेल", "খেল"]):
        reply = "Let’s exercise your memory. Take your time."
        path = "/patient/games/memory"
    elif any(w in q for w in ["progress", "doing", "status", "प्रगति", "অগ্ৰগতি"]):
        pr = progress(db, pid)
        reply = f"You have completed {sum(r['status']=='completed' for r in rt)} routine tasks today and {pr['total_sessions']} memory activities overall."
        path = "/patient/progress"
    elif any(w in q for w in ["task", "routine", "today", "काम", "दिनचर्या", "কাম"]):
        tasks = [r for r in rt if r["status"] == "pending"]
        reply = (
            (
                "Your next task is "
                + tasks[0]["title"]
                + " at "
                + tasks[0]["scheduled_time"]
                + "."
            )
            if tasks
            else "Your scheduled tasks are complete. Well done!"
        )
        path = "/patient/routine"
    else:
        for p in db.query(FamilyMember).filter_by(patient_id=pid, active=True):
            names = [p.name.lower()] + [x.lower() for x in p.name.split()]
            if any(part in q for part in names):
                reply = f"{p.name} is your {p.relation}. {p.memory_note} {p.important_facts}"
                path = "/patient/family"
                break
    db.commit()
    return {"response": reply, "path": path, "engine": "rule-based"}
