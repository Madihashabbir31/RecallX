import os, tempfile
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite:///" + str(Path(tempfile.mkdtemp()) / "test.db")
os.environ["DEMO_MODE"] = "true"
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from io import BytesIO
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from app.main import app
from app.db.session import SessionLocal
from app.models.entities import User, MedicationLog, Alert
from app.core.security import hash_password, token
from app.services.care import process_due


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def accounts(client):
    p = client.post("/api/auth/demo/patient").json()
    c = client.post("/api/auth/demo/caregiver").json()
    return (
        p["user"]["id"],
        {"Authorization": "Bearer " + p["token"]},
        {"Authorization": "Bearer " + c["token"]},
    )


def test_auth_boundaries(client, accounts):
    pid, p, c = accounts
    assert client.get(f"/api/patients/{pid}/snapshot").status_code == 401
    assert (
        client.post(
            "/api/auth/login", json={"email": "asha@recallx.demo", "password": "wrong"}
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/api/auth/login",
            json={"email": "asha@recallx.demo", "password": "RecallX@2026"},
        ).status_code
        == 200
    )
    assert client.get("/api/patients/999/snapshot", headers=c).status_code == 403
    assert (
        client.post(
            f"/api/patients/{pid}/routine",
            headers=p,
            json={"title": "Task", "scheduled_time": "11:30"},
        ).status_code
        == 403
    )
    with SessionLocal() as db:
        stranger = User(
            email="other@test.local",
            name="Other",
            role="caregiver",
            password_hash=hash_password("other"),
        )
        db.add(stranger)
        db.commit()
        other = {"Authorization": "Bearer " + token(stranger)}
    assert client.get(f"/api/patients/{pid}/snapshot", headers=other).status_code == 403


def test_routine_round_trip(client, accounts):
    pid, p, c = accounts
    r = client.post(
        f"/api/patients/{pid}/routine",
        headers=c,
        json={"title": "Read together", "scheduled_time": "12:00"},
    )
    assert r.status_code == 200
    rid = r.json()["id"]
    snap = client.get(f"/api/patients/{pid}/snapshot", headers=p).json()
    assert any(x["id"] == rid for x in snap["routines"])
    body = {"date": snap["date"], "status": "completed", "event_id": str(uuid4())}
    assert (
        client.post(f"/api/routine/{rid}/status", headers=p, json=body).status_code
        == 200
    )
    assert (
        client.post(f"/api/routine/{rid}/status", headers=p, json=body).status_code
        == 200
    )
    rows = client.get(f"/api/patients/{pid}/snapshot", headers=c).json()["routines"]
    assert next(x for x in rows if x["id"] == rid)["status"] == "completed"
    assert (
        client.put(
            f"/api/routine/{rid}",
            headers=c,
            json={"title": "Read a story", "scheduled_time": "12:30"},
        ).status_code
        == 200
    )
    assert client.delete(f"/api/routine/{rid}", headers=c).status_code == 200
    assert all(
        x["id"] != rid
        for x in client.get(f"/api/patients/{pid}/snapshot", headers=p).json()[
            "routines"
        ]
    )


def test_medication_taken_missed_and_alert_deduplication(client, accounts):
    pid, p, c = accounts
    r = client.post(
        f"/api/patients/{pid}/medications",
        headers=c,
        json={
            "medicine_name": "Test reminder",
            "dosage": "Demo dose",
            "scheduled_time": "23:59",
        },
    )
    assert r.status_code == 200
    mid = r.json()["id"]
    snap = client.get(f"/api/patients/{pid}/snapshot", headers=p).json()
    assert (
        client.post(
            f"/api/medications/{mid}/status",
            headers=p,
            json={"date": snap["date"], "status": "taken", "event_id": str(uuid4())},
        ).json()["status"]
        == "taken"
    )
    demo = client.post(f"/api/patients/{pid}/demo-reminder", headers=p).json()
    deadline = datetime.fromisoformat(demo["deadline"])
    assert 28 < (deadline - datetime.now(timezone.utc)).total_seconds() <= 30
    with SessionLocal() as db:
        process_due(db, at=deadline + timedelta(seconds=1))
        process_due(db, at=deadline + timedelta(seconds=2))
        log = db.query(MedicationLog).filter_by(medication_id=demo["id"]).one()
        assert log.status == "missed"
        alerts = (
            db.query(Alert).filter(Alert.source_key.like(f"medicine:{log.id}:%")).all()
        )
        assert len(alerts) == 1
        aid = alerts[0].id
    assert client.post(f"/api/alerts/{aid}/read", headers=p).status_code == 403
    assert client.post(f"/api/alerts/{aid}/read", headers=c).json()["read"] is True


