"""A real-clock 30-second reminder and compiled-frontend smoke check."""

import os, tempfile, time, re
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite:///" + str(Path(tempfile.mkdtemp()) / "smoke.db")
os.environ["DEMO_MODE"] = "true"
os.environ["DEMO_GRACE_SECONDS"] = "30"
from fastapi.testclient import TestClient
from app.main import app

with TestClient(app) as client:
    root = client.get("/")
    assert root.status_code == 200 and "RecallX" in root.text
    assert client.get("/patient/games/memory").status_code == 200
    assets = re.findall(r'(?:src|href)="(/assets/[^"]+)"', root.text)
    assert assets and all(client.get(path).status_code == 200 for path in assets)
    worker = client.get("/sw.js")
    assert worker.status_code == 200 and "recallx-shell-" in worker.text
    assert client.get("/manifest.webmanifest").status_code == 200
    p = client.post("/api/auth/demo/patient").json()
    c = client.post("/api/auth/demo/caregiver").json()
    ph = {"Authorization": "Bearer " + p["token"]}
    ch = {"Authorization": "Bearer " + c["token"]}
    pid = p["user"]["id"]
    demo = client.post(f"/api/patients/{pid}/demo-reminder", headers=ph).json()
    start = time.monotonic()
    time.sleep(33)
    result = client.get(f"/api/patients/{pid}/snapshot", headers=ch).json()
    medicine = next(m for m in result["medications"] if m["id"] == demo["id"])
    assert medicine["status"] == "missed"
    alerts = [
        a
        for a in result["alerts"]
        if a["type"] == "missed_medication" and "Demo reminder" in a["message"]
    ]
    assert len(alerts) == 1
    assert client.post(f'/api/alerts/{alerts[0]["id"]}/read', headers=ch).json()["read"]
    print(
        f"PASS: compiled frontend, deep routes, assets, manifest, service worker, demo login, real reminder expiry in {time.monotonic()-start:.1f}s and caregiver acknowledgement."
    )
