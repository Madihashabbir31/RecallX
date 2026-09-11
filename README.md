# RecallX

A working local cognitive-care prototype with a React patient app, a caregiver workspace and a Python FastAPI backend. Designed around gentle memory practice, familiar faces, daily routines and caregiver follow-up.

**Purpose:** support cognitive engagement and everyday connection. RecallX does not diagnose dementia, prescribe medication or provide emergency monitoring. Seed medication names and doses are fictional presentation records.

## Start on Windows — no frontend build needed

The ZIP includes the compiled frontend. Install Python 3.11+ with the Python launcher, extract the entire ZIP, and double-click **start-windows.bat**. Keep its terminal open, then visit **http://localhost:8000**. First launch downloads Python dependencies and creates a SQLite database automatically. Later launches reuse the same data.

For macOS/Linux, run `bash start-local.sh` and open the same address. Setup requires internet; after dependencies are installed, the application itself needs no external API or LLM.

Alternatively, from the project root:

```powershell
py -3 -m venv .venv
.venv\Scripts\python -m pip install -r backend\requirements.txt
cd backend
..\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Patient: Asha Ji | asha@recallx.demo | RecallX@2026 |
| Caregiver: Rahul | rahul@recallx.demo | RecallX@2026 |

Use **Enter Patient Demo** or **Enter Caregiver Demo** for one-click access. Demo access is controlled by `DEMO_MODE`. Initial sample history is clearly labelled and generated once; subsequent actions update stored records. To show both accounts simultaneously, use separate browser profiles or a private window. Tabs in one profile share the same account token.

## Architecture

```text
React + TypeScript + Vite patient/caregiver UI
  → shared Fetch services and authenticated REST requests
  → FastAPI / Pydantic validation / JWT authorization
  → SQLAlchemy → SQLite (local) or PostgreSQL
  → background reminder processor → persisted caregiver alerts

Offline patient actions → IndexedDB queue → replay after reconnect
Browser voice → speech recognition → rule-based intent → actual patient data
```

The backend also serves `frontend/dist`, so the packaged build runs on one origin and one port. During frontend development, Vite proxies `/api` to FastAPI.

## Project tree

```text
recallx/
  frontend/
    src/
      components/       Shared UI primitives and optional WebMCP tools
      pages/            Patient, caregiver, authentication and games
      services/         Auth/API, IndexedDB queue, browser voice
      locales/          English, Hindi and Assamese strings
      context.tsx       Account, patient data, settings, sync and alerts
    public/             PWA manifest, icons and service worker
    dist/               Ready-to-run compiled frontend
    tests/              Component interaction tests
    package.json
    package-lock.json
    .env.example
  backend/
    app/
      api/              REST endpoints
      core/             Environment and authentication
      db/               Database, schema initialization, seed
      models/           SQLAlchemy entities
      schemas/          Pydantic request models
      services/         Scheduling, adaptation and analytics
      main.py           API, background worker, static app hosting
    tests/              Backend workflow tests
    migrations/         Initial schema documentation and SQL export
    init_db.py
    provision.py        Create a non-demo linked account pair
    requirements.txt
  docs/                 Verification and demo notes
  .env.example
  Dockerfile
  compose.yaml
  start-windows.bat
  start-local.sh
  README.md
```

## Implemented workflows

- JWT login, hashed passwords, protected APIs, role-specific navigation and linked-patient authorization. Uploaded family photos require the same authorization.
- Patient home with history-based activity recommendation, live routine totals, medicine reminders, progress and streaks.
- Caregiver CRUD for routine tasks, medication schedules and family members; validated JPEG/PNG/WebP uploads up to 5 MB, re-encoded to strip metadata.
- Daily, weekday and today-only recurrence. Separate dated routine/medication occurrences preserve past adherence instead of resetting one shared status.
- Patient completion, medication confirmation and one snooze per occurrence. Past missed-reminder alerts remain available for caregiver acknowledgement even if the medicine is later confirmed.
- Background medicine deadlines, persisted critical alerts, deduplication and caregiver polling every five seconds. Processing continues while the Python server runs, even when the patient page is closed.
- Configurable 30-second presentation reminder. Normal medication schedules retain their own minute-based grace period; the explicit demo reminder is the accelerated path.
- Memory Match: 6/12/16 cards, flips, matching, moves, pause, restart, optional spoken feedback and persisted results.
- Object Recall: timed preview, choices, five rounds and persisted accuracy.
- Sequence Recall: three/four/five objects, timed preview, ordered response and persisted accuracy.
- Family Recall: weighted selection from actual family records, names/photos, choices, hints, spoken names and optional microphone answers. Per-person attempts inform future repetition.
- Rule-based adaptation: three consistent sessions at 85%+ and within the response threshold increase the challenge; low accuracy or many hints reduce it. This is transparent personalization, not a trained AI model.
- Voice assistant with text fallback for medicines, tasks, routines, game navigation, progress and named family queries. Responses read from the current patient snapshot, including cached data offline. A corresponding REST helper is also available.
- English, Hindi and Assamese patient interface controls; saved text scale, speech feedback, notification and reduced-motion settings. Caregiver tools and user-entered records retain their original language.
- Patient charts, caregiver accuracy/response-time/difficulty/adherence trends, family statistics, recent activity and CSV report export, all derived from stored records.
- Installable PWA, cached app shell, private per-account IndexedDB snapshots/photos, queued routine/medicine/game actions and sync on reconnect. Game sessions use event IDs to prevent duplicate replay. Sign-out waits for queued actions to sync, then clears cached private records.
- Loading, empty, error and feedback states; labelled controls, keyboard focus, mobile bottom navigation and responsive caregiver navigation.

## Development in VS Code

Open the extracted `recallx` folder. Use two terminals.

Backend:

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
python -m pip install -r backend/requirements.txt
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend (Node.js 22 LTS recommended):

```bash
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173. After editing the UI, run `npm run build` from `frontend`, then restart FastAPI to serve the updated compiled version at http://localhost:8000.