def test_family_photo_validation_and_privacy(client, accounts):
    pid, p, c = accounts
    r = client.post(
        f"/api/patients/{pid}/family",
        headers=c,
        json={"name": "Test person", "relation": "Friend"},
    )
    assert r.status_code == 200
    rid = r.json()["id"]
    assert (
        client.post(
            f"/api/family/{rid}/photo",
            headers=c,
            files={"file": ("x.jpg", b"not an image", "image/jpeg")},
        ).status_code
        == 422
    )
    image = BytesIO()
    Image.new("RGB", (50, 50), "green").save(image, format="PNG")
    assert (
        client.post(
            f"/api/family/{rid}/photo",
            headers=c,
            files={"file": ("photo.png", image.getvalue(), "image/png")},
        ).status_code
        == 200
    )
    assert client.get(f"/api/family/{rid}/photo").status_code == 401
    assert client.get(f"/api/family/{rid}/photo", headers=p).status_code == 200
    assert client.delete(f"/api/family/{rid}", headers=p).status_code == 403
    assert client.delete(f"/api/family/{rid}", headers=c).status_code == 200


@pytest.mark.parametrize("game", ["memory", "object", "sequence", "family"])
def test_game_persistence_idempotency(client, accounts, game):
    pid, p, c = accounts
    before = client.get(f"/api/patients/{pid}/progress", headers=p).json()[
        "total_sessions"
    ]
    body = {
        "event_id": str(uuid4()),
        "game_type": game,
        "difficulty": "easy",
        "accuracy": 90,
        "response_time": 30,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "attempts": [],
    }
    r = client.post(f"/api/patients/{pid}/games/sessions", headers=p, json=body)
    assert r.status_code == 200
    assert (
        client.post(f"/api/patients/{pid}/games/sessions", headers=p, json=body).json()[
            "id"
        ]
        == r.json()["id"]
    )
    assert (
        client.get(f"/api/patients/{pid}/progress", headers=c).json()["total_sessions"]
        == before + 1
    )
    assert (
        client.post(
            f"/api/patients/{pid}/games/sessions",
            headers=p,
            json={**body, "event_id": str(uuid4()), "accuracy": 150},
        ).status_code
        == 422
    )


def test_adaptation_voice_settings(client, accounts):
    pid, p, c = accounts
    for _ in range(3):
        client.post(
            f"/api/patients/{pid}/games/sessions",
            headers=p,
            json={
                "event_id": str(uuid4()),
                "game_type": "memory",
                "difficulty": "easy",
                "accuracy": 95,
                "response_time": 30,
                "started_at": datetime.now(timezone.utc).isoformat(),
            },
        )
    assert (
        client.get(f"/api/patients/{pid}/progress", headers=p).json()[
            "recommendations"
        ]["memory"]["next_level"]
        == "medium"
    )
    assert (
        "Pune"
        in client.post(
            f"/api/patients/{pid}/voice", headers=p, json={"query": "Who is Rahul?"}
        ).json()["response"]
    )
    assert (
        client.put(
            "/api/settings",
            headers=p,
            json={
                "language": "hi",
                "text_size": "large",
                "voice": True,
                "notifications": False,
                "reduced_motion": True,
            },
        ).status_code
        == 200
    )
    assert client.get("/api/settings", headers=p).json()["language"] == "hi"
    assert client.get("/api/settings", headers=c).json()["language"] == "en"