## Environment variables

Copy `.env.example` to `.env` in the project root only if changing defaults. Backend loads it automatically. Do not put secrets in frontend environment variables.

| Variable | Default | Meaning |
| --- | --- | --- |
| `FRONTEND_URL` | http://localhost:5173 | Allowed frontend origin |
| `BACKEND_URL` | http://localhost:8000 | Documented local backend URL |
| `JWT_SECRET` | Generated locally | Stable random secret stored in backend/data/.jwt_secret when unspecified |
| `DATABASE_URL` | SQLite in backend/data | SQLAlchemy connection URL; leave commented for local default |
| `DEMO_MODE` | true | Enables sample seeding, demo login and accelerated reminder endpoint |
| `DEMO_GRACE_SECONDS` | 30 | Grace window for the explicit demo reminder |
| `APP_TIMEZONE` | Asia/Kolkata | Daily occurrence and schedule timezone |
| `LLM_API_KEY` | unused | Reserved for a future adapter; no external LLM calls are implemented |
| `VITE_API_URL` | /api | Frontend API base, configured in frontend/.env |

Python on Windows may need timezone data; `tzdata` is included in requirements. For PostgreSQL, use a `postgresql+psycopg://...` URL. The schema uses SQLAlchemy portable types. PostgreSQL execution has not been validated in this environment.

## Database and migrations

`python init_db.py` in `backend` creates the initial schema and demo seed (when enabled); normal server startup does the same idempotently. `backend/migrations/001_initial.sql` is an inspectable SQLite schema export. On a fresh database, use either initialization path, not both. SQLAlchemy metadata is the portable schema source.

This first version has no upgrade migrations because no earlier RecallX schema exists. Future schema changes must use a versioned migration; `create_all` will not alter existing columns.

Records, uploads and the generated signing secret live in `backend/data/`. This directory is not included in the ZIP. Back it up while the server is stopped. Do not delete it to troubleshoot ordinary issues. To create accounts with demo mode disabled, run `python provision.py` and enter the new patient/caregiver credentials locally.

## API documentation

FastAPI Swagger: http://localhost:8000/docs. OpenAPI JSON: http://localhost:8000/openapi.json.

Key routes: `/api/auth/login`, `/api/auth/demo/{role}`, `/api/auth/me`, `/api/patients/{id}/snapshot`, `/api/patients/{id}/routine`, `/api/patients/{id}/medications`, `/api/patients/{id}/family`, `/api/patients/{id}/games/sessions`, `/api/patients/{id}/progress`, `/api/patients/{id}/voice`, `/api/settings`. The Swagger UI documents item edit/delete/status/photo and alert acknowledgement endpoints.

## Offline and PWA

Use the compiled app at localhost:8000 for PWA testing; service-worker registration is intentionally disabled in Vite development mode. Visit online, sign in, let the patient data load and reload once so the service worker controls the page. Disconnect the browser network. The app shell, games and last patient snapshot remain available. Completions queue locally and replay when connectivity returns. Never sign out or clear site data before pending activity has synced.

Offline medicine confirmations may arrive after the server already created a missed reminder. The alert intentionally remains until the caregiver reviews it. Clinical records are not silently erased by late sync.

Notifications need explicit browser permission and are sent while a supported page is open. This version does not include closed-browser push, SMS or background mobile alarms. Speech recognition availability depends on browser, device and language; some implementations require internet. Text input always remains available.

## Demo walkthrough

1. Enter Patient Demo and show home/routine/progress.
2. Open Memory Match, finish all pairs, then inspect the saved result.
3. Open Family Recall. Use the name choices or voice input; show a hint.
4. Ask the voice assistant “What is my next medicine?” or “Who is Rahul?”
5. Open Medicines and press “Start 30-second demo reminder.” Leave it unconfirmed.
6. In a separate browser profile, enter Caregiver Demo. Within about 35 seconds, a critical alert appears. Acknowledge it.
7. Add a routine task and a family photo. The patient sees the changes on the next poll.
8. Review caregiver charts and download the weekly CSV.
9. Optionally demonstrate offline routine/game completion and sync.

## Tests

```bash
cd backend
python -m pytest -q
cd ../frontend
npm test
npm run build
```

See `docs/TESTING.md` for actual verification results and remaining limitations. The browser preview was blocked by this execution environment; do not interpret successful API/component tests as completed visual or real-device browser QA.

## Container deployment

`docker compose up --build` serves the application at localhost:8000 with a persistent Docker volume. The Docker image also supports a single Linux hosting instance with persistent disk, HTTPS termination and `FRONTEND_URL` set to the actual origin. Use a strong `JWT_SECRET`, disable demo mode, provision real accounts and add operational backups before moving beyond a presentation deployment. Container execution itself was not available for validation here.

Run one API process with the bundled reminder worker. Multiple processes require a coordinated external scheduler/queue and transactional occurrence creation. Closed-browser push, multi-worker scheduling, real account invitation/recovery, an optional LLM adapter, clinician review and comprehensive device/translation QA are future improvements. The current prototype is not a production clinical system.
